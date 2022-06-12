import { LINE_TYPE } from './enums';

export type Block = {
    name: string;
    libraries?: string[];
    folders?: string[];
};

export type Config = {
    root: string;
    organizeOnSave: boolean;
    blocks: Block[];
    allowedExtensions?: string[];
};

export type OrganizerResult = {
    organizedImport: string;
    lastImportLineNumber: number;
};

export type DecodedImport = {
    type: LINE_TYPE;
    from: string;
};
