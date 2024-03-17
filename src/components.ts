import { readFile } from 'fs/promises';
import { basename, join } from 'path';
import { getCurrentWorkspace } from './env';
import {
    ComponentFile,
    commaSplit,
    fillEmptyData,
    getPatternMatches,
    getRelativePath,
    isKebabCase,
    parseArray,
    parseObject,
    parseString
} from './utils';

////////////////////////////////////////////////////////////////////////////////
//
// Extractors
//
////////////////////////////////////////////////////////////////////////////////
const PACKAGE_COMPONENT_PATTERN = /i0\.ɵɵComponentDeclaration<([\s\S]+?)>;/g;

export async function extractPackageComponents(file: ComponentFile): Promise<AngularComponent[]> {
    const cwd = join(getCurrentWorkspace(), 'node_modules');
    const content = await readFile(join(cwd, file.path), 'utf8');
    const components = getPatternMatches(content, PACKAGE_COMPONENT_PATTERN);
    return components.map(data => {
        const properties = parseProperties(data[0]);
        const standalone = parseString(properties[7]) === 'true';
        return new AngularComponent({
            component: properties[0],
            selectors: parseSelectors(properties[1]),
            exportAs: parseArray(properties[2]),
            inputMap: parseObject(properties[3], s => s.replaceAll(';', ',')),
            outputMap: parseObject(properties[4], s => s.replaceAll(';', ',')),
            queryFields: parseArray(properties[5]),
            ngContentSelectors: parseArray(properties[6]),
            isStandalone: standalone,
            hostDirectives: properties[8],
            isSignal: parseString(properties[9]) === 'true',
            // standalone & module are considered in the same folder for now
            importPath: file.modulePath,
            importName: standalone ? properties[0] : `${properties[0]}Module`,
            file: join(cwd, file.path),
            type: 'package'
        });
    });
}

const LOCAL_COMPONENT_PATTERN =
    /@Component\(([\s\S\n]+?)\)[\s\n\t]+export[\s\t]+class[\s\t]+(\w+)/g;

export async function extractLocalComponents(file: ComponentFile) {
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

////////////////////////////////////////////////////////////////////////////////
//
// Component & Directive Entity
//
////////////////////////////////////////////////////////////////////////////////
type ImportMap = {
    [key: string]:
        | string
        | {
              alias: string | null;
              required: boolean;
          };
};

type OutputMap = {
    [key: string]: string;
};

export class AngularComponent {
    public component: string;
    public selectors: string[];
    public exportAs: string[];
    public inputMap: ImportMap;
    public outputMap: OutputMap;
    public queryFields: string[];
    public ngContentSelectors: string[];
    public isStandalone: boolean;
    public hostDirectives: any;
    public isSignal: boolean;
    public importPath: string;
    public importName: string;
    public file: string;
    public type: 'package' | 'local';

    constructor(data: Partial<AngularComponent>) {
        Object.assign(this, data);
    }

    getComponentSelector() {
        return this.selectors.find(s => isKebabCase(s));
    }
}

////////////////////////////////////////////////////////////////////////////////
//
// Vscode Import
//
////////////////////////////////////////////////////////////////////////////////
export function getComponentImport(component: AngularComponent, dest: string) {
    if (component.type === 'package') {
        return `import { ${component.importName} } from "${component.importPath.replaceAll(
            '\\',
            '/'
        )}";`;
    }
    const cwd = getCurrentWorkspace();
    return `import { ${component.importName} } from "${getRelativePath(
        component.importPath,
        dest.slice(cwd.length + 1)
    ).replace('.ts', '')}";`;
}

////////////////////////////////////////////////////////////////////////////////
//
// Utils
//
////////////////////////////////////////////////////////////////////////////////
function parseProperties(declaration: string) {
    const parts = commaSplit(declaration);
    return fillEmptyData(parts, 10);
}

function parseSelectors(s: string) {
    return s.split(',').map(s => s.trim().replace(/['"]/g, ''));
}

// ex: example-name.module.ts --> ExampleNameModule
function getModuleNameFromFile(filePath: string) {
    return basename(filePath, '.ts')
        .split(/[.-]/)
        .map(s => s.charAt(0).toUpperCase() + s.slice(1))
        .join('');
}
