import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import * as vscode from 'vscode';
import { getCurrentActiveFile, getCurrentWorkspace } from '../utils';
import { AngularComponent } from './components/angular-component';
import { data } from './data';

export type ExtensionCommand = {
    id: string;
    title: string;
    action: (...args: any[]) => any;
};

export const Commands: Record<string, ExtensionCommand> = {
    ComponentImport: {
        id: 'command.componentImport',
        title: 'Imports Component',
        action: autoImportCommand
    }
};

export async function autoImportCommand(snippetComponent: AngularComponent) {
    // save the active host component
    await vscode.commands.executeCommand('workbench.action.files.save');

    setTimeout(async () => {
        const currentFile = getCurrentActiveFile();

        // get the current active host component that will import the component snippet
        let activeHostComponent: AngularComponent;
        if (currentFile.endsWith('.ts')) {
            activeHostComponent = data.localComponents.find(c => c.file === currentFile);
        } else if (currentFile.endsWith('.html')) {
            activeHostComponent = data.localComponents.find(c => currentFile.includes(c.templateUrl));
        }

        // get active host component path
        const activeHostComponentPath = join(getCurrentWorkspace(), activeHostComponent.importPath);

        // get snippet component import
        const componentImport = snippetComponent.getImportFor(activeHostComponentPath);

        // get active host component content
        const content = await readFile(activeHostComponentPath, 'utf8');

        const newContent = [];

        // add import if not already present
        if (!content.includes(componentImport)) {
            newContent.push(componentImport);
        }

        // replace active host component imports and add the new snippet component import
        if (content.includes('imports:')) {
            newContent.push(
                content.replace(/imports:\s+\[([\w,\s\n]*?)\],/, (_, imports) => {
                    const hasImports = !!imports.trim();

                    if (hasImports && imports.includes(snippetComponent.importName)) {
                        return 'imports: [' + imports + '],';
                    }

                    return [
                        'imports: [' + imports,
                        hasImports ? ', ' + snippetComponent.importName : snippetComponent.importName,
                        '],'
                    ].join('');
                })
            );
        } else {
            newContent.push(
                content.replace(/(selector[:][\s\t]*['"`][\w,\-\s\n]+?['"`],?)/, (_, selector) => {
                    const hasComma = selector.endsWith(',');
                    return selector + (hasComma ? '' : ',') + '\nimports: [' + snippetComponent.importName + '],';
                })
            );
        }

        await writeFile(activeHostComponentPath, newContent.join('\n'), 'utf8');
    }, 300);
}
