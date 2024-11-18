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

    // get all component files
    const files = await glob(`**/*.{component,module}.ts`, {
        cwd: getCurrentWorkspace(),
        ignore: ['**/{node_modules,out,dist}/**', '**/.*/**']
    });

    // get all module files
    const modulesFilesMap = files
        .filter(file => file.endsWith('.module.ts'))
        .reduce((acc, file) => {
            acc[dirname(file)] = file;
            return acc;
        }, {});

    // get all component files
    const componentFiles = files.filter(file => file.endsWith('.component.ts'));

    // extract components
    for (const componentFile of componentFiles) {
        let parentDir = dirname(componentFile);

        const nearestModule = getNearestModulePath(parentDir, modulesFilesMap);

        const fileData: ComponentFile = {
            path: componentFile,
            name: basename(componentFile),
            directory: parentDir,
            modulePath: nearestModule
        };

        const components = await extractLocalFileComponents(fileData);

        // add all components that have a selector
        angularComponents.push(...components.filter(c => c.getSelector()));
    }
    return angularComponents;
}

async function extractLocalFileComponents(file: ComponentFile) {
    const cwd = getCurrentWorkspace();
    const fileContent = await readFile(join(cwd, file.path), 'utf8');
    return getPatternMatches(fileContent, LOCAL_COMPONENT_PATTERN).map(d => parseComponent(d, cwd, file));
}

function getNearestModulePath(parentDir: string, modulesFilesMap: any): string {
    let nearestModule = modulesFilesMap[parentDir];
    while (!nearestModule) {
        parentDir = dirname(parentDir);
        nearestModule = modulesFilesMap[parentDir];
        if (parentDir === '.') {
            break;
        }
    }
    return nearestModule;
}

function parseComponent(data: any, cwd: string, file: ComponentFile): AngularComponent {
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
