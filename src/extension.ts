import * as vscode from 'vscode';
import { tagsAutocomplete } from './tag-autocomplete';

export async function activate(context: vscode.ExtensionContext) {
    tagsAutocomplete.init(context);
}
