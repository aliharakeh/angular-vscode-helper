import * as vscode from "vscode";

export const EXTENSION_NAME = "angular-vscode-helper";

const KEYS = {
  UIComponentsPaths: "configuration.UIComponentsPaths",
} as const;

export const globalConfig = vscode.workspace.getConfiguration(EXTENSION_NAME);

export function Env(key: keyof typeof KEYS, fullKey = false) {
  return fullKey ? `${EXTENSION_NAME}.${KEYS[key]}` : KEYS[key];
}

export function Config<T>(key: keyof typeof KEYS, fullKey = false) {
  return globalConfig.get(Env(key, fullKey)) as T;
}
