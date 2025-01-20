import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import * as firebase from 'firebase-admin';

@Injectable()
export class NotificationsService {
    PushNotificationTypes = {
        CustomerAddedSale: 'CustomerAddedSale',
        CustomerUpdatedSale: 'CustomerUpdatedSale',
    };

    async subscribeToTopic(tokens: [string], topic: string) {
        try {
            await firebase.messaging().subscribeToTopic(tokens, topic);
        } catch (error) {
            console.error(error);
            throw new HttpException(error.message, HttpStatus.CONFLICT, {
                cause: new Error(error.message),
            });
        }
    }

    //! This is not currently used.
    async unsubscribeToTopic(tokens: [string], topic: string) {
        try {
            await firebase.messaging().unsubscribeFromTopic(tokens, topic);
        } catch (error) {
            console.error(error);
            throw new HttpException(error.message, HttpStatus.CONFLICT, {
                cause: new Error(error.message),
            });
        }
    }

    sendPushToToken = async (
        notification_token: any,
        title: string,
        body: string,
    ): Promise<void> => {
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
