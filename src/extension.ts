import * as vscode from 'vscode';
import { Commands, createCommand } from './commands';
import {
    onDidChangeConfiguration,
    onDidCreateFiles,
    onDidRenameFiles,
    onDidSaveTextDocument
} from './events';
import { createTagsProvider, getLocalComponents, getPackagesComponents } from './tags-provider';
import { ExtensionData } from './types';

export async function activate(context: vscode.ExtensionContext) {
    ////////////////////////////////////////////////////////////////////////////
    //
    // Autocomplete Suggestions
    //
    ////////////////////////////////////////////////////////////////////////////

    // use an object to make it easy to keep the main reference when we change the inner tag lists later
    const data: ExtensionData = {
        packagesComponents: await getPackagesComponents(true),
        localComponents: await getLocalComponents(true)
    };

    // Listen for configuration changes and update the tag list with the new packages ui components
    vscode.workspace.onDidChangeConfiguration(e => onDidChangeConfiguration(e, data));

    // Listen for new component files and update the tag list with the new components
    vscode.workspace.onDidCreateFiles(e => onDidCreateFiles(e, data));

    // Listen for any component files rename and update the tag list with the new paths
    vscode.workspace.onDidRenameFiles(e => onDidRenameFiles(e, data));

    // Listen for component files change and update the tag list with any new component meta data
    vscode.workspace.onDidSaveTextDocument(e => onDidSaveTextDocument(e, data));

    ////////////////////////////////////////////////////////////////////////////
    //
    // Commands
    //
    ////////////////////////////////////////////////////////////////////////////

    const commands = [createCommand(Commands.ComponentImport, data)];
    context.subscriptions.push(...commands);

    ////////////////////////////////////////////////////////////////////////////
    //
    // Providers
    //
    ////////////////////////////////////////////////////////////////////////////

    const providers = [createTagsProvider(data)];
    context.subscriptions.push(...providers);
}
