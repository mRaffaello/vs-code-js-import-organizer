// Classes
import ImportOrganizer from './classes/organizer';

// Config
import defaultConfig from './config/config';
import {
    CONFIG_FILE_NAME,
    DEFAULT_ALLOWED_EXTENSIONS,
    JS_CONFIG_FILE_NAME,
    TS_CONFIG_FILE_NAME
} from './config/constants';

// Utils
import { getExtension, isSubdir, parseJSONWithComments } from './utils/files';

// Types
import { Config, JTsConfig } from './types/types';

// Others
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

// Global variables
let organizer: ImportOrganizer;
let config: Config;
let rootFolder: string;
let verbose = false;

/**
 * Loads extension config from file
 * @param folder workspace folder
 * @param configPath filePath
 * @returns parsed Config
 */
function loadConfig(folder: string, configPath: string) {
    let config: Config = {} as Config;
    try {
        config = JSON.parse(fs.readFileSync(configPath).toString());
        rootFolder = path.join(folder, config.root);

        // Check that root folder exists
        if (!fs.existsSync(rootFolder)) {
            vscode.window.showErrorMessage('Specified root folder does not exists');
            throw new Error();
        }
    } catch (error) {
        config = defaultConfig;
        vscode.window.showWarningMessage(
            'No config found or the one provided contains errors, a default one will be loaded.\nPlease add a valid .sorterconfig.json inside your root folder.\nFor more info visit https://marketplace.visualstudio.com/items?itemName=mRaffaello.vs-code-js-import-organizer&ssr=false#overview'
        );
    }
    return config;
}

/**
 * Loads language config from file
 * @param folder workspace folder
 * @returns parsed JTsConfig
 */
function loadJTsConfig(folder: string) {
    let jtsConfig: JTsConfig | undefined = undefined;

    const tsConfigPath = path.join(folder, TS_CONFIG_FILE_NAME);
    const jsConfigPath = path.join(folder, JS_CONFIG_FILE_NAME);

    try {
        if (fs.existsSync(tsConfigPath)) jtsConfig = parseJSONWithComments(tsConfigPath);
        else if (fs.existsSync(jsConfigPath)) jtsConfig = parseJSONWithComments(tsConfigPath);
    } catch (error) {
        vscode.window.showWarningMessage('Error while parsing js/ts config fileß');
    }

    return jtsConfig;
}

/**
 * Checks if the updated file needs a config update
 * @param updatedPath
 * @returns
 */
function needsConfigUpdate(updatedPath: string) {
    return (
        updatedPath.endsWith(CONFIG_FILE_NAME) ||
        updatedPath.endsWith(TS_CONFIG_FILE_NAME) ||
        updatedPath.endsWith(JS_CONFIG_FILE_NAME)
    );
}

/**
 * Updates the current specified cofiguration
 */
function onConfigUpdate() {
    // Get root folder & config
    const folder = vscode.workspace.workspaceFolders![0].uri.path;
    const configPath = path.join(folder, CONFIG_FILE_NAME);

    // Load config
    config = loadConfig(folder, configPath);
    const jtsConfig = loadJTsConfig(folder);

    // Initialize organizer
    if (jtsConfig?.compilerOptions?.baseUrl)
        organizer = new ImportOrganizer(
            config,
            rootFolder,
            path.join(folder, jtsConfig.compilerOptions.baseUrl)
        );
    else organizer = new ImportOrganizer(config, rootFolder);
}

/**
 * Adds save watcher to the workspace
 * @param onSave onSave callback
 * @returns saveWatcher
 */
function createOnSaveWatcher(onSave: () => void) {
    return vscode.workspace.onWillSaveTextDocument(() => {
        if (!config.organizeOnSave) return;
        const fileName = vscode.window.activeTextEditor?.document.fileName;
        if (fileName) {
            const diagnostics = vscode.languages.getDiagnostics(vscode.Uri.file(fileName));
            const hasErrors = !!diagnostics.find(d => d.severity === 0);
            if (hasErrors) return;
            onSave();
        }
    });
}

/**
 * Organizes import
 * @param verbose shows messages to the user
 */
function organize() {
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
            verbose && vscode.window.showWarningMessage('Current file type is not supported');
            return;
        }

        // Get import lines
        const organizerResult = organizer.organizeImport(fileName, document);

        if (organizerResult) {
            const { organizedImport, lastImportLineNumber } = organizerResult;
            editor.edit(editBuilder => {
                editBuilder.replace(
                    new vscode.Range(
                        new vscode.Position(0, 0),
                        new vscode.Position(lastImportLineNumber, 0)
                    ),
                    organizedImport
                );
            });
        }
    } else if (verbose) vscode.window.showWarningMessage('No file opened');
}

export function activate(context: vscode.ExtensionContext) {
    const disposables: vscode.Disposable[] = [];

    // Load initial config
    onConfigUpdate();

    // Register organize file imports command
    const cmdWatcher = vscode.commands.registerCommand(
        'vs-code-js-import-organizer.organizeFileImports',
        () => {
            verbose = true;
            organize();
            verbose = false;
        }
    );
    disposables.push(cmdWatcher);

    // Register on file change
    const fsWatcher = vscode.workspace.createFileSystemWatcher(
        new vscode.RelativePattern(vscode.workspace.workspaceFolders![0], '**/*')
    );
    disposables.push(fsWatcher);

    fsWatcher.onDidChange(f => {
        if (needsConfigUpdate(f.path)) onConfigUpdate();
        organizer.onFsStructureChange();
    });
    fsWatcher.onDidCreate(f => {
        if (needsConfigUpdate(f.path)) onConfigUpdate();
        organizer.onFsStructureChange();
    });
    fsWatcher.onDidDelete(f => {
        if (needsConfigUpdate(f.path)) onConfigUpdate();
        organizer.onFsStructureChange();
    });

    const saveWatcher = createOnSaveWatcher(() => organize());
    disposables.push(saveWatcher);

    // Clear
    context.subscriptions.push(...disposables);
}
