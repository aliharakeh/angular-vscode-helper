import { join } from "path";
import { AngularComponent, generateComponentImport } from "./components";
import { getCurrentActiveFile } from "./env";
import * as vscode from "vscode";
import { readFile } from "fs/promises";
import { ExtensionCommand, ExtensionData } from "./types";

export const Commands: Record<string, ExtensionCommand> = {
  ComponentImport: {
    key: "command.componentImport",
    title: "Imports Component",
    callback: (component: AngularComponent, data: ExtensionData) => createComponentImportCommand(component, data),
  },
};

export function createCommand(command: ExtensionCommand, data: ExtensionData) {
  return vscode.commands.registerCommand(command.key, (component: AngularComponent) =>
    command.callback(component, data)
  );
}

////////////////////////////////////////////////////////////////////////////
//
// Commands Callbacks
//
////////////////////////////////////////////////////////////////////////////

async function createComponentImportCommand(component: AngularComponent, data: ExtensionData) {
  console.log("component", component);
  const hostFile = getCurrentActiveFile().replace(".html", ".ts");
  console.log("hostFile", hostFile);
  const hostComponent = data.localComponents.find(c => c.file === hostFile);
  console.log("hostComponent", hostComponent, data.localComponents);
  const file = vscode.Uri.file(hostComponent.importPath);
  console.log("file", file);
  const componentImport = generateComponentImport(component);
  console.log("componentImport", componentImport);
  const content = await readFile(file.fsPath, "utf8");
  const newContent = [
    componentImport,
    content.replace(/import\s:\[([\w,\s\n]+)\]/, (s, m1) => {
      return m1 + ", " + component.importName;
    }),
  ].join("\n");
  console.log("newContent", newContent);
  //   const edit = new vscode.WorkspaceEdit();
  //   edit.replace(importFile, new vscode.Range(0, 0, 0, 0), newContent);
  //   vscode.workspace.applyEdit(edit);
}
