import * as vscode from 'vscode';

export const EXTENSION_NAME = 'angular-vscode-helper';

const config = vscode.workspace.getConfiguration(EXTENSION_NAME);

const KEYS = {
    UIComponentsPaths: 'configuration.UIComponentsPaths'
} as const;

export function Env(key: keyof typeof KEYS, fullKey = false) {
    return fullKey ? `${EXTENSION_NAME}.${KEYS[key]}` : KEYS[key];
}

export function Config<T>(key: keyof typeof KEYS, fullKey = false) {
    return config.get(Env(key, fullKey)) as T;
}
