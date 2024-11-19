import * as vscode from 'vscode';
import { TagsProvider } from './tag-autocomplete/provider';

export async function activate(context: vscode.ExtensionContext) {
    await TagsProvider.init(context);
}
