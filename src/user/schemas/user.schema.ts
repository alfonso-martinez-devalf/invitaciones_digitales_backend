import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class User extends Document {
    @Prop({ required: true })
    id: string;

    @Prop()
    createdAt: Date;

    @Prop()
    lastSignInAt: Date;
    
    @Prop()
    lastSeenAt: Date;

    @Prop()
    email?: string;

    @Prop()
    name?: string;

    @Prop()
    phone?: string;

    @Prop()
    photoURL?: string;

    @Prop({ type: [String], default: [] })
    notificationTokens: string[];

    @Prop({ default: ['user'] })
    roles: string[];
    
    @Prop({ type: Object })
    userMetadata: Object;
}

export const UserSchema = SchemaFactory.createForClass(User);
