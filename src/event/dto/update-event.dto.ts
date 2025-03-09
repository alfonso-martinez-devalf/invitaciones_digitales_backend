import { PartialType } from '@nestjs/mapped-types';
import { EventIdInfoDto } from './event-id-info.dto';

export class UpdateEventDto extends PartialType(EventIdInfoDto) {
    appImages: [AppImages];
    ceremonyAddress: string;
    ceremonyDate: Date;
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
};

export interface AppImages {
    isBackground: boolean;
    phrase?: string;
    section?: string;
    url: string;
};

export interface BasicContact {
    createdAt: string;
    email?: string;
    guests: [string];
    id: string;
    name: string;
    notificationTokens: [string];
    phone?: string;
    updatedAt?: string;
};

export interface GiftTable {
    clabe?: string;
    code?: string;
    isActive: boolean;
    title: string;
};

interface Guest extends BasicContact {
    confirmedAttendanceAt?: string;
    familyId?: string;
    familySurnames?: string;
    hasConfirmedAttendance: string;
    invitedBy: string;
    isUnder10yo: boolean;
    videoMessageURL?: string;
};
