import * as vscode from "vscode";
import { readFile } from "fs/promises";
import { basename, join } from "path";
import { fillEmptyData } from "./utils/array";
import { getCurrentWorkspace } from "./utils/extension";
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

export async function extractPackageComponents(file: ComponentFile): Promise<AngularComponent[]> {
  const content = await readFile(file.path, "utf8");
  return getPatternMatches(content, PACKAGE_COMPONENT_PATTERN).map(data => {
    const properties = parseProperties(data[0]);
    const cwd = join(getCurrentWorkspace(), "node_modules");
    return new AngularComponent({
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
      // TODO: see if we can make this better. standalone & module are considered in the same folder for now
      importPath: join(
        file.modulePath.slice(file.modulePath.indexOf(cwd) + cwd.length + 1),
        getDefaultModuleName(properties[0])
      ),
      file: file.path,
    });
  });
}

const LOCAL_COMPONENT_PATTERN = /@Component\(([\s\S\n]+?)\)[\s\n\t]+export[\s\t]+class[\s\t]+(\w+)/g;

export async function extractLocalComponents(file: ComponentFile) {
  const content = await readFile(join(getCurrentWorkspace(), file.path), "utf8");
  return getPatternMatches(content, LOCAL_COMPONENT_PATTERN).map(data => {
    const properties: any = parseObject(data[0]);
    const standalone = properties.standalone === "true";
    const importPath = standalone ? file.path : file.modulePath;
    return new AngularComponent({
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
      file: file.path,
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
  public file: string;

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
export function generateComponentImport(component: AngularComponent) {
  return `import { ${basename(component.importPath)} } from "${component.importPath}";`;
}

export function createImportWorkspaceEdits(component: AngularComponent) {
  const edit = new vscode.WorkspaceEdit();
  edit.insert(vscode.Uri.file(getCurrentWorkspace()), new vscode.Position(0, 0), generateComponentImport(component));
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

function getDefaultModuleName(component: string) {
  return component + "Module";
}
