import { readFile } from 'fs/promises';
import { glob } from 'glob';
import { basename, dirname, join } from 'path';
import { ComponentFile, getCurrentWorkspace, getPatternMatches, parseObject } from '../../utils';
import { AngularComponent } from './angular-component';

const LOCAL_COMPONENT_PATTERN =
    /@Component\(([\s\S\n]+?)\)[\s\n\t]+export[\s\t]+class[\s\t]+(\w+)/g;

/**
 * iterate all local paths and extract component definitions from the `component.ts` files while also getting all
 * `module.ts` files to map each component to its nearest module where it is defined
 */
export async function getLocalComponents() {
    const angularComponents = [];
    const files = await glob(`**/*.{component,module}.ts`, {
        cwd: getCurrentWorkspace(),
        ignore: ['**/{node_modules,out,dist}/**', '**/.*/**']
    });
    const modulesFilesMap = files
        .filter(file => file.endsWith('.module.ts'))
        .reduce((acc, file) => {
            acc[dirname(file)] = file;
            return acc;
        }, {});
    const componentFiles = files.filter(file => file.endsWith('.component.ts'));
    for (const componentFile of componentFiles) {
        let parentDir = dirname(componentFile);
        let nearestModule = modulesFilesMap[parentDir];
        while (!nearestModule) {
            parentDir = dirname(parentDir);
            nearestModule = modulesFilesMap[parentDir];
            if (parentDir === '.') {
                break;
            }
        }
        const fileData: ComponentFile = {
            path: componentFile,
            name: basename(componentFile),
            directory: parentDir,
            modulePath: nearestModule
        };
        const components = await extractPackageComponents(fileData);
        angularComponents.push(...components.filter(c => c.getSelector()));
    }
    return angularComponents;
}

export async function extractPackageComponents(file: ComponentFile) {
    const cwd = getCurrentWorkspace();
    const content = await readFile(join(cwd, file.path), 'utf8');
    return getPatternMatches(content, LOCAL_COMPONENT_PATTERN).map(data => {
        const properties: any = parseObject(data[0]);
        const standalone = properties.standalone === 'true';
        return new AngularComponent({
            component: data[1],
            selectors: properties.selector?.split(',').map(s => s.trim()) || [],
            exportAs: properties.exportAs,
            inputMap: properties.inputs,
            outputMap: properties.outputs,
            queryFields: null,
            ngContentSelectors: null,
            isStandalone: standalone,
            hostDirectives: null,
            isSignal: false,
            importPath: standalone ? file.path : file.modulePath,
            importName: standalone ? data[1] : getModuleNameFromFile(file.modulePath),
            file: join(cwd, file.path),
            type: 'local'
        });
    });
}

// ex: example-name.module.ts --> ExampleNameModule
function getModuleNameFromFile(filePath: string) {
    if (!filePath) {
        return '';
    }
    return basename(filePath, '.ts')
        .split(/[.-]/)
        .map(s => s.charAt(0).toUpperCase() + s.slice(1))
        .join('');
}
