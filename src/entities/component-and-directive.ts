import { commaSplit } from "../utils/string";
import { fillEmptyData } from "../utils/array";
import { getPatternMatches, parseAny, parseArray, parseObject } from "../utils/parsers";
import { isKebabCase } from "../utils/validation";
import { readFile } from "fs/promises";
import { dirname } from "path";

////////////////////////////////////////////////////////////////////////////////
//
// Extractors
//
////////////////////////////////////////////////////////////////////////////////
const PACKAGE_COMPONENT_PATTERN = /i0\.ɵɵComponentDeclaration<([\s\S]+?)>;/g;

export async function extractPackageComponents(filePath: string): Promise<ComponentAndDirective[]> {
  const content = await readFile(filePath, "utf8");
  return getPatternMatches(content, PACKAGE_COMPONENT_PATTERN).map(declaration => {
    const properties = parseProperties(declaration);
    return new ComponentAndDirective({
      component: properties[0],
      selectors: parseSelectors(properties[1]),
      exportAs: parseArray(properties[2]),
      inputMap: parseObject(properties[3]),
      outputMap: parseObject(properties[4]),
      queryFields: parseArray(properties[5]),
      ngContentSelectors: parseArray(properties[6]),
      isStandalone: properties[7] === "true",
      hostDirectives: properties[8],
      isSignal: properties[9] === "true",
      importPath: dirname(filePath).split("node_modules/")[1],
    });
  });
}

const LOCAL_COMPONENT_PATTERN = /@Component\(([\s\S\n]+?)\)[\s\n\t]+export/g;

export async function extractLocalComponents(filePath: string) {
  const content = await readFile(filePath, "utf8");
  return getPatternMatches(content, LOCAL_COMPONENT_PATTERN).map(declaration => {
    const properties = commaSplit(declaration.slice(1, -1)).reduce((acc, prop) => {
      const [key, value] = prop.split(":").map(s => s.trim());
      acc[key] = parseAny(value);
      return acc;
    }, {});
    return new ComponentAndDirective({ ...properties, selectors: properties.selector?.split(",") });
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
