import { HttpException, HttpStatus, Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { EventIdInfoDto } from './dto/event-id-info.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { NotificationsService } from 'src/notifications/notifications.service';
const { getFirestore, Timestamp, FieldValue } = require('firebase-admin/firestore');
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Event } from './schemas/event.schema';
import { Model } from 'mongoose';
import { CreateEventDto } from './dto/create.event.dto';

enum EventType {
  NUESTRA_BODA = 'nuestraboda',
  MIS_XV = 'misxv',
  MI_BAUTIZO = 'mibautizo',
  MI_GRADUACION = 'migraduacion',
}

interface EventInterface {
  id: string;
  eventType: EventType;
  invitations: Invitation[];
  // settings: EventSettings;
}

interface Invitation {
  id: string;
  name: string;
  shortName: string;
  hasConfirmedAttendance: boolean;
  invitedBy?: string;
  hasAttendanceBeenNotified?: boolean;
  hasUnAttendanceBeenNotified?: boolean;
}

interface EventSettings {
  venue: string;
  date: Date;
  isPaid: boolean;
}

@Injectable()
export class EventService implements OnApplicationBootstrap {
  constructor(
    @InjectModel(Event.name) private eventModel: Model<Event>,
    private notificationsService: NotificationsService
  ) { }

  activeWeddingEvents: EventInterface[] = [];
  activeWeddingEventsIds: string[] = [];
  activeXVEvents: EventInterface[] = [];
  activeXVEventsIds: string[] = [];
  activeWeddingsEventsListener: Function;
  specificWeddingEventListeners: Function[] = [];
  activeXVEventsListener: Function;
  specificXVEventListeners: Function[] = [];

  async create(createCatDto: CreateEventDto): Promise<Event> {
    const obj: Object = {
      ...createCatDto,
      createdAt: new Date(),
    };
 
    const createdEvent = new this.eventModel(obj);
    return createdEvent.save();
  }

  async findAll(): Promise<Event[]> {
    return this.eventModel.find().exec();
  }

  onApplicationBootstrap() {
    try {
      // this.listenWeddingActiveEvents();
      // this.listenXVActiveEvents();
    } catch (error) {
      console.error(error);
    }
  }

  // @Cron(CronExpression.EVERY_HOUR)
  async handleCron() {
    const db = getFirestore();
    const now = new Date();

    console.log(`Reminders cron job running at ${now}`);
    for (const event of this.activeWeddingEvents) {
      const eventSettingsRef = db.collection(event.eventType).doc(event.id);
      const eventSettingsDoc = await eventSettingsRef.get();

      console.log(`Event: ${event.id}`);
      if (eventSettingsDoc.exists) {
        const { ceremonyDate, partyDate } = eventSettingsDoc.data();
        const eventDate: Date = ceremonyDate ? ceremonyDate.toDate() : partyDate.toDate();

        const timeDiff = eventDate.getTime() - now.getTime();
        const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

        if ([8, 1].includes(daysDiff) || [6, 1].includes(Math.ceil(timeDiff / (1000 * 3600)))) {
          const topic = `${event.eventType}-${event.id}-attendants`;
          const title = `Recordatorio de ${event.eventType}`;
          const body = `El evento se celebrará el ${eventDate.toLocaleString()}. ¡No faltes!.`;

          const dbEventNotificationControlRef = db.collection(event.eventType).doc('notifications-control').collection(event.id).doc('control-list');
          const dbEventNotificationControlDoc = await dbEventNotificationControlRef.get();
          const dbEventNotificationControl = dbEventNotificationControlDoc.data();

          const eightDayReminderSent = dbEventNotificationControl.eightDayReminderSent || false;
          const oneDayReminderSent = dbEventNotificationControl.oneDayReminderSent || false;
          const sixHourReminderSent = dbEventNotificationControl.sixHourReminderSent || false;
          const oneHourReminderSent = dbEventNotificationControl.oneHourReminderSent || false;

          let shouldSendReminder = false;
          let message = ''

          if (daysDiff === 8 && !eightDayReminderSent) {
            await dbEventNotificationControlRef.update({ eightDayReminderSent: true });
            shouldSendReminder = true;
            message = '¡Faltan 8 días para el evento! Prepara tu mejor atuendo. 👗🤵🏻‍♂️'
          } else if (daysDiff === 1 && !oneDayReminderSent) {
            await dbEventNotificationControlRef.update({ oneDayReminderSent: true });
            shouldSendReminder = true;
            message = '¡Mañana es el evento! No te lo puedes perder. Te esperamos con gusto';
          } else if (Math.ceil(timeDiff / (1000 * 3600)) === 6 && !sixHourReminderSent) {
            const eventHour = eventDate.getHours();
            if (eventHour < 13) {
              console.log(`Skipping reminder for event: ${event.id} as it would be sent before 7am`);
              continue;
            }
            await dbEventNotificationControlRef.update({ sixHourReminderSent: true });
            shouldSendReminder = true;
            message = 'En unas horas comienza el evento. ¡No llegues tarde!';
          } else if (Math.ceil(timeDiff / (1000 * 3600)) === 1 && !oneHourReminderSent) {
            await dbEventNotificationControlRef.update({ oneHourReminderSent: true });
            shouldSendReminder = true;
            message = 'Hoy será un día espectacular. ¡Qué emoción!';
          }

          if (shouldSendReminder) {
            console.log(`Sending reminder for event: ${event.id}`);
            await this.notificationsService.sendPushToTopic(topic, title, message);
          }
        }
      }
    }
  }

