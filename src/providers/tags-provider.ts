import { readFile } from "fs/promises";
import { dirname, join } from "path";
import * as vscode from "vscode";
import { ComponentAndDirective } from "../entities/component-and-directive";
import { createProgressBar, getCurrentOpenedFolder } from "../utils/extension";
import { exists, getFiles } from "../utils/files";
import { parseAny, getPatternMatches } from "../utils/parsers";
import { commaSplit } from "../utils/string";
import { ExtensionData, PackageComponentData } from "../types/data";
import { glob } from "glob";

////////////////////////////////////////////////////////////////////////////////
//
// Get the file paths containing the components
//
///////////////////////////////////////////////////////////////////////////////

export async function getPackagesTypeFiles(paths: string[]) {
  const nodeModules = join(getCurrentOpenedFolder(), "node_modules");
  const typeFiles: string[] = [];
  for (const path of paths) {
    const packagePath = join(nodeModules, path);
    if (!(await exists(packagePath))) {
      continue;
    }
    const files = await getFiles(packagePath, path => path.endsWith(".d.ts"));
    typeFiles.push(...files);
  }
  return typeFiles;
}

export async function getLocalComponentsFiles() {
  const files = await glob(`**/*.component.ts`, {
    cwd: getCurrentOpenedFolder(),
    absolute: true,
    ignore: ["**/node_modules/**", "**/dist/**", "**/out/**", "**/.git/**"],
  });
  return files;
}

////////////////////////////////////////////////////////////////////////////////
//
// Parse Component Files
//
////////////////////////////////////////////////////////////////////////////////

const PACKAGE_COMPONENT_PATTERN = /i0\.ɵɵComponentDeclaration<([\s\S]+?)>;/g;
const LOCAL_COMPONENT_PATTERN = /@Component\(([\s\S\n]+?)\)[\s\n\t]+export/g;

export async function parsePackageComponents(file: string) {
  const content = await readFile(file, "utf8");
  return getPatternMatches(content, PACKAGE_COMPONENT_PATTERN).map(m => new ComponentAndDirective(m));
}

export async function parseLocalComponents(file: string) {
  const content = await readFile(file, "utf8");
  const declarations = getPatternMatches(content, LOCAL_COMPONENT_PATTERN);
  return declarations.map(declaration => {
    const metaData = commaSplit(declaration.slice(1, -1)).reduce((acc, prop) => {
      const [key, value] = prop.split(":").map(s => s.trim());
      acc[key] = parseAny(value);
      return acc;
    }, {});
    const component = new ComponentAndDirective();
    metaData.selectors = metaData.selector?.split(",");
    Object.assign(component, metaData);
    return component;
  });
}

////////////////////////////////////////////////////////////////////////////////
//
// Get Tag List
//
////////////////////////////////////////////////////////////////////////////////

export async function getPackagesTags(paths: string[]): Promise<PackageComponentData[]> {
  const data: PackageComponentData[] = [];
  await createProgressBar("Indexing UI Packages Components", async () => {
    const files = await getPackagesTypeFiles(paths);
    const selectors = new Set<string>();
    for (const file of files) {
      const components = await parsePackageComponents(file);
      components.forEach(c => {
        const selector = c.getComponentSelector();
        if (selector) {
          if (!selectors.has(selector)) {
            selectors.add(selector);
            data.push({ component: c.component, selector, imports: [dirname(file) + "/" + c.getDefaultModuleName()] });
          } else {
            data.forEach(d => {
              if (d.selector === selector) {
                d.imports.push(dirname(file) + "/" + c.getDefaultModuleName());
              }
            });
          }
        }
      });
    }
  });
  return data;
}

export async function getLocalTags() {
  const data = [];
  const files = await getLocalComponentsFiles();
  await createProgressBar("Indexing Local Components", async () => {
    for (const file of files) {
      const components = await parseLocalComponents(file);
      components.forEach(c => {
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

export function createTagsProvider(data: ExtensionData) {
  return vscode.languages.registerCompletionItemProvider(
    "html",
    {
      provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
        const packagesTags = data.packagesTags.map(t => t.selector);
        const tags = [...packagesTags, ...data.localTags];

        // get line last char
        const prevChar = document.lineAt(position.line).text.charAt(position.character - 1);

        // if last character is "<" then no need to add "<" to the tag
        const prefix = prevChar === "<" ? "" : "<";
        return tags.map(tag => {
          const completionItem = new vscode.CompletionItem(tag, vscode.CompletionItemKind.Snippet);
          completionItem.insertText = new vscode.SnippetString(`${prefix}${tag}>$1</${tag}>`);
          return completionItem;
        });
      },
    },
    "<"
  );
}
