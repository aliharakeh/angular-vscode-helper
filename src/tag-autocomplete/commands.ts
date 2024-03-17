import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { getCurrentActiveFile, getCurrentWorkspace } from '../utils';
import { AngularComponent } from './components';
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

export async function autoImportCommand(component: AngularComponent) {
    const hostFile = getCurrentActiveFile().replace('.html', '.ts');
    const hostComponent = data.localComponents.find(c => c.file === hostFile);
    const editedFile = join(getCurrentWorkspace(), hostComponent.importPath);
    const componentImport = component.getImportFor(editedFile);
    const content = await readFile(editedFile, 'utf8');
    const newContent = [
        componentImport,
        content.replace(/imports:\s+\[([\w,\s\n]*?)\],/, (_, imports) => {
            const hasImports = !!imports.trim();
            return [
                'imports: [' + imports,
                hasImports ? ', ' + component.importName : component.importName,
                '],'
            ].join('');
        })
    ].join('\n');
    await writeFile(editedFile, newContent, 'utf8');
}
