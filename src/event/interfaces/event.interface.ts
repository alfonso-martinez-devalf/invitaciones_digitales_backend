import { AppImages, BasicContact, GiftTable } from "../dto/update-event.dto";

export interface EventInterface {
    appImages: [AppImages];
    ceremonyAddress: string;
    ceremonyDate: Date;
    createdAt: Date;
    galleryItems: [AppImages];
    generalFont: string;
    giftsTable: [GiftTable];
    guests: [string];
    hasCeremony: boolean;
    hasGallery: boolean;
    hasGiftsTable: boolean;
    hasParty: boolean;
    hasSong: boolean;
    homeSectionPhrase: string;
    mode: string;
    namesFont: string;
    organizerContacts: [BasicContact];
    partyAddress: string;
    partyDate: Date;
    phrasesFont: string;
    songName: string;
    songURL: string;
    type: string;
    updatedAt: Date;
}

