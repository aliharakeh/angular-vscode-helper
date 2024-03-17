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
            const fileComponents = await extractLocalComponents(fileData);
            angularComponents.push(...fileComponents.filter(c => c.getSelector()));
        }
    }
    return angularComponents;
}

export async function extractLocalComponents(file: ComponentFile): Promise<AngularComponent[]> {
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

function parseProperties(declaration: string) {
    const parts = commaSplit(declaration);
    return fillEmptyData(parts, 10);
}

function parseSelectors(s: string) {
    return s.split(',').map(s => s.trim().replace(/['"]/g, ''));
}
