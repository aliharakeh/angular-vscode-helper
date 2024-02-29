import * as vscode from "vscode";
import { readFileSync } from "fs";
import { ComponentAndDirective } from "../entities/component-and-directive";
import { glob } from "glob";
import { getCurrentOpenedFolder } from "../utils/extension";
import { commaSplit } from "../utils/string";
import { parseAny, parsePattern } from "../utils/parsers";

////////////////////////////////////////////////////////////////////////////////
//
// Get the file paths containing the components
//
///////////////////////////////////////////////////////////////////////////////

export async function getPackagesTypeFiles(paths: string[]) {
  const cwd = getCurrentOpenedFolder();
  const files: string[] = [];
  for (const path of paths) {
    const globFiles = await glob(`node_modules/${path}/**/*.d.ts`, {
      cwd,
      absolute: true,
    });
    files.push(...globFiles);
  }
  return files;
}

export async function getLocalComponentsFiles() {
  return await glob("src/**/*.component.ts", {
    cwd: getCurrentOpenedFolder(),
    absolute: true,
  });
}

////////////////////////////////////////////////////////////////////////////////
//
// Parse Component Files
//
////////////////////////////////////////////////////////////////////////////////

const PACKAGE_COMPONENT_PATTERN = /i0\.ɵɵComponentDeclaration<([\s\S]*?)>;/g;
const LOCAL_COMPONENT_PATTERN = /@Component\(([\s\S\n]*?)\)[\s\n\t]*export/g;

export function parsePackageComponents(file: string) {
  const content = readFileSync(file, "utf8");
  return parsePattern(content, PACKAGE_COMPONENT_PATTERN).map(
    (m) => new ComponentAndDirective(m)
  );
}

export function parseLocalComponents(file: string) {
  const content = readFileSync(file, "utf8");
  const declarations = parsePattern(content, LOCAL_COMPONENT_PATTERN);
  return declarations.map((declaration) => {
    const metaData = commaSplit(declaration.slice(1, -1)).reduce(
      (acc, prop) => {
        const [key, value] = prop.split(":").map((s) => s.trim());
        acc[key] = parseAny(value);
        return acc;
      },
      {}
    );
    const component = new ComponentAndDirective();
    metaData.selector = metaData.selector?.split(",");
    Object.assign(component, metaData);
    console.log(component);
    return component;
  });
}

////////////////////////////////////////////////////////////////////////////////
//
// Get Tag List
//
////////////////////////////////////////////////////////////////////////////////

export function getTagList(paths: string[]) {
  const data = [];
  getPackagesTypeFiles(paths).then((files) => {
    for (const file of files) {
      parsePackageComponents(file).forEach((c) => {
        const selector = c.getComponentSelector();
        if (selector) {
          data.push(selector);
        }
      });
    }
  });

  getLocalComponentsFiles().then((files) => {
    for (const file of files) {
      parseLocalComponents(file).forEach((c) => {
        const selector = c.getComponentSelector();
        if (selector) {
          data.push(selector);
        }
      });
    }
  });

  return data;
}

////////////////////////////////////////////////////////////////////////////////
//
// Create Extension Tag Provider
//
////////////////////////////////////////////////////////////////////////////////

export const createTagsProvider = (data: string[]) =>
  vscode.languages.registerCompletionItemProvider(
    "html",
    {
      provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position
      ) {
        // get line last char
        const prevChar = document
          .lineAt(position.line)
          .text.charAt(position.character - 1);

        // if last charactor is "<" then no need to add "<" to the tag
        const prefix = prevChar === "<" ? "" : "<";
        return data.map((tag) => {
          const completionItem = new vscode.CompletionItem(
            tag,
            vscode.CompletionItemKind.Snippet
          );
          completionItem.insertText = new vscode.SnippetString(
            `${prefix}${tag}>$1</${tag}>`
          );
          return completionItem;
        });
      },
    },
    "<"
  );
