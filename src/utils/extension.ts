import * as vscode from "vscode";

export function getCurrentOpenedFolder() {
  return vscode.workspace.workspaceFolders[0].uri.fsPath;
}

export function getCurrentActiveFile() {
  return vscode.window.activeTextEditor?.document.fileName;
}
