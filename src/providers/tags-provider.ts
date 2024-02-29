import * as vscode from "vscode";
import { readFileSync } from "fs";
import { ComponentAndDirective } from "../entities/component-and-directive";
import { glob } from "glob";
import { get } from "http";
import { getCurrentOpenedFolder } from "../utils/extension";
import { join } from "path";

////////////////////////////////////////////////////////////////////////////////
//
// Get Component Type Files from node_modules
//
///////////////////////////////////////////////////////////////////

export async function getPackegesTypeFiles(paths: string[]) {
  const cwd = getCurrentOpenedFolder();
  const files: string[] = [];
  for (const path of paths) {
    const globFiles = await glob(getTypeFilesGlobPattern(path), {
      cwd,
      absolute: true,
    });
    files.push(...globFiles);
  }
  return files;
}

function getTypeFilesGlobPattern(path: string) {
  return `node_modules/${path}/**/*.d.ts`;
}

////////////////////////////////////////////////////////////////////////////////
//
// Parse Component Type Files
//
////////////////////////////////////////////////////////////////////////////////

const COMPONENT_PATTERN = /i0\.ɵɵComponentDeclaration<([\s\S]*?)>;/g;
// const DIRECTIVE_PATTERN = /i0\.ɵɵDirectiveDeclaration<([\s\S]*?)>;/g;

export class ComponentTypeParser {
  public components: ComponentAndDirective[] = [];

  constructor(public file: string) {
    const content = readFileSync(this.file, "utf8");
    this.components = this.parse(content, COMPONENT_PATTERN);
  }

  parse(content: string, pattern: RegExp) {
    const matches = this.getMatches(content, pattern);
    return matches.map((m) => new ComponentAndDirective(m));
  }

  getMatches(content: string, pattern: RegExp) {
    const matches = content.matchAll(pattern);
    return [...matches].filter(Boolean).map((m) => m[1]);
  }
}

////////////////////////////////////////////////////////////////////////////////
//
// Get Local Component Files
//
////////////////////////////////////////////////////////////////////////////////

export async function getLocalComponentsFiles() {
  return await glob("src/**/*.component.ts", {
    cwd: getCurrentOpenedFolder(),
    absolute: true,
  });
}

////////////////////////////////////////////////////////////////////////////////
//
// Parse Local Component Files
//
////////////////////////////////////////////////////////////////////////////////

export class LocalComponentParser {}

////////////////////////////////////////////////////////////////////////////////
//
// Get Tag List
//
////////////////////////////////////////////////////////////////////////////////

export function getTagList(paths: string[]) {
  const data = [];
  getPackegesTypeFiles(paths).then((files) => {
    for (const file of files) {
      const parser = new ComponentTypeParser(file);
      parser.components.forEach((c) => {
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
