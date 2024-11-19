import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
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

    // replace active host component imports and add the new snippet component import
    const newContent = [
        componentImport,
        content.replace(/imports:\s+\[([\w,\s\n]*?)\],/, (_, imports) => {
            const hasImports = !!imports.trim();
            return [
                'imports: [' + imports,
                hasImports ? ', ' + snippetComponent.importName : snippetComponent.importName,
                '],'
            ].join('');
        })
    ].join('\n');

    await writeFile(activeHostComponentPath, newContent, 'utf8');
}
