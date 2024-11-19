import * as vscode from 'vscode';
import { Config } from '../settings';
import { actionWithProgress, createCommand, debounce } from '../utils';
import { Commands } from './commands';
import { AngularComponent } from './components/angular-component';
import { getLocalComponents } from './components/local';
import { getPackagesComponents } from './components/packages';
import { data } from './data';
import { onDidChangeConfiguration, onDidCreateFiles, onDidRenameFiles, onDidSaveTextDocument } from './events';

export type TagsProviderType = {
    context: vscode.ExtensionContext;
    init: (context: vscode.ExtensionContext) => Promise<void>;
    registerEvents: () => void;
    registerProviders: () => void;
    registerCommands: () => void;
    loadPackagesComponents: () => Promise<AngularComponent[]>;
    loadLocalComponents: () => Promise<AngularComponent[]>;
};

export const TagsProvider: TagsProviderType = {
    context: null,

    async init(context: vscode.ExtensionContext) {
        this.context = context;
        this.registerEvents();
        this.registerCommands();
        this.registerProviders();
        data.localComponents = await this.loadLocalComponents();
        data.packagesComponents = await this.loadPackagesComponents();
    },

    registerEvents() {
        vscode.workspace.onDidChangeConfiguration(onDidChangeConfiguration);
        vscode.workspace.onDidCreateFiles(onDidCreateFiles);
        vscode.workspace.onDidRenameFiles(onDidRenameFiles);
        vscode.workspace.onDidSaveTextDocument(debounce(onDidSaveTextDocument, 1000));
    },

    registerProviders() {
        this.context.subscriptions.push(createTagsProvider());
    },

    registerCommands() {
        this.context.subscriptions.push(...[createCommand(Commands.ComponentImport)]);
    },

    loadPackagesComponents() {
        return actionWithProgress<AngularComponent[]>({
            title: 'Indexing UI Packages Components',
            show: true,
            args: [Config<string[]>('UIComponentsPaths')],
            initialValue: [],
            action: getPackagesComponents
        });
    },

    loadLocalComponents() {
        return actionWithProgress<AngularComponent[]>({
            title: 'Indexing Local Components',
            show: true,
            initialValue: [],
            action: getLocalComponents
        });
    }
};

export function createTagsProvider() {
    return vscode.languages.registerCompletionItemProvider(
        ['html', 'typescript'],
        {
            provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
                const language = document.languageId;

                if (language === 'typescript') {
                    const allPreviousText = document.getText(
                        new vscode.Range(0, 0, position.line, position.character - 1)
                    );

                    // within a class and not a template
                    if (allPreviousText.includes('export class')) {
                        return [];
                    }
                }

                const components = [...data.packagesComponents, ...data.localComponents];

                // get last char in current line
                const prevChar = document.lineAt(position.line).text.charAt(position.character - 1);

                // if last character is "<" then no need to add "<" to the tag
                const prefix = prevChar === '<' ? '' : '<';

                return components.map(c => {
                    const selector = c.getSelector();
                    const label = `${selector} (${c.importPath})`;
                    const completionItem = new vscode.CompletionItem(label, vscode.CompletionItemKind.Snippet);
                    completionItem.insertText = new vscode.SnippetString(`${prefix}${selector}>$1</${selector}>`);

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
