import { readFile } from "fs/promises";
import { dirname, join } from "path";
import { fillEmptyData } from "./utils/array";
import { getCurrentOpenedFolder } from "./utils/extension";
import { getPatternMatches, parseArray, parseObject, parseString } from "./utils/parsers";
import { commaSplit } from "./utils/string";
import { isKebabCase } from "./utils/validation";
import { ComponentFile } from "./utils/files";

////////////////////////////////////////////////////////////////////////////////
//
// Extractors
//
////////////////////////////////////////////////////////////////////////////////
const PACKAGE_COMPONENT_PATTERN = /i0\.ɵɵComponentDeclaration<([\s\S]+?)>;/g;

export async function extractPackageComponents(file: ComponentFile): Promise<ComponentAndDirective[]> {
  const content = await readFile(file.path, "utf8");
  return getPatternMatches(content, PACKAGE_COMPONENT_PATTERN).map(data => {
    const properties = parseProperties(data[0]);
    const cwd = join(getCurrentOpenedFolder(), "node_modules");
    return new ComponentAndDirective({
      component: properties[0],
      selectors: parseSelectors(properties[1]),
      exportAs: parseArray(properties[2]),
      inputMap: parseObject(properties[3], s => s.replaceAll(";", ",")),
      outputMap: parseObject(properties[4], s => s.replaceAll(";", ",")),
      queryFields: parseArray(properties[5]),
      ngContentSelectors: parseArray(properties[6]),
      isStandalone: parseString(properties[7]) === "true",
      hostDirectives: properties[8],
      isSignal: parseString(properties[9]) === "true",
      importPath: file.directory.slice(file.directory.indexOf(cwd) + cwd.length + 1), // standalone & module are in the same folder
    });
  });
}

const LOCAL_COMPONENT_PATTERN = /@Component\(([\s\S\n]+?)\)[\s\n\t]+export[\s\t]+class[\s\t]+(\w+)/g;

export async function extractLocalComponents(file: ComponentFile, parentModulePath: string = "") {
  const content = await readFile(file.path, "utf8");
  return getPatternMatches(content, LOCAL_COMPONENT_PATTERN).map(data => {
    const properties: any = parseObject(data[0]);
    const standalone = properties.standalone === "true";
    const cwd = getCurrentOpenedFolder();
    const importPath = (standalone ? file.path : parentModulePath).slice(file.path.indexOf(cwd) + cwd.length + 1);
    return new ComponentAndDirective({
      component: data[1],
      selectors: properties.selector?.split(",").map(s => s.trim()) || [],
      exportAs: properties.exportAs,
      inputMap: properties.inputs,
      outputMap: properties.outputs,
      queryFields: null,
      ngContentSelectors: null,
      isStandalone: standalone,
      hostDirectives: null,
      isSignal: false,
      importPath: importPath,
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

export class ComponentAndDirective {
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

  constructor(data: Partial<ComponentAndDirective>) {
    Object.assign(this, data);
  }

  getComponentSelector() {
    return this.selectors.find(s => isKebabCase(s));
  }

  getDefaultModuleName() {
    return this.component + "Module";
  }
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
  return s.split(",").map(s => s.trim().replace(/['"]/g, ""));
}

function generateImport(component: ComponentAndDirective) {
  const name = component.isStandalone ? component.component : component.getDefaultModuleName();
  return `import { ${name} } from "${component.importPath}";`;
}