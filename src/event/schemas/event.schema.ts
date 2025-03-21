import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class Event extends Document {
    @Prop({type: [Object]})
    appImages;

    @Prop()
    ceremonyAddress: string;
    
    @Prop()
    mainNames: string;

    @Prop({ type: Date })
    ceremonyDate: Date;

    @Prop({ type: Date })
    createdAt: Date;

    @Prop()
    createdBy: string;

    @Prop({type: [Object]})
    galleryItems;

    @Prop()
    generalFont: string;

    @Prop({type: [Object]})
    giftsTable;

    @Prop()
    guests: [string];

    @Prop({default: false})
    hasCeremony: boolean;

    @Prop({default: false})
    hasGallery: boolean;

    @Prop({default: false})
    hasGiftsTable: boolean;

    @Prop({default: false})
    hasParty: boolean;

    @Prop({default: false})
    hasSong: boolean;

    @Prop()
    homeSectionPhrase: string;

    @Prop()
    id: string;

    @Prop()
    mode: "special" | "premium" | "vip";

    @Prop()
    namesFont: string;

    @Prop({type: [Object]})
    organizerContacts;

    @Prop()
    organizerName: string;

    @Prop()
    partyAddress: string;

    @Prop({ type: Date })
    partyDate: Date;

    @Prop()
    phrasesFont: string;

    @Prop()
    songName: string;

    @Prop()
    songURL: string;

    @Prop()
    type: "nuestraboda" | "misxv" | "mibautizo";

    @Prop({ type: Date })
    updatedAt: Date;

    @Prop()
    updatedBy: string;
}

export const EventSchema = SchemaFactory.createForClass(Event);