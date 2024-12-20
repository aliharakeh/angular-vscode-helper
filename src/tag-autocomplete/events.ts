import * as vscode from 'vscode';
import { Env } from '../settings';
import { getLocalComponents } from './components/local';
import { getPackagesComponents } from './components/packages';
import { data } from './data';

export async function onDidChangeConfiguration(e: vscode.ConfigurationChangeEvent) {
    console.log('change configuration');
    if (e.affectsConfiguration(Env('UIComponentsPaths', true))) {
        data.packagesComponents = await getPackagesComponents();
    }
}

export async function onDidCreateFiles(e: vscode.FileCreateEvent) {
    console.log('add component file');
    handleLocalChanges(e.files.filter(f => f.fsPath.endsWith('.component.ts'))?.[0].fsPath);
}

export async function onDidRenameFiles(e: vscode.FileRenameEvent) {
    console.log('rename component file');
    handleLocalChanges(e.files[0].newUri.fsPath);
}

export async function onDidSaveTextDocument(e: vscode.TextDocument) {
    console.log('save component file');
    handleLocalChanges(e.uri.fsPath);
}

async function handleLocalChanges(path: string) {
    if (path && path.endsWith('.component.ts')) {
        data.localComponents = await getLocalComponents();
    }
}
