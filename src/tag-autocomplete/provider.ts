import * as vscode from 'vscode';
import { Config } from '../settings';
import { actionWithProgress, createCommand, debounce } from '../utils';
import { Commands } from './commands';
import { AngularComponent, getLocalComponents, getPackagesComponents } from './components';
import { data } from './data';
import {
    onDidChangeConfiguration,
    onDidCreateFiles,
    onDidRenameFiles,
    onDidSaveTextDocument
} from './events';

export class TagsProvider {
    private context: vscode.ExtensionContext;

    async init(context: vscode.ExtensionContext) {
        this.context = context;
        this.setEvents();
        this.registerCommands();
        this.registerProviders();
        data.localComponents = await this.loadLocalComponents();
        data.packagesComponents = await this.loadPackagesComponents();
    }

    setEvents() {
        vscode.workspace.onDidChangeConfiguration(debounce(onDidChangeConfiguration, 1000));
        vscode.workspace.onDidCreateFiles(debounce(onDidCreateFiles, 1000));
        vscode.workspace.onDidRenameFiles(debounce(onDidRenameFiles, 1000));
        vscode.workspace.onDidSaveTextDocument(debounce(onDidSaveTextDocument, 1000));
    }

    registerProviders() {
        this.context.subscriptions.push(createTagsProvider());
    }

    registerCommands() {
        this.context.subscriptions.push(...[createCommand(Commands.ComponentImport)]);
    }

    loadPackagesComponents() {
        return actionWithProgress<AngularComponent[]>({
            title: 'Indexing UI Packages Components',
            show: true,
            args: [Config<string[]>('UIComponentsPaths')],
            initialValue: [],
            action: getPackagesComponents
        });
    }

    loadLocalComponents() {
        return actionWithProgress<AngularComponent[]>({
            title: 'Indexing Local Components',
            show: true,
            initialValue: [],
            action: getLocalComponents
        });
    }
}

export function createTagsProvider() {
    return vscode.languages.registerCompletionItemProvider(
        'html',
        {
            provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
                const components = [...data.packagesComponents, ...data.localComponents];

                // get last char in current line
                const prevChar = document.lineAt(position.line).text.charAt(position.character - 1);

                // if last character is "<" then no need to add "<" to the tag
                const prefix = prevChar === '<' ? '' : '<';
                return components.map(c => {
                    const selector = c.getSelector();
                    const label = `${selector} (${c.importPath})`;
                    const completionItem = new vscode.CompletionItem(
                        label,
                        vscode.CompletionItemKind.Snippet
                    );
                    completionItem.insertText = new vscode.SnippetString(
                        `${prefix}${selector}>$1</${selector}>`
                    );

                    // execute auto import command
                    const command = Commands.ComponentImport;
                    completionItem.command = {
                        command: command.id,
                        title: command.title,
                        arguments: [c]
                    };
                    return completionItem;
                });
            }
        },
        '<'
    );
}
