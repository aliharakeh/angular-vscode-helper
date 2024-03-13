import { glob } from "glob";
import { basename, dirname, join } from "path";
import * as vscode from "vscode";
import { ComponentAndDirective, extractLocalComponents, extractPackageComponents } from "./component-and-directive";
import { createProgressBar, getCurrentOpenedFolder } from "./utils/extension";
import { ComponentFile, buildDirectoryTree, exists, getFiles } from "./utils/files";

////////////////////////////////////////////////////////////////////////////////
//
// Get the file paths containing the components
//
///////////////////////////////////////////////////////////////////////////////

export async function getPackagesTypeFiles(paths: string[]) {
  const nodeModules = join(getCurrentOpenedFolder(), "node_modules");
  const typeFiles: ComponentFile[] = [];
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
  const modulesFilesMap = (await getLocalFiles(`**/*.module.ts`)).reduce((acc, file) => {
    acc[dirname(file)] = file;
    return acc;
  }, {});

  const componentFiles = (await getLocalFiles(`**/*.component.ts`)).map(file => {
    const dir = dirname(file);
    let nearestModule = modulesFilesMap[dir];
    let parentDir = dirname(dir);
    while (!nearestModule) {
      nearestModule = modulesFilesMap[parentDir];
      parentDir = dirname(dir);
      if (!parentDir) {
        break;
      }
    }
    return {
      path: file,
      name: basename(file),
      directory: dir,
      modulePath: nearestModule,
    };
  });
  return componentFiles;
}

export function getLocalFiles(globPattern: string) {
  return glob(globPattern, {
    cwd: getCurrentOpenedFolder(),
    ignore: ["**/node_modules/**", "**/dist/**", "**/out/**", "**/.git/**"],
  });
}

////////////////////////////////////////////////////////////////////////////////
//
// Get Tags
//
////////////////////////////////////////////////////////////////////////////////

export async function getPackagesTags(paths: string[]) {
  const data: ComponentAndDirective[] = [];
  await createProgressBar("Indexing UI Packages Components", async () => {
    const files = await getPackagesTypeFiles(paths);
    for (const file of files) {
      const components = await extractPackageComponents(file);
      data.push(...components.filter(c => c.getComponentSelector()));
    }
  });
  return data;
}

export async function getLocalTags() {
  const data = [];
  await createProgressBar("Indexing Local Components", async () => {
    const files = await getLocalComponentsFiles();
    for (const file of files) {
      const components = await extractLocalComponents(file);
      data.push(...components.filter(c => c.getComponentSelector()));
    }
  });
  return data;
}

////////////////////////////////////////////////////////////////////////////////
//
// Create Extension Tag Provider
//
////////////////////////////////////////////////////////////////////////////////
export type ExtensionData = {
  packagesTags: ComponentAndDirective[];
  localTags: ComponentAndDirective[];
};

export function createTagsProvider(data: ExtensionData) {
  return vscode.languages.registerCompletionItemProvider(
    "html",
    {
      provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
        const components = [...data.packagesTags, ...data.localTags];

        // get last char in current line
        const prevChar = document.lineAt(position.line).text.charAt(position.character - 1);

        // if last character is "<" then no need to add "<" to the tag
        const prefix = prevChar === "<" ? "" : "<";
        return components.map(c => {
          const selector = c.getComponentSelector();
          const label = `${selector} (${c.importPath})`;
          const completionItem = new vscode.CompletionItem(label, vscode.CompletionItemKind.Snippet);
          completionItem.insertText = new vscode.SnippetString(`${prefix}${selector}>$1</${selector}>`);
          return completionItem;
        });
      },
    },
    "<"
  );
}
