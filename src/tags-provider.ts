import { glob } from "glob";
import { basename, dirname, join } from "path";
import * as vscode from "vscode";
import { Commands } from "./commands";
import { AngularComponent, extractLocalComponents, extractPackageComponents } from "./components";
import { actionWithProgress, getCurrentWorkspace } from "./env";
import { ExtensionData } from "./types";
import { ComponentFile } from "./utils";

////////////////////////////////////////////////////////////////////////////////
//
// Get Tags
//
////////////////////////////////////////////////////////////////////////////////

/**
 * Extract Packages Components
 */
export async function getPackagesComponents(paths: string[], withProgress = true) {
  return await actionWithProgress<AngularComponent[]>({
    title: "Indexing UI Packages Components",
    show: withProgress,
    args: [paths],
    initialValue: [],
    action: _getPackagesComponents,
  });
}

/**
 * Extract Local Components
 */
export async function getLocalComponents(withProgress = true) {
  return await actionWithProgress<AngularComponent[]>({
    title: "Indexing Local Components",
    show: withProgress,
    initialValue: [],
    action: _getLocalComponents,
  });
}

/**
 * iterate all packages paths and extract component definitions from the `d.ts` type files
 */
async function _getPackagesComponents(paths: string[]) {
  const angularComponents: AngularComponent[] = [];
  const nodeModules = join(getCurrentWorkspace(), "node_modules");
  for (const path of paths) {
    const typeFiles = await glob(`**/*.d.ts`, {
      cwd: join(nodeModules, path),
    });
    for (const typeFile of typeFiles) {
      const dir = join(path, dirname(typeFile));
      const fileData: ComponentFile = {
        path: join(path, typeFile),
        name: basename(typeFile),
        directory: dir,
        modulePath: dir,
      };
      console.log("fileData", fileData);
      const fileComponents = await extractPackageComponents(fileData);
      angularComponents.push(...fileComponents.filter(c => c.getComponentSelector()));
    }
  }
  return angularComponents;
}

/**
 * iterate all local paths and extract component definitions from the `component.ts` files while also getting all
 * `module.ts` files to map each component to its nearest module where it is defined
 */
export async function _getLocalComponents() {
  const angularComponents = [];
  const files = await glob(`**/*.{component,module}.ts`, {
    cwd: getCurrentWorkspace(),
    ignore: ["**/node_modules/**", "**/dist/**", "**/out/**", "**/.git/**"],
  });
  const modulesFilesMap = files
    .filter(file => file.endsWith(".module.ts"))
    .reduce((acc, file) => {
      acc[dirname(file)] = file;
      return acc;
    }, {});
  const componentFiles = files.filter(file => file.endsWith(".component.ts"));
  for (const componentFile of componentFiles) {
    const dir = dirname(componentFile);
    let nearestModule = modulesFilesMap[dir];
    let parentDir = dirname(dir);
    while (!nearestModule) {
      nearestModule = modulesFilesMap[parentDir];
      parentDir = dirname(dir);
      // TODO: test
      if (!parentDir) {
        break;
      }
    }
    const fileData: ComponentFile = {
      path: componentFile,
      name: basename(componentFile),
      directory: dir,
      modulePath: nearestModule,
    };
    const components = await extractLocalComponents(fileData);
    angularComponents.push(...components.filter(c => c.getComponentSelector()));
  }
  return angularComponents;
}

////////////////////////////////////////////////////////////////////////////////
//
// Tags Completion Provider
//
////////////////////////////////////////////////////////////////////////////////

export function createTagsProvider(data: ExtensionData) {
  return vscode.languages.registerCompletionItemProvider(
    "html",
    {
      provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
        const components = [...data.packagesComponents, ...data.localComponents];

        // get last char in current line
        const prevChar = document.lineAt(position.line).text.charAt(position.character - 1);

        // if last character is "<" then no need to add "<" to the tag
        const prefix = prevChar === "<" ? "" : "<";
        return components.map(c => {
          const selector = c.getComponentSelector();
          const label = `${selector} (${c.importPath})`;
          const completionItem = new vscode.CompletionItem(label, vscode.CompletionItemKind.Snippet);
          completionItem.insertText = new vscode.SnippetString(`${prefix}${selector}>$1</${selector}>`);
          const command = Commands.ComponentImport;
          completionItem.command = {
            command: command.key,
            title: command.title,
            arguments: [c],
          };
          return completionItem;
        });
      },
    },
    "<"
  );
}
