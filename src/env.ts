import * as vscode from 'vscode';

export const EXTENSION_NAME = 'angular-vscode-helper';

////////////////////////////////////////////////////////////////////////////////
//
// Config
//
////////////////////////////////////////////////////////////////////////////////

export const globalConfig = vscode.workspace.getConfiguration(EXTENSION_NAME);

const KEYS = {
    UIComponentsPaths: 'configuration.UIComponentsPaths'
} as const;

export function Env(key: keyof typeof KEYS, fullKey = false) {
    return fullKey ? `${EXTENSION_NAME}.${KEYS[key]}` : KEYS[key];
}

export function Config<T>(key: keyof typeof KEYS, fullKey = false) {
    return globalConfig.get(Env(key, fullKey)) as T;
}

////////////////////////////////////////////////////////////////////////////////
//
// Workspace
//
////////////////////////////////////////////////////////////////////////////////

export function getCurrentWorkspace() {
    return vscode.workspace.workspaceFolders[0].uri.fsPath;
}

export function getCurrentActiveFile() {
    return vscode.window.activeTextEditor?.document.fileName;
}

////////////////////////////////////////////////////////////////////////////////
//
// GUI
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
            cancellable: onCancel !== undefined
        },
        async (progress, token) => {
            if (onCancel !== undefined) {
                token.onCancellationRequested(() => onCancel());
            }
            await action(progress, token);
        }
    );
}

export async function actionWithProgress<ResultType>(props: {
    title: string;
    show?: boolean;
    args?: any[];
    initialValue: any;
    action: any;
}) {
    let res: ResultType = props.initialValue;
    props.args = props.args ?? [];
    if (props.show) {
        await createProgressBar('Indexing UI Packages Components', async () => {
            res = await props.action(...props.args);
        });
    } else {
        res = await props.action(...props.args);
    }
    return res;
}