  // @Cron(CronExpression.EVERY_DAY_AT_6PM)
  async handleActivateVIPPlanNotificationsCRON() {
    const db = getFirestore();
    const now = new Date();

    const vipMessages = [
      '¡Activa tu plan VIP para recibir videos de tus invitados!',
      '¡No te pierdas los mensajes de tus seres queridos! Actualiza a VIP',
      '¡Guarda los recuerdos de tu día especial! Obtén el plan VIP',
      'Captura momentos únicos con los mensajes de video. ¡Actualiza a VIP!'
    ];

    console.log(`Activate VIP Plan Notifications CRON running at ${now}`);
    for (const event of this.activeWeddingEvents) {
      const eventSettingsRef = db.collection(event.eventType).doc(event.id);
      const eventSettingsDoc = await eventSettingsRef.get();

      if (eventSettingsDoc.exists) {
        const { wantsToLeaveAMessage, mode, notificationActivateVIPPlan } = eventSettingsDoc.data();

        if (notificationActivateVIPPlan <= 2 && wantsToLeaveAMessage > 0 && mode != 'vip') {
          const topic = `${event.eventType}-${event.id}-organizers`;
          const title = `Atesora tus recuerdos`;
          const randomIndex = Math.floor(Math.random() * vipMessages.length);
          const body = vipMessages[randomIndex];
          const payload = {
            url: 'https://ig.me/m/feest.invitaciones'
          };

          console.log(`Sending message recording reminder for event: ${event.id}`);
          await this.notificationsService.sendPushToTopic(topic, title, body, payload);

          await eventSettingsRef.update({ notificationActivateVIPPlan: FieldValue.increment(1) });
        }
      }
    }
  }

