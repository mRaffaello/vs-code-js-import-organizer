// Others
import * as fs from 'fs';
import * as path from 'path';

export const getAllFiles = (
    dirPath: string,
    includeDirs = false,
    arrayOfFiles: string[] = []
): string[] => {
    if (!fs.existsSync(dirPath)) return [];

    let files = fs.readdirSync(dirPath).filter(f => !f.startsWith('.'));

    files.forEach(file => {
        if (fs.statSync(dirPath + '/' + file).isDirectory()) {
            includeDirs && arrayOfFiles.push(path.join(dirPath, '/', file));
            arrayOfFiles = getAllFiles(dirPath + '/' + file, includeDirs, arrayOfFiles);
        } else arrayOfFiles.push(path.join(dirPath, '/', file));
    });

    return arrayOfFiles;
};

export const getExtension = (fileName: string): string | undefined => fileName.split('.').pop();

export const removeExtension = (path: string): string => {
    const split = path.split('.');
    return split.length > 1 ? path.split('.').slice(0, -1).join('.') : path;
};

export const isSubdir = (parentDir: string, subdir: string) => {
    subdir = path.resolve(subdir);
    return subdir.startsWith(parentDir);
};
