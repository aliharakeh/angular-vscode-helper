import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import * as vscode from "vscode";
import { AngularComponent, getComponentImport } from "./components";
import { getCurrentActiveFile, getCurrentWorkspace } from "./env";
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
  const hostFile = getCurrentActiveFile().replace(".html", ".ts");
  const hostComponent = data.localComponents.find(c => c.file === hostFile);
  const editedFile = join(getCurrentWorkspace(), hostComponent.importPath);
  const componentImport = getComponentImport(component, editedFile);
  const content = await readFile(editedFile, "utf8");
  const newContent = [
    componentImport,
    content.replace(/imports:\s+\[([\w,\s\n]*?)\],/, (s, m1) => {
      const hasImports = !!m1.trim();
      return ["imports: [" + m1, hasImports ? ", " + component.importName : component.importName, "],"].join("");
    }),
  ].join("\n");
  await writeFile(editedFile, newContent, "utf8");
}
