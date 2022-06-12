// Config
import { OTHER_KEY } from '../config/constants';

// Utils
import { getAllFiles, removeExtension } from '../utils/files';
import { getFromImport, decodeImport } from '../utils/code';

// Types
import { Config, OrganizerResult } from '../types/types';

// Others
import * as path from 'path';
import * as isSubdir from 'is-subdir';

class ImportOrganizer {
    private rootFolder: string;
    private librariesMap = new Map<string, string>();
    private foldersMap = new Map<string, string>();
    private config: Config;

    // Constructor
    public constructor(config: Config, rootFolder: string) {
        this.rootFolder = rootFolder;
        this.config = config;
        this.onFsStructureChange();
    }

    /**
     * Update config
     * @param config new Config
     */
    public updateConfig(config: Config) {
        this.config = config;
        this.onFsStructureChange();
    }

    /**
     * Rebuild the file maps on every fs change
     */
    public onFsStructureChange() {
        this.buildLibrariesMap();
        this.buildFoldersMap();
    }

    /**
     * Builds a key value map that associates every library with
     * his specific block
     */
    private buildLibrariesMap(): void {
        this.config.blocks.forEach(b => {
            b.libraries?.forEach(l => this.librariesMap.set(l, b.name));
        });
    }

    /**
     * Builds a key value map that associates every file path
     * with his specific block
     */
    private buildFoldersMap(): void {
        const tempMap = new Map<string, string>();

        this.config.blocks.forEach(b => {
            b.folders?.forEach(f => tempMap.set(f, b.name));
        });

        const files = getAllFiles(this.rootFolder, true);

        files.forEach(f => {
            f = f.replace(this.rootFolder, '');
            [...tempMap.keys()].some((folder: string) => {
                const block = tempMap.get(folder)!;
                if (isSubdir(folder, f)) {
                    this.foldersMap.set(removeExtension(f), block);
                    return true;
                }
            });
        });
    }

    /**
     * Extracts all lines containing an export in a file
     * @param filePath path of the file
     * @returns importLines and lastImportLineNumber
     */
    private getImportLines(file: string): { lines: string[]; lastImportLineNumber: number } {
        const lines = file.split(/\r\n|\n/);
        const importLines: string[] = [];
        let lastImportLineNumber = 0;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.startsWith('import') && line.includes('from')) {
                importLines.push(line);
                lastImportLineNumber = i;
            } else if (line.startsWith('import') && !line.includes('from')) {
                let multiline = line + '\n';
                let nextLine = line;
                let c = 1;
                while (!nextLine.includes('from')) {
                    nextLine = lines[i + c];
                    multiline += nextLine + '\n';
                    c++;
                }
                importLines.push(multiline.slice(0, -1));
                lastImportLineNumber = i;
            }
        }

        return { lines: importLines, lastImportLineNumber: lastImportLineNumber + 1 };
    }

    /**
     * Order every import map block based on specified rules
     * @param importMap map ot the import lines
     */
    private orderImportMap(importMap: Map<string, string[]>): void {
        importMap.forEach((lines, block) => {
            const sorted = lines.sort((a, b) => {
                const { type: aType, from: aFrom } = decodeImport(a);
                const { type: bType, from: bFrom } = decodeImport(b);
                if (aType != bType) return bType - aType;
                else return aFrom.localeCompare(bFrom);
            });
            importMap.set(block, sorted);
        });
    }

    /**
     * Build ordered import string
     * @param importMap
     * @returns formatted import string
     */
    private buildImportString(importMap: Map<string, string[]>): string {
        let imports = '';
        importMap.forEach((lines, block) => {
            if (lines.length) {
                imports += `// ${block}\n`;
                lines.forEach(l => {
                    imports += l + '\n';
                });
                imports += '\n';
            }
        });

        return imports.slice(0, -1);
    }

    /**
     * Organize file imports using the provided config file
     * @param filePath path of the file
     */
    public organizeImport(filePath: string, file: string): OrganizerResult | undefined {
        // Get all export lines
        const importLines = this.getImportLines(file);
        if (importLines.lines.length === 0) return;

        // Initialize map
        const importMap = new Map<string, string[]>();
        this.config.blocks.forEach(b => importMap.set(b.name, []));
        importMap.set(OTHER_KEY, []);

        // Organize import
        importLines.lines.forEach(l => {
            // Find regex
            const match = getFromImport(l);
            if (match) {
                // Check if is library
                if (!match.startsWith('.')) {
                    const split = match.split('/');
                    let library: string;
                    if (!match.startsWith('@')) library = split[0];
                    else library = [split[0], split[1]].join('/');
                    const block = this.librariesMap.get(library) || OTHER_KEY;
                    const currentBlockImports = importMap.get(block);
                    importMap.set(block, [...(currentBlockImports || []), l]);
                } else {
                    let absPath = path.resolve(filePath, '..', match).replace(this.rootFolder, '');
                    absPath = removeExtension(absPath);

                    const block = this.foldersMap.get(absPath) || OTHER_KEY;
                    const currentBlockImports = importMap.get(block);
                    importMap.set(block, [...(currentBlockImports || []), l]);
                }
            }
        });

        this.orderImportMap(importMap);
        const importString = this.buildImportString(importMap);

        return {
            organizedImport: importString,
            lastImportLineNumber: importLines.lastImportLineNumber
        };
    }
}

export default ImportOrganizer;
