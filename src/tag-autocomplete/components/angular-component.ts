import { getCurrentWorkspace, getRelativePath, isKebabCase } from '../../utils';

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
    public templateUrl: string;
    public isLocal: boolean = false;

    constructor(data: Partial<AngularComponent>) {
        Object.assign(this, data);
    }

    getSelector() {
        return this.selectors.find(s => isKebabCase(s));
    }

    getImportFor(dest: string) {
        if (this.type === 'package') {
            return `import { ${this.importName} } from "${this.importPath.replaceAll('\\', '/')}";`;
        }
        const cwd = getCurrentWorkspace();
        return `import { ${this.importName} } from "${getRelativePath(
            this.importPath,
            dest.slice(cwd.length + 1)
        ).replace('.ts', '')}";`;
    }
}
