import { HttpException, HttpStatus, Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { EventIdInfoDto } from './dto/event-id-info.dto';
import { UpdateEventDto } from './dto/update-event.dto';
const { getFirestore, Timestamp, FieldValue } = require('firebase-admin/firestore');

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
  hasConfirmedAttendance: boolean;
}

interface EventSettings {
  venue: string;
  date: Date;
  isPaid: boolean;
}

@Injectable()
export class EventService implements OnApplicationBootstrap {
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

        //* Creating specific events listeners
        for (const eventId of this.activeEventsIds) {
          console.log(eventId);
          const query = db.collection(EventType.NUESTRA_BODA).doc(eventId).collection('invitations');

          const observer = query.onSnapshot((querySnapshot: FirebaseFirestore.QuerySnapshot) => {
            querySnapshot.docChanges().forEach(async change => {
              //? Getting invitation properties.
              const { id, hasConfirmedAttendance, name, familySurnames, invitedBy, companion } = change.doc.data();

              const hostFamilySurnames: string = familySurnames;

              const newInvitation: Invitation = {
                id,
                hasConfirmedAttendance,
                name,
              };

              //? Checking if event already exists in runtime registry in order to compare with the arriving changes.
              const eventExists: boolean = this.activeEvents.some((item) => item.id == eventId);

              if (!eventExists) {
                //? If event DOES NOT exist
                let event: Event = {
                  id: eventId,
                  eventType: EventType.NUESTRA_BODA,
                  invitations: []
                };

                if (change.type === 'added' || change.type === 'modified') {
                  console.log('New invitation: ', change.doc.data());

                  const invitationsToAdd: Invitation[] = [];

                  //? Adding main invitator to the invitations to assign to the event
                  invitationsToAdd.push(newInvitation);

                  //? Adding companion to the invitations to assign to the event
                  for (const person of companion) {
                    const { id, hasConfirmedAttendance, name, familySurnames, invitedBy, companion } = person;

                    const invitation: Invitation = {
                      id,
                      hasConfirmedAttendance,
                      name,
                    };

                    invitationsToAdd.push(invitation);
                  }

                  event.invitations = invitationsToAdd;

                  this.activeEvents.push(event);
                }
              } else {
                //? Event exists in our runtime registry.
                let event: Event = this.activeEvents.find((item) => item.id == eventId);
                const invitationsToNotify: Invitation[] = [];

                if (change.type === 'added') {
                  const invitationsToAdd: Invitation[] = [];

                  //? Adding main invitator to the invitations to assign to the event
                  invitationsToAdd.push(newInvitation);
                  if (newInvitation.hasConfirmedAttendance) invitationsToNotify.push(newInvitation);

                  //? Adding companion to the invitations to assign to the event
                  for (const person of companion) {
                    const { id, hasConfirmedAttendance, name, familySurnames, invitedBy, companion } = person;

                    const invitation: Invitation = {
                      id,
                      hasConfirmedAttendance,
                      name,
                    };

                    invitationsToAdd.push(invitation);
                    if (hasConfirmedAttendance) invitationsToNotify.push(invitation);
                  }

                  event.invitations.concat(invitationsToAdd);
                } else if (change.type == 'modified') {
                  //? Let's look for the invitation
                  const index: number = event.invitations.findIndex((invitation) => invitation.id == newInvitation.id);

                  if (index > 0) {
                    //? If invitation is found, we update it.
                    const prevInvitation: Invitation = event.invitations.at(index);

                    if (
                      !prevInvitation.hasConfirmedAttendance &&
                      newInvitation.hasConfirmedAttendance
                    ) {
                      invitationsToNotify.push(newInvitation)
                    };
                    event.invitations[index] = newInvitation;
                  } else {
                    //? If the invitation was not in our runtime registry, we add it.
                    const invitationsToAdd: Invitation[] = [];

                    //? Adding main invitator to the invitations to assign to the event
                    invitationsToAdd.push(newInvitation);
                    if (newInvitation.hasConfirmedAttendance) invitationsToNotify.push(newInvitation);

                    //? Adding companion to the invitations to assign to the event
                    for (const person of companion) {
                      const { id, hasConfirmedAttendance, name, familySurnames, invitedBy, companion } = person;

                      const invitation: Invitation = {
                        id,
                        hasConfirmedAttendance,
                        name,
                      };

                      invitationsToAdd.push(invitation);
                      if (hasConfirmedAttendance) invitationsToNotify.push(invitation);
                    }
                  }
                }

                //? Checking if we should notify.
                if (invitationsToNotify.length) {
                  const eventSettings = await db.collection(EventType.NUESTRA_BODA).doc(eventId).get();
                  if (!eventSettings.exists) {
                    console.error(`Event: ${eventId} not found. Trying to retrieve organizers notification tokens.`);
                  } else {
                    const { organizerContacts } = eventSettings.data();
                    for (const organizer of organizerContacts) {
                      //TODO: Implement Notification
                      const { phone } = organizer;
                      console.log(phone);
                    }
                  }
                }
              }
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