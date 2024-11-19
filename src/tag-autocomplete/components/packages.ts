import { readFile } from 'fs/promises';
import { glob } from 'glob';
import { basename, dirname, join } from 'path';
import { Config } from '../../settings';
import {
    ComponentFile,
    commaSplit,
    fillEmptyData,
    getCurrentWorkspace,
    getPatternMatches,
    parseArray,
    parseObject,
    parseString
} from '../../utils';
import { AngularComponent } from './angular-component';

const PACKAGE_COMPONENT_PATTERN = /i0\.ɵɵComponentDeclaration<([\s\S]+?)>;/g;

/**
 * iterate all packages paths and extract component definitions from the `d.ts` type files
 */
export async function getPackagesComponents() {
    const packagesPaths = Config<string[]>('UIComponentsPaths');
    const nodeModules = join(getCurrentWorkspace(), 'node_modules');
    const angularComponents: AngularComponent[] = [];

    // iterate all packages paths
    for (const path of packagesPaths) {
        const typeFiles = await glob(`**/*.d.ts`, {
            cwd: join(nodeModules, path)
        });

        for (const typeFile of typeFiles) {
            const dir = join(path, dirname(typeFile));

            const fileData: ComponentFile = {
                path: join(path, typeFile),
                name: basename(typeFile),
                directory: dir,
                modulePath: dir
            };

            const fileComponents = await extractPackageFileComponents(fileData);
            angularComponents.push(...fileComponents.filter(c => c.getSelector()));
        }
    }
    return angularComponents;
}

async function extractPackageFileComponents(file: ComponentFile) {
    const cwd = join(getCurrentWorkspace(), 'node_modules');
    const fileContent = await readFile(join(cwd, file.path), 'utf8');
    return getPatternMatches(fileContent, PACKAGE_COMPONENT_PATTERN).map(d => parseComponent(d, cwd, file));
}

function parseComponent(data: any, cwd: string, file: ComponentFile): AngularComponent {
    const [
        component,
        selectors,
        exportAs,
        inputMap,
        outputMap,
        queryFields,
        ngContentSelectors,
        standalone,
        hostDirectives,
        isSignal
    ] = parseProperties(data[0]);

    const isStandalone = parseString(standalone) === 'true';

    return new AngularComponent({
        component: component,
        selectors: parseSelectors(selectors),
        exportAs: parseArray(exportAs),
        inputMap: parseObject(inputMap, s => s.replaceAll(';', ',')),
        outputMap: parseObject(outputMap, s => s.replaceAll(';', ',')),
        queryFields: parseArray(queryFields),
        ngContentSelectors: parseArray(ngContentSelectors),
        isStandalone,
        hostDirectives,
        isSignal: parseString(isSignal) === 'true',
        importPath: file.modulePath, // consider standalone & module are in the same package component directory for now
        importName: isStandalone ? component : `${component}Module`,
        file: join(cwd, file.path),
        type: 'package'
    });
}

function parseProperties(declaration: string) {
    const parts = commaSplit(declaration);
    return fillEmptyData(parts, 10);
}

function parseSelectors(s: string) {
    return s.split(',').map(s => s.trim().replace(/['"]/g, ''));
}
