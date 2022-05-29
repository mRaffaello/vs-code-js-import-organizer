import { LINE_TYPE } from '../types/enums';
import { DecodedImport } from '../types/types';

export const getFromImport = (line: string): string | undefined => {
    const matches = line.match(/\'.*\'/gm);
    if (matches) return matches[0].slice(1, -1);
};

export const getImportType = (line: string): LINE_TYPE => {
    if (line.startsWith('import {')) return LINE_TYPE.DESTRUCTURED;
    else if (line.startsWith('import {') && !line.includes('{')) return LINE_TYPE.DEFAULT;
    else return LINE_TYPE.BOTH;
};

export const decodeImport = (line: string): DecodedImport => ({
    type: getImportType(line),
    from: getFromImport(line) || ''
});
