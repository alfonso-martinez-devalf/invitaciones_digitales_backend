import { HttpException, HttpStatus, Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { EventIdInfoDto } from './dto/event-id-info.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { NotificationsService } from 'src/notifications/notifications.service';
const { getFirestore, Timestamp, FieldValue } = require('firebase-admin/firestore');
import { Cron, CronExpression } from '@nestjs/schedule';

enum EventType {
  NUESTRA_BODA = 'nuestraboda',
  MIS_XV = 'misxv',
  MI_BAUTIZO = 'mibautizo',
  MI_GRADUACION = 'migraduacion',
}

interface Event {
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
  constructor(private notificationsService: NotificationsService) { }

  activeEvents: Event[] = [];
  activeEventsIds: string[] = [];
  activeEventsListener: Function;
  specificEventListeners: Function[] = [];

  onApplicationBootstrap() {
    try {
      this.listenWeddingActiveEvents();
    } catch (error) {
      console.error(error);
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async handleCron() {
    const db = getFirestore();
    const now = new Date();

    console.log(`Reminders cron job running at ${now}`);
    for (const event of this.activeEvents) {
      const eventSettingsRef = db.collection(event.eventType).doc(event.id);
      const eventSettingsDoc = await eventSettingsRef.get();

      console.log(`Event: ${event.id}`);
      if (eventSettingsDoc.exists) {
        const { ceremonyDate, partyDate } = eventSettingsDoc.data();
        const eventDate: Date = ceremonyDate ? ceremonyDate.toDate() : partyDate.toDate();

        const timeDiff = eventDate.getTime() - now.getTime();
        const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

        if ([8, 1].includes(daysDiff) || [6, 1].includes(Math.ceil(timeDiff / (1000 * 3600)))) {
          const topic = `${event.eventType}-${event.id}-reminders`;
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
            message = '¡Faltan 8 días para el evento! Prepara tu mejor atuendo.'
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
            message = '¡Mañana es el evento! No te lo puedes perder. Te esperamos con gusto';
          } else if (Math.ceil(timeDiff / (1000 * 3600)) === 1 && !oneHourReminderSent) {
            await dbEventNotificationControlRef.update({ oneHourReminderSent: true });
            shouldSendReminder = true;
          }

          if (shouldSendReminder) {
            console.log(`Sending reminder for event: ${event.id}`);
            await this.notificationsService.sendPushToTopic(topic, title, body);
          }
        }
      }
    }
  }

  async listenWeddingActiveEvents() {
    try {
      const db = getFirestore();
      const doc = db.collection(EventType.NUESTRA_BODA).doc('admon').collection('control-lists').doc('events');

      this.activeEventsListener = await doc.onSnapshot(async (docSnapshot: FirebaseFirestore.DocumentSnapshot) => {
        //* Disposing all the specific events listeners if exist.
        this.disposeSpecificEventsListeners();

        console.log(`Received doc snapshot: ${JSON.stringify(docSnapshot.data())}`);

        //* Filtering only the active events. ('Active' means the service is paid, and the ceremony and party dates are NOT due)
        const { active } = docSnapshot.data();
        this.activeEventsIds = active;

        //!
        //! Creating specific events listeners
        //!

        for (const eventId of this.activeEventsIds) {
          const query = db.collection(EventType.NUESTRA_BODA).doc(eventId).collection('invitations');

          const observer = query.onSnapshot(async (querySnapshot: FirebaseFirestore.QuerySnapshot) => {
            //? Checking if event already exists in runtime registry in order to compare with the arriving changes.
            console.log(`Active Events: ${JSON.stringify(this.activeEvents)}`);
            let eventIndex: number = this.activeEvents.findIndex((item: Event) => item.id == eventId);

            if (eventIndex == -1) {
              //? If event DOES NOT exist
              const dbEventNotificationControl = await db.collection(EventType.NUESTRA_BODA).doc('notifications-control').collection(eventId).doc('control-list').get();

              let event: Event = {
                id: eventId,
                eventType: EventType.NUESTRA_BODA,
                invitations: []
              };

              if (dbEventNotificationControl.exists) {
                const { list } = dbEventNotificationControl.data();
                const invitations: Invitation[] = list != undefined ? list.map((item) => item as Invitation) : [];
                event.invitations = invitations;
              }

              this.activeEvents.push(event);
            }

            querySnapshot.docChanges().forEach(async (change) => {
              eventIndex = this.activeEvents.findIndex((item) => item.id == eventId);
              let event: Event = this.activeEvents.find((item) => item.id == eventId);

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

                this.activeEvents[eventIndex].invitations.push(...invitationsToAdd);
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

                  this.activeEvents[eventIndex].invitations[index] = newInvitation;

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

                      this.activeEvents[eventIndex].invitations[index] = invitation;
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

                this.activeEvents[eventIndex].invitations.push(...invitationsToAdd);
              }

              //? Checking if we should notify.
              if (invitationsToNotify.length) {
                console.log("Sending notification");
                const topic = `${EventType.NUESTRA_BODA}-${eventId}-invitations`;
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
                  this.activeEvents[eventIndex].invitations[index] = invitation;
                }
                // const eventSettings = await db.collection(EventType.NUESTRA_BODA).doc(eventId).get();
                // if (!eventSettings.exists) {
                //   console.error(`Event: ${eventId} not found. Trying to retrieve organizers notification tokens.`);
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
              for (const invitation of this.activeEvents[eventIndex].invitations) {
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

          this.specificEventListeners.push(observer);
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

  findAll() {
    return `This action returns all event`;
  }

  findOne(id: number) {
    return `This action returns a #${id} event`;
  }

  update(id: number, updateEventDto: UpdateEventDto) {
    return `This action updates a #${id} event`;
  }

  remove(id: number) {
    return `This action removes a #${id} event`;
  }

  onModuleDestroy() {
    try {
      this.disposeActiveEventsListener();
    } catch (error) {
      console.error(error);

    }
  }

  private disposeActiveEventsListener() {
    if (this.activeEventsListener) {
      this.activeEventsListener();
      this.activeEventsListener = null;

      this.disposeSpecificEventsListeners();
    }
  }

  private disposeSpecificEventsListeners() {
    const areSpecificEventsToDispose: boolean = this.specificEventListeners.length > 0;

    for (let event of this.specificEventListeners) {
      event();
      event = null;
    }

    this.specificEventListeners = [];

    if (areSpecificEventsToDispose) console.log("Specific Events Listeners Disposed");
  }
}