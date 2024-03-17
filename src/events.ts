import * as vscode from "vscode";
import { Config, Env } from "./env";
import { getLocalComponents, getPackagesComponents } from "./tags-provider";
import { ExtensionData } from "./types";
import { debounce } from "./utils";

////////////////////////////////////////////////////////////////////////////////
//
// Configuration Events
//
////////////////////////////////////////////////////////////////////////////////

export const onDidChangeConfiguration = debounce(_onDidChangeConfiguration, 1000);

async function _onDidChangeConfiguration(e: vscode.ConfigurationChangeEvent, data: ExtensionData) {
  console.log("change configuration");
  if (e.affectsConfiguration(Env("UIComponentsPaths", true))) {
    data.packagesComponents = await getPackagesComponents(Config<string[]>("UIComponentsPaths"));
  }
}

////////////////////////////////////////////////////////////////////////////////
//
// File Events
//
////////////////////////////////////////////////////////////////////////////////

export const onDidCreateFiles = debounce(_onDidCreateFiles, 1000);
export const onDidRenameFiles = debounce(_onDidRenameFiles, 1000);

async function _onDidCreateFiles(e: vscode.FileCreateEvent, data: ExtensionData) {
  console.log("add component file");
  handleLocalChanges(
    e.files.map(f => f.fsPath),
    data
  );
}

async function _onDidRenameFiles(e: vscode.FileRenameEvent, data: ExtensionData) {
  console.log("rename component file");
  handleLocalChanges(
    e.files.map(f => f.newUri.fsPath),
    data
  );
}

////////////////////////////////////////////////////////////////////////////////
//
// Text Document Events
//
////////////////////////////////////////////////////////////////////////////////

export const onDidSaveTextDocument = debounce(_onDidSaveTextDocument, 1000);

async function _onDidSaveTextDocument(e: vscode.TextDocument, data: ExtensionData) {
  console.log("save component file");
  handleLocalChanges([e.uri.fsPath], data);
}

////////////////////////////////////////////////////////////////////////////////
//
// Common Event Tasks
//
////////////////////////////////////////////////////////////////////////////////

async function handleLocalChanges(paths: string[], data: ExtensionData) {
  if (paths.some(p => p.includes(".component.ts"))) {
    data.localComponents = await getLocalComponents();
  }
}