  async listenWeddingActiveEvents() {
    try {
      const db = getFirestore();
      const doc = db.collection(EventType.NUESTRA_BODA).doc('admon').collection('control-lists').doc('events');

      this.activeXVEventsListener = await doc.onSnapshot(async (docSnapshot: FirebaseFirestore.DocumentSnapshot) => {
        //* Disposing all the specific events listeners if exist.
        this.disposeSpecificWeddingsEventsListeners();

        console.log(`Received weddings doc snapshot: ${JSON.stringify(docSnapshot.data())}`);

        //* Filtering only the active events. ('Active' means the service is paid, and the ceremony and party dates are NOT due)
        const { active } = docSnapshot.data();
        this.activeWeddingEventsIds = active;

        //!
        //! Creating specific events listeners
        //!

        for (const eventId of this.activeWeddingEventsIds) {
          const query = db.collection(EventType.NUESTRA_BODA).doc(eventId).collection('invitations');

          const observer = query.onSnapshot(async (querySnapshot: FirebaseFirestore.QuerySnapshot) => {
            //? Checking if event already exists in runtime registry in order to compare with the arriving changes.
            console.log(`Active Events: ${JSON.stringify(this.activeWeddingEvents)}`);
            let eventIndex: number = this.activeWeddingEvents.findIndex((item: EventInterface) => item.id == eventId);

            if (eventIndex == -1) {
              //? If event DOES NOT exist
              const dbEventNotificationControl = await db.collection(EventType.NUESTRA_BODA).doc('notifications-control').collection(eventId).doc('control-list').get();

              let event: EventInterface = {
                id: eventId,
                eventType: EventType.NUESTRA_BODA,
                invitations: []
              };

              if (dbEventNotificationControl.exists) {
                const { list } = dbEventNotificationControl.data();
                const invitations: Invitation[] = list != undefined ? list.map((item) => item as Invitation) : [];
                event.invitations = invitations;
              }

              this.activeWeddingEvents.push(event);
            }

            querySnapshot.docChanges().forEach(async (change) => {
              eventIndex = this.activeWeddingEvents.findIndex((item) => item.id == eventId);
              let event: EventInterface = this.activeWeddingEvents.find((item) => item.id == eventId);

              let { invitations } = event;
              let invitationsToAdd: Invitation[] = [];
              let invitationsToNotify: Invitation[] = [];

              //? Getting invitation / user properties.
              let { id, hasConfirmedAttendance, name, familySurnames, shortName, companion, invitedBy } = change.doc.data();

              const hostFamilySurnames: string = familySurnames;

              const newInvitation: Invitation = {
                id,
                hasConfirmedAttendance,
                name,
                shortName,
                invitedBy,
              };

              if (change.type === 'added') {

                //TODO: Get the backup invitation instance and update the hasAttendanceBeenNotified
                const invitationExistsInRuntime: boolean = invitations.some((inv: Invitation) => inv.id == newInvitation.id);

                if (!invitationExistsInRuntime) {
                  //? Adding main invitator to the invitations to assign to the event
                  invitationsToAdd.push(newInvitation);
                }

                //? Should we notify?
                if (hasConfirmedAttendance) {
                  if (!invitationExistsInRuntime) {
                    invitationsToNotify.push(newInvitation);
                  } else {
                    const existingInvitation: Invitation = invitations.find((inv: Invitation) => inv.id == newInvitation.id);
                    if (!existingInvitation.hasAttendanceBeenNotified) {
                      invitationsToNotify.push(newInvitation);
                    }
                  }
                }

                //? Adding companion to the invitations to assign to the event
                for (const person of companion) {
                  const { id, hasConfirmedAttendance, name, invitedBy, shortName } = person;

                  const invitation: Invitation = {
                    id,
                    hasConfirmedAttendance,
                    name,
                    shortName,
                    invitedBy
                  };

                  const invitationExistsInRuntime: boolean = invitations.some((inv: Invitation) => inv.id == invitation.id);

                  if (!invitationExistsInRuntime) {
                    //? Adding main invitator to the invitations to assign to the event
                    invitationsToAdd.push(invitation);
                  }

                  //? Should we notify?
                  if (hasConfirmedAttendance) {
                    if (!invitationExistsInRuntime) {
                      invitationsToNotify.push(invitation);
                    } else {
                      const existingInvitation: Invitation = invitations.find((inv: Invitation) => inv.id == invitation.id);
                      if (!existingInvitation.hasAttendanceBeenNotified) {
                        invitationsToNotify.push(invitation);
                      }
                    }
                  }
                }

                console.log(JSON.stringify(invitationsToAdd));

                this.activeWeddingEvents[eventIndex].invitations.push(...invitationsToAdd);
              }

              if (change.type == 'modified') {
                // console.log('Modified invitation: ', change.doc.data());
                const invitationExistsInRuntime: boolean = invitations.some((inv: Invitation) => inv.id == newInvitation.id);

                if (invitationExistsInRuntime) {
                  //? Let's look for the invitation
                  const index: number = invitations.findIndex((invitation: Invitation) => invitation.id == newInvitation.id);

                  //? If invitation is found, we update it.
                  const prevInvitation: Invitation = invitations.at(index);

                  if (
                    !prevInvitation.hasConfirmedAttendance &&
                    newInvitation.hasConfirmedAttendance &&
                    !prevInvitation.hasAttendanceBeenNotified
                  ) {
                    invitationsToNotify.push(newInvitation)
                  };

                  this.activeWeddingEvents[eventIndex].invitations[index] = newInvitation;

                  for (const person of companion) {
                    const { id, hasConfirmedAttendance, name, invitedBy, shortName } = person;

                    const invitation: Invitation = {
                      id,
                      hasConfirmedAttendance,
                      name,
                      shortName,
                      invitedBy,
                    };

                    const invitationExistsInRuntime: boolean = invitations.some((inv: Invitation) => inv.id == invitation.id);

                    if (!invitationExistsInRuntime) {
                      //? Adding main invitator to the invitations to assign to the event
                      invitationsToAdd.push(invitation);

                      //? Should we notify?
                      if (hasConfirmedAttendance) {
                        invitationsToNotify.push(invitation);
                      }

                    } else {
                      //? Let's look for the invitation
                      const index: number = invitations.findIndex((inv: Invitation) => inv.id == invitation.id);

                      //? If invitation is found, we update it.
                      const prevInvitation: Invitation = invitations.at(index);

                      if (
                        !prevInvitation.hasConfirmedAttendance &&
                        invitation.hasConfirmedAttendance &&
                        !prevInvitation.hasAttendanceBeenNotified
                      ) {
                        invitationsToNotify.push(invitation)
                      };

                      this.activeWeddingEvents[eventIndex].invitations[index] = invitation;
                    }
                  }

                } else {
                  //? If the invitation was not in our runtime registry, we add it.

                  //? Adding main invitator to the invitations to assign to the event
                  invitationsToAdd.push(newInvitation);

                  //? Should we notify?
                  if (hasConfirmedAttendance) {
                    invitationsToNotify.push(newInvitation);
                  }

                  //? Adding companion to the invitations to assign to the event
                  for (const person of companion) {
                    const { id, hasConfirmedAttendance, name, invitedBy, shortName } = person;

                    const invitation: Invitation = {
                      id,
                      hasConfirmedAttendance,
                      name,
                      shortName,
                      invitedBy
                    };

                    const invitationExistsInRuntime: boolean = invitations.some((inv) => inv.id == invitation.id);

                    if (!invitationExistsInRuntime) {
                      //? Adding main invitator to the invitations to assign to the event
                      invitationsToAdd.push(invitation);
                    }

                    //? Should we notify?
                    if (hasConfirmedAttendance) {
                      if (!invitationExistsInRuntime) {
                        invitationsToNotify.push(invitation);
                      } else {
                        const existingInvitation: Invitation = invitations.find((inv: Invitation) => inv.id == invitation.id);
                        if (!existingInvitation.hasAttendanceBeenNotified) {
                          invitationsToNotify.push(invitation);
                        }
                      }
                    }
                  }
                }

                this.activeWeddingEvents[eventIndex].invitations.push(...invitationsToAdd);
              }

              //? Checking if we should notify.
              if (invitationsToNotify.length) {
                console.log("Sending notification");
                const topic = `${EventType.NUESTRA_BODA}-${eventId}-organizers`;
                let title = invitationsToNotify.length > 1 ? 'Nuevos invitados' : 'Nuevo invitado';
                if (familySurnames) {
                  title = `${title} - Fam. ${familySurnames}`;
                }
                const body = invitationsToNotify.map((invitation) => invitation.shortName).join(', ');

                console.log(`Topic: ${topic}, Title: ${title}, Body: ${body}`);

                await this.notificationsService.sendPushToTopic(topic, title, body);

                let { invitations } = event;

                for (let invitation of invitationsToNotify) {
                  //? Let's look for the invitation
                  const index: number = invitations.findIndex((inv) => inv.id == invitation.id);
                  invitation.hasAttendanceBeenNotified = true;
                  this.activeWeddingEvents[eventIndex].invitations[index] = invitation;
                }

                //! To send notifications by Token instead of topic.
                // const eventSettings = await db.collection(EventType.NUESTRA_BODA).doc(eventId).get();
                // if (!eventSettings.exists) {
                //   console.error(`EventInterface: ${eventId} not found. Trying to retrieve organizers notification tokens.`);
                // } else {
                //   const { organizerContacts } = eventSettings.data();
                //   for (const organizer of organizerContacts) {
                //     const { phone } = organizer;
                //     console.log(phone);
                //   }
                // }
              }

              invitationsToNotify = [];
              invitationsToAdd = [];

              //TODO:
              /*Implement a cron job to update it based on last modification date and last update backup date. 
              if last modification date is greater by 5 minutes than last update backup date, then update the backup.
              */
              //? Updating dbEventBackup
              const eventInvitationsArray = [];
              for (const invitation of this.activeWeddingEvents[eventIndex].invitations) {
                eventInvitationsArray.push({
                  id: invitation.id,
                  hasConfirmedAttendance: invitation.hasConfirmedAttendance ?? false,
                  name: invitation.name,
                  shortName: invitation.shortName,
                  invitedBy: invitation.invitedBy,
                  hasAttendanceBeenNotified: invitation.hasAttendanceBeenNotified ?? false,
                  hasUnAttendanceBeenNotified: invitation.hasUnAttendanceBeenNotified ?? false
                });
              }

              await db.collection(EventType.NUESTRA_BODA).doc('notifications-control').collection(eventId).doc('control-list').update({
                list: eventInvitationsArray
              })
                .then(() => {
                  console.log("Backup updated");
                })
                .catch((error) => {
                  console.error(error);
                });
            });
          });

          this.specificWeddingEventListeners.push(observer);
        }
        // ...
      }, (err: Error) => {
        console.log(`Encountered error: ${err}`);
      });
    } catch (error) {
      console.error(error);
    }
  }

  async listenXVActiveEvents() {
    try {
      const db = getFirestore();
      const doc = db.collection(EventType.MIS_XV).doc('admon').collection('control-lists').doc('events');

      this.activeWeddingsEventsListener = await doc.onSnapshot(async (docSnapshot: FirebaseFirestore.DocumentSnapshot) => {
        //* Disposing all the specific events listeners if exist.
        this.disposeSpecificXVEventsListeners();

        console.log(`Received XV doc snapshot: ${JSON.stringify(docSnapshot.data())}`);

        //* Filtering only the active events. ('Active' means the service is paid, and the ceremony and party dates are NOT due)
        const { active } = docSnapshot.data();
        this.activeXVEventsIds = active;

        //!
        //! Creating specific events listeners
        //!

        for (const eventId of this.activeXVEventsIds) {
          const query = db.collection(EventType.MIS_XV).doc(eventId).collection('invitations');

          const observer = query.onSnapshot(async (querySnapshot: FirebaseFirestore.QuerySnapshot) => {
            //? Checking if event already exists in runtime registry in order to compare with the arriving changes.
            console.log(`Active Events: ${JSON.stringify(this.activeXVEvents)}`);
            let eventIndex: number = this.activeXVEvents.findIndex((item: EventInterface) => item.id == eventId);

            if (eventIndex == -1) {
              //? If event DOES NOT exist
              const dbEventNotificationControl = await db.collection(EventType.MIS_XV).doc('notifications-control').collection(eventId).doc('control-list').get();

              let event: EventInterface = {
                id: eventId,
                eventType: EventType.MIS_XV,
                invitations: []
              };

              if (dbEventNotificationControl.exists) {
                const { list } = dbEventNotificationControl.data();
                const invitations: Invitation[] = list != undefined ? list.map((item) => item as Invitation) : [];
                event.invitations = invitations;
              }

              this.activeXVEvents.push(event);
            }

            querySnapshot.docChanges().forEach(async (change) => {
              eventIndex = this.activeXVEvents.findIndex((item) => item.id == eventId);
              let event: EventInterface = this.activeXVEvents.find((item) => item.id == eventId);

              let { invitations } = event;
              let invitationsToAdd: Invitation[] = [];
              let invitationsToNotify: Invitation[] = [];

              //? Getting invitation / user properties.
              let { id, hasConfirmedAttendance, name, familySurnames, shortName, companion, invitedBy } = change.doc.data();

              const hostFamilySurnames: string = familySurnames;

              const newInvitation: Invitation = {
                id,
                hasConfirmedAttendance,
                name,
                shortName,
                invitedBy,
              };

              if (change.type === 'added') {

                //TODO: Get the backup invitation instance and update the hasAttendanceBeenNotified
                const invitationExistsInRuntime: boolean = invitations.some((inv: Invitation) => inv.id == newInvitation.id);

                if (!invitationExistsInRuntime) {
                  //? Adding main invitator to the invitations to assign to the event
                  invitationsToAdd.push(newInvitation);
                }

                //? Should we notify?
                if (hasConfirmedAttendance) {
                  if (!invitationExistsInRuntime) {
                    invitationsToNotify.push(newInvitation);
                  } else {
                    const existingInvitation: Invitation = invitations.find((inv: Invitation) => inv.id == newInvitation.id);
                    if (!existingInvitation.hasAttendanceBeenNotified) {
                      invitationsToNotify.push(newInvitation);
                    }
                  }
                }

                //? Adding companion to the invitations to assign to the event
                for (const person of companion) {
                  const { id, hasConfirmedAttendance, name, invitedBy, shortName } = person;

                  const invitation: Invitation = {
                    id,
                    hasConfirmedAttendance,
                    name,
                    shortName,
                    invitedBy
                  };

                  const invitationExistsInRuntime: boolean = invitations.some((inv: Invitation) => inv.id == invitation.id);

                  if (!invitationExistsInRuntime) {
                    //? Adding main invitator to the invitations to assign to the event
                    invitationsToAdd.push(invitation);
                  }

                  //? Should we notify?
                  if (hasConfirmedAttendance) {
                    if (!invitationExistsInRuntime) {
                      invitationsToNotify.push(invitation);
                    } else {
                      const existingInvitation: Invitation = invitations.find((inv: Invitation) => inv.id == invitation.id);
                      if (!existingInvitation.hasAttendanceBeenNotified) {
                        invitationsToNotify.push(invitation);
                      }
                    }
                  }
                }

                console.log(JSON.stringify(invitationsToAdd));

                this.activeXVEvents[eventIndex].invitations.push(...invitationsToAdd);
              }

              if (change.type == 'modified') {
                // console.log('Modified invitation: ', change.doc.data());
                const invitationExistsInRuntime: boolean = invitations.some((inv: Invitation) => inv.id == newInvitation.id);

                if (invitationExistsInRuntime) {
                  //? Let's look for the invitation
                  const index: number = invitations.findIndex((invitation: Invitation) => invitation.id == newInvitation.id);

                  //? If invitation is found, we update it.
                  const prevInvitation: Invitation = invitations.at(index);

                  if (
                    !prevInvitation.hasConfirmedAttendance &&
                    newInvitation.hasConfirmedAttendance &&
                    !prevInvitation.hasAttendanceBeenNotified
                  ) {
                    invitationsToNotify.push(newInvitation)
                  };

                  this.activeXVEvents[eventIndex].invitations[index] = newInvitation;

                  for (const person of companion) {
                    const { id, hasConfirmedAttendance, name, invitedBy, shortName } = person;

                    const invitation: Invitation = {
                      id,
                      hasConfirmedAttendance,
                      name,
                      shortName,
                      invitedBy,
                    };

                    const invitationExistsInRuntime: boolean = invitations.some((inv: Invitation) => inv.id == invitation.id);

                    if (!invitationExistsInRuntime) {
                      //? Adding main invitator to the invitations to assign to the event
                      invitationsToAdd.push(invitation);

                      //? Should we notify?
                      if (hasConfirmedAttendance) {
                        invitationsToNotify.push(invitation);
                      }

                    } else {
                      //? Let's look for the invitation
                      const index: number = invitations.findIndex((inv: Invitation) => inv.id == invitation.id);

                      //? If invitation is found, we update it.
                      const prevInvitation: Invitation = invitations.at(index);

                      if (
                        !prevInvitation.hasConfirmedAttendance &&
                        invitation.hasConfirmedAttendance &&
                        !prevInvitation.hasAttendanceBeenNotified
                      ) {
                        invitationsToNotify.push(invitation)
                      };

                      this.activeXVEvents[eventIndex].invitations[index] = invitation;
                    }
                  }

                } else {
                  //? If the invitation was not in our runtime registry, we add it.

                  //? Adding main invitator to the invitations to assign to the event
                  invitationsToAdd.push(newInvitation);

                  //? Should we notify?
                  if (hasConfirmedAttendance) {
                    invitationsToNotify.push(newInvitation);
                  }

                  //? Adding companion to the invitations to assign to the event
                  for (const person of companion) {
                    const { id, hasConfirmedAttendance, name, invitedBy, shortName } = person;

                    const invitation: Invitation = {
                      id,
                      hasConfirmedAttendance,
                      name,
                      shortName,
                      invitedBy
                    };

                    const invitationExistsInRuntime: boolean = invitations.some((inv) => inv.id == invitation.id);

                    if (!invitationExistsInRuntime) {
                      //? Adding main invitator to the invitations to assign to the event
                      invitationsToAdd.push(invitation);
                    }

                    //? Should we notify?
                    if (hasConfirmedAttendance) {
                      if (!invitationExistsInRuntime) {
                        invitationsToNotify.push(invitation);
                      } else {
                        const existingInvitation: Invitation = invitations.find((inv: Invitation) => inv.id == invitation.id);
                        if (!existingInvitation.hasAttendanceBeenNotified) {
                          invitationsToNotify.push(invitation);
                        }
                      }
                    }
                  }
                }

                this.activeXVEvents[eventIndex].invitations.push(...invitationsToAdd);
              }

              //? Checking if we should notify.
              if (invitationsToNotify.length) {
                console.log("Sending notification");
                const topic = `${EventType.MIS_XV}-${eventId}-organizers`;
                let title = invitationsToNotify.length > 1 ? 'Nuevos invitados' : 'Nuevo invitado';
                if (familySurnames) {
                  title = `${title} - Fam. ${familySurnames}`;
                }
                const body = invitationsToNotify.map((invitation) => invitation.shortName).join(', ');

                console.log(`Topic: ${topic}, Title: ${title}, Body: ${body}`);

                await this.notificationsService.sendPushToTopic(topic, title, body);

                let { invitations } = event;

                for (let invitation of invitationsToNotify) {
                  //? Let's look for the invitation
                  const index: number = invitations.findIndex((inv) => inv.id == invitation.id);
                  invitation.hasAttendanceBeenNotified = true;
                  this.activeXVEvents[eventIndex].invitations[index] = invitation;
                }

                //! To send notifications by Token instead of topic.
                // const eventSettings = await db.collection(EventType.MIS_XV).doc(eventId).get();
                // if (!eventSettings.exists) {
                //   console.error(`EventInterface: ${eventId} not found. Trying to retrieve organizers notification tokens.`);
                // } else {
                //   const { organizerContacts } = eventSettings.data();
                //   for (const organizer of organizerContacts) {
                //     const { phone } = organizer;
                //     console.log(phone);
                //   }
                // }
              }

              invitationsToNotify = [];
              invitationsToAdd = [];

              //TODO:
              /*Implement a cron job to update it based on last modification date and last update backup date. 
              if last modification date is greater by 5 minutes than last update backup date, then update the backup.
              */
              //? Updating dbEventBackup
              const eventInvitationsArray = [];
              for (const invitation of this.activeXVEvents[eventIndex].invitations) {
                eventInvitationsArray.push({
                  id: invitation.id,
                  hasConfirmedAttendance: invitation.hasConfirmedAttendance ?? false,
                  name: invitation.name,
                  shortName: invitation.shortName,
                  invitedBy: invitation.invitedBy,
                  hasAttendanceBeenNotified: invitation.hasAttendanceBeenNotified ?? false,
                  hasUnAttendanceBeenNotified: invitation.hasUnAttendanceBeenNotified ?? false
                });
              }

              await db.collection(EventType.MIS_XV).doc('notifications-control').collection(eventId).doc('control-list').update({
                list: eventInvitationsArray
              })
                .then(() => {
                  console.log("Backup updated");
                })
                .catch((error) => {
                  console.error(error);
                });
            });
          });

          this.specificXVEventListeners.push(observer);
        }
        // ...
      }, (err: Error) => {
        console.log(`Encountered error: ${err}`);
      });
    } catch (error) {
      console.error(error);
    }
  }

  async getEventInvitations(EventIdInfo: EventIdInfoDto) {
    try {
      const db = getFirestore();
      const docRef = db.collection(EventIdInfo.productId).doc('admon').collection('control-lists').doc('events');
      const doc = await docRef.get();
      if (!doc.exists) {
        console.log('No such document!');
      } else {
        console.log('Document data:', doc.data());
        const keys = Object.keys(doc.data());
        let payload = {};
        return true;
      }
    } catch (error) {
      throw new HttpException(error, HttpStatus.CONFLICT);
    }
  }

  onModuleDestroy() {
    try {
      this.disposeActiveWeddingsEventsListener();
      this.disposeActiveXVEventsListener();
    } catch (error) {
      console.error(error);

    }
  }

  private disposeActiveWeddingsEventsListener() {
    if (this.activeWeddingsEventsListener) {
      this.activeWeddingsEventsListener();
      this.activeWeddingsEventsListener = null;

      this.disposeSpecificWeddingsEventsListeners();
    }
  }

  private disposeActiveXVEventsListener() {
    if (this.activeXVEventsListener) {
      this.activeXVEventsListener();
      this.activeXVEventsListener = null;

      this.disposeSpecificXVEventsListeners();
    }
  }

  private disposeSpecificWeddingsEventsListeners() {
    const areSpecificEventsToDispose: boolean = this.specificWeddingEventListeners.length > 0;

    for (let event of this.specificWeddingEventListeners) {
      event();
      event = null;
    }

    this.specificWeddingEventListeners = [];

    if (areSpecificEventsToDispose) console.log("Specific Weddings Events Listeners Disposed");
  }

  private disposeSpecificXVEventsListeners() {
    const areSpecificEventsToDispose: boolean = this.specificXVEventListeners.length > 0;

    for (let event of this.specificXVEventListeners) {
      event();
      event = null;
    }

    this.specificXVEventListeners = [];

    if (areSpecificEventsToDispose) console.log("Specific XV Events Listeners Disposed");
  }
}