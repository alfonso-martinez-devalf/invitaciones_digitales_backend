import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import * as firebase from 'firebase-admin';
import { SubscribeToTopic } from './dto/subscribe-to-topic.dto';

@Injectable()
export class NotificationsService {
    async subscribeToTopic(subscribeToTopic: SubscribeToTopic) {
        const topic = `${subscribeToTopic.event_type}-${subscribeToTopic.event_id}-${subscribeToTopic.topic}`;
        try {
            await firebase.messaging().subscribeToTopic(subscribeToTopic.token, topic);
            return { message: `Subscribed to topic: ${topic}` };
        } catch (error) {
            console.error(error);
            throw new HttpException(error.message, HttpStatus.CONFLICT, {
                cause: new Error(error.message),
            });
        }
    }

    async unsubscribeToTopic(unsubscribeToTopic: SubscribeToTopic) {
        const topic = `${unsubscribeToTopic.event_type}-${unsubscribeToTopic.event_id}-${unsubscribeToTopic.topic}`;
        try {
            await firebase.messaging().unsubscribeFromTopic(unsubscribeToTopic.token, topic);
        } catch (error) {
            console.error(error);
            throw new HttpException(error.message, HttpStatus.CONFLICT, {
                cause: new Error(error.message),
            });
        }
    }

    async sendPushToToken(
        notification_token: any,
        title: string,
        body: string,
    ): Promise<void> {
        try {
            await firebase
                .messaging()
                .send({
                    notification: { title, body },
                    token: notification_token,
                    android: { priority: 'high' },
                })
                .catch((error: any) => {
                    console.error(error);
                });
        } catch (error) {
            return error;
        }
    };

    //? SendMultiCast to several tokens

    async sendPushToTopic(
        topic: string,
        title: string,
        body: string,
    ): Promise<void> {
        try {
            await firebase
                .messaging()
                .send({
                    topic: topic,
                    notification: { title, body },
                })
                .catch((error: any) => {
                    console.error(error);
                });
        } catch (error) {
            return error;
        }
    }
}
