import { commaSplit, isKebabCase } from "../utils/string";
import { fillEmptyData } from "../utils/array";
import { parseArray, parseObject } from "../utils/parsers";

export class ComponentAndDirective {
  public component: string;
  public selectors: string[];
  public exportAs: string[];
  public inputMap: {
    [key: string]:
      | string
      | {
          alias: string | null;
          required: boolean;
        };
  };
  public outputMap: {
    [key: string]: string;
  };
  public queryFields: string[];
  public ngContentSelectors: string[];
  public isStandalone: boolean;
  public hostDirectives: any;
  public isSignal: boolean;

  constructor(declaration?: string) {
    if (declaration) {
      const properties = this.parseProperties(declaration);
      this.component = properties[0];
      this.selectors = this.parseSelectors(properties[1]);
      this.exportAs = parseArray(properties[2]);
      this.inputMap = parseObject(properties[3]);
      this.outputMap = parseObject(properties[4]);
      this.queryFields = parseArray(properties[5]);
      this.ngContentSelectors = parseArray(properties[6]);
      this.isStandalone = properties[7] === "true";
      this.hostDirectives = properties[8];
      this.isSignal = properties[9] === "true";
    }
  }

  getComponentSelector() {
    return this.selectors.find(s => isKebabCase(s));
  }

  private parseProperties(declaration: string) {
    const parts = commaSplit(declaration);
    return fillEmptyData(parts, 9);
  }

  private parseSelectors(s: string) {
    return s
      .trim()
      .split(",")
      .map(s => s.trim().replace(/['"]/g, ""));
  }
}
