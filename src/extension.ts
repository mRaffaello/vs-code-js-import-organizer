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

export function activate(context: vscode.ExtensionContext) {
    // Get root folder & config
    const folder = vscode.workspace.workspaceFolders![0].uri.path;
    const configPath = path.join(folder, CONFIG_FILE_NAME);

    // Load config
    let config: Config;
    try {
        config = JSON.parse(fs.readFileSync(configPath).toString());
    } catch (error) {
        vscode.window.showWarningMessage('Invalid config. Loaded default');
        config = defaultConfig;
        return;
    }

    const rootFolder = path.join(folder, config.root);

    // Initialize organizer
    const organizer = new ImportOrganizer(config, rootFolder);

    // Register organize file imports command
    let disposable = vscode.commands.registerCommand(
        'vs-code-js-import-organizer.organizeFileImports',
        () => {
            // Check that root folder exists
            if (!fs.existsSync(rootFolder)) {
                vscode.window.showWarningMessage('Specified root folder does not exists');
                return;
            }

            // Check that files exists
            const file = vscode.window.activeTextEditor!.document.uri.fsPath;
            if (!fs.existsSync(file)) {
                vscode.window.showWarningMessage('Selected file does not exists');
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
                    file,
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
    );

    context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}
