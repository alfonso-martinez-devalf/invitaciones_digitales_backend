export class CreateUserDto {
    id: string;
    createdAt: Date;
    lastSignInAt?: Date;
    lastSeenAt?: Date;
    email?: string;
    name?: string;
    phone?: string;
    photoURL?: string;
    notificationTokens: [string];
    updatedAt?: Date;
    emailConfirmedAt?: Date;
    phoneConfirmedAt?: Date;
    userMetadata?: Object;
}
