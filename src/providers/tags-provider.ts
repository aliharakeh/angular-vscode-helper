import { glob } from "glob";
import { join } from "path";
import * as vscode from "vscode";
import {
  ComponentAndDirective,
  extractLocalComponents,
  extractPackageComponents,
} from "../entities/component-and-directive";
import { createProgressBar, getCurrentOpenedFolder } from "../utils/extension";
import { exists, getFiles } from "../utils/files";

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
        const tags = [...data.packagesTags, ...data.localTags].map(c => c.getComponentSelector());

        // get last char in current line
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
