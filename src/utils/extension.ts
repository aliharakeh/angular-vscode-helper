import * as vscode from "vscode";

////////////////////////////////////////////////////////////////////////////////
//
// Workspace Helpers
//
////////////////////////////////////////////////////////////////////////////////
export function getCurrentOpenedFolder() {
  return vscode.workspace.workspaceFolders[0].uri.fsPath;
}

export function getCurrentActiveFile() {
  return vscode.window.activeTextEditor?.document.fileName;
}

////////////////////////////////////////////////////////////////////////////////
//
// GUI Helpers
//
////////////////////////////////////////////////////////////////////////////////
export type ProgressAction = (
  progress: vscode.Progress<{ message?: string; increment?: number }>,
  token: vscode.CancellationToken
) => Promise<void>;

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
