// Classes
import ImportOrganizer from './classes/organizer';

// Config
import defaultConfig from './config/config';
import { CONFIG_FILE_NAME, DEFAULT_ALLOWED_EXTENSIONS } from './config/constants';

// Utils
import { getExtension } from './utils/files';

// Types
import { Config } from './types/types';

// Others
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as isSubdir from 'is-subdir';

function organize(rootFolder: string, config: Config, organizer: ImportOrganizer, verbose = false) {
    // Check that root folder exists
    if (!fs.existsSync(rootFolder)) {
        verbose && vscode.window.showWarningMessage('Specified root folder does not exists');
        return;
    }

    // Get filename
    const fileName = vscode.window.activeTextEditor?.document.fileName;
    if (!fileName || !fs.existsSync(fileName)) {
        verbose && vscode.window.showWarningMessage('Selected file does not exists');
        return;
    }

    // Check for errors
    const diagnostics = vscode.languages.getDiagnostics(vscode.Uri.file(fileName));
    const hasErrors = !!diagnostics.find(d => d.severity === 0);
    if (hasErrors) {
        verbose && vscode.window.showWarningMessage('Sorting requires a file without errors');
        return;
    }

    // Organize
    const editor = vscode.window.activeTextEditor;
    if (editor) {
        const document = editor.document.getText();

        // Check current file
        const extension = getExtension(editor.document.fileName);
        const allowedExtensions = config.allowedExtensions || DEFAULT_ALLOWED_EXTENSIONS;
        if (!isSubdir(rootFolder, editor.document.fileName)) return;
        if (!extension || !allowedExtensions.includes(extension)) {
            vscode.window.showWarningMessage('Current file type is not supported');
            return;
        }

        // Get import lines
        const { organizedImport, lastImportLineNumber } = organizer.organizeImport(
            fileName,
            document
        );
        editor.edit(editBuilder => {
            editBuilder.replace(
                new vscode.Range(
                    new vscode.Position(0, 0),
                    new vscode.Position(lastImportLineNumber, 0)
                ),
                organizedImport
            );
        });
    } else vscode.window.showWarningMessage('No file opened');
}

export function activate(context: vscode.ExtensionContext) {
    // Get root folder & config
    const folder = vscode.workspace.workspaceFolders![0].uri.path;
    const configPath = path.join(folder, CONFIG_FILE_NAME);

    // Load config
    let config: Config = {} as Config;
    try {
        config = JSON.parse(fs.readFileSync(configPath).toString());
    } catch (error) {
        config = defaultConfig;
        vscode.window.showWarningMessage(
            'No config found. A default one will be loaded\nPlease add a .sorterconfig.json inside your root folder.\nFor more info visit https://marketplace.visualstudio.com/items?itemName=mRaffaello.vs-code-js-import-organizer&ssr=false#overview'
        );
    }

    const rootFolder = path.join(folder, config.root);

    // Initialize organizer
    const organizer = new ImportOrganizer(config, rootFolder);

    // Register organize file imports command
    const cmdWatcher = vscode.commands.registerCommand(
        'vs-code-js-import-organizer.organizeFileImports',
        () => organize(rootFolder, config, organizer, true)
    );

    // Register on save trigger
    const saveWatcher = vscode.workspace.onWillSaveTextDocument(() => {
        const fileName = vscode.window.activeTextEditor?.document.fileName;
        if (fileName) {
            const diagnostics = vscode.languages.getDiagnostics(vscode.Uri.file(fileName));
            const hasErrors = !!diagnostics.find(d => d.severity === 0);
            if (hasErrors) return;
            organize(rootFolder, config, organizer);
        }
    });

    // Register on file change
    const fsWatcher = vscode.workspace.createFileSystemWatcher(
        new vscode.RelativePattern(vscode.workspace.workspaceFolders![0], '**/*')
    );

    fsWatcher.onDidChange(() => {
        organizer.onFsStructureChange();
    });
    fsWatcher.onDidCreate(() => {
        organizer.onFsStructureChange();
    });
    fsWatcher.onDidDelete(() => {
        organizer.onFsStructureChange();
    });

    // Clear
    context.subscriptions.push(cmdWatcher, fsWatcher, saveWatcher);
}
