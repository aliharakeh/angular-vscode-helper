import * as vscode from "vscode";
import { Env } from "./env";
import { ExtensionData, getLocalComponents, getPackagesComponents } from "./tags-provider";
import { debounce } from "./utils/helpers";
import { readFile, writeFile } from "fs/promises";

async function _onDidChangeConfiguration(e: vscode.ConfigurationChangeEvent, data: ExtensionData, config) {
  if (e.affectsConfiguration(Env("UIComponentsPaths", true))) {
    data.packagesComponents = await getPackagesComponents(config.get(Env("UIComponentsPaths")));
  }
}

async function _onDidCreateFiles(e: vscode.FileCreateEvent, data: ExtensionData) {
  if (e.files.some(f => f.fsPath.includes(".component.ts"))) {
    console.log("add component file");
    data.localComponents = await getLocalComponents();
  }
}

async function _onDidChangeTextDocument(e: vscode.TextDocumentChangeEvent, data: ExtensionData) {
  if (e.document.fileName.includes(".component.ts")) {
    data.localComponents = await getLocalComponents();
  }

  // TODO: not here as we don't know if we added a snippet or not, check other events
  // if (e.document.fileName.includes(".component.html")) {
  //   const component = [...data.packagesComponents, ...data.localComponents].find(c => c.file === e.document.uri.fsPath);
  //   if (!component) {
  //     return;
  //   }
  //   let fileContent = await readFile(e.document.uri.fsPath, "utf8");
  //   // TODO: replace last import statement
  //   if (component)
  //     // write file
  //     await writeFile(e.document.uri.fsPath, fileContent, "utf8");
  // }
}

export const onDidChangeConfiguration = debounce(_onDidChangeConfiguration, 1000);

export const onDidCreateFiles = debounce(_onDidCreateFiles, 1000);

export const onDidChangeTextDocument = debounce(_onDidChangeTextDocument, 1000);
