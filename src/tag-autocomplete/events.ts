import * as vscode from 'vscode';
import { Env } from '../settings';
import { getLocalComponents, getPackagesComponents } from './components';
import { data } from './data';

export async function onDidChangeConfiguration(e: vscode.ConfigurationChangeEvent) {
    console.log('change configuration');
    if (e.affectsConfiguration(Env('UIComponentsPaths', true))) {
        data.packagesComponents = await getPackagesComponents();
    }
}

export async function onDidCreateFiles(e: vscode.FileCreateEvent) {
    console.log('add component file');
    handleLocalChanges(e.files.map(f => f.fsPath));
}

export async function onDidRenameFiles(e: vscode.FileRenameEvent) {
    console.log('rename component file');
    handleLocalChanges(e.files.map(f => f.oldUri.fsPath));
}

export async function onDidSaveTextDocument(e: vscode.TextDocument) {
    console.log('save component file');
    handleLocalChanges([e.uri.fsPath]);
}

async function handleLocalChanges(paths: string[]) {
    if (paths.some(p => p.endsWith('.component.ts'))) {
        data.localComponents = await getLocalComponents();
    }
}
