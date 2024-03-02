import * as vscode from "vscode";
import { ProgressAction } from "../types/gui";

export function getCurrentOpenedFolder() {
  return vscode.workspace.workspaceFolders[0].uri.fsPath;
}

export function getCurrentActiveFile() {
  return vscode.window.activeTextEditor?.document.fileName;
}

export function createProgressBar(message: string, action: ProgressAction, onCancel?: () => void) {
  return vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: message,
      cancellable: onCancel !== undefined,
    },
    async (progress, token) => {
      if (onCancel !== undefined) {
        token.onCancellationRequested(() => onCancel());
      }
      await action(progress, token);
    }
  );
}
