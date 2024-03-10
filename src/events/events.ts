import * as vscode from "vscode";
import { Env } from "../env";
import { ExtensionData, getLocalTags, getPackagesTags } from "../providers/tags-provider";
import { debounce } from "../utils/helpers";

async function _onDidChangeConfiguration(e: vscode.ConfigurationChangeEvent, data: ExtensionData, config) {
  if (e.affectsConfiguration(Env("UIComponentsPaths", true))) {
    data.packagesTags = await getPackagesTags(config.get(Env("UIComponentsPaths")));
  }
}

async function _onDidCreateFiles(e: vscode.FileCreateEvent, data: ExtensionData) {
  if (e.files.some(f => f.fsPath.includes(".component.ts"))) {
    console.log("add component file");
    data.localTags = await getLocalTags();
  }
}

async function _onDidChangeTextDocument(e: vscode.TextDocumentChangeEvent, data: ExtensionData) {
  if (e.document.fileName.includes(".component.ts")) {
    data.localTags = await getLocalTags();
  }
}

export const onDidChangeConfiguration = debounce(_onDidChangeConfiguration, 1000);

export const onDidCreateFiles = debounce(_onDidCreateFiles, 1000);

export const onDidChangeTextDocument = debounce(_onDidChangeTextDocument, 1000);
