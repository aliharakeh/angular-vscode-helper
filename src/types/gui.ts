import * as vscode from "vscode";

export type ProgressAction = (
  progress: vscode.Progress<{ message?: string; increment?: number }>,
  token: vscode.CancellationToken
) => Promise<void>;
