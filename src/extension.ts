import * as vscode from "vscode";
import { createTagsProvider, getLocalTags, getPackagesTags } from "./providers/tags-provider";

export async function activate(context: vscode.ExtensionContext) {
  ////////////////////////////////////////////////////////////////////////////
  //
  // Configuration
  //
  ////////////////////////////////////////////////////////////////////////////

  const config = vscode.workspace.getConfiguration("angular-vscode-helper");

  ////////////////////////////////////////////////////////////////////////////
  //
  // Autocomplete Suggestions
  //
  ////////////////////////////////////////////////////////////////////////////

  // use an object to make it easy to keep the main reference when we change the inner tag lists later
  const tags = {
    packagesTags: await getPackagesTags(config.get("configuration.UIComponentsPaths")),
    localTags: await getLocalTags(),
  };

  // Listen for configuration changes and update the tag list with the new packages ui components
  vscode.workspace.onDidChangeConfiguration(async e => {
    if (e.affectsConfiguration("configuration.UIComponentsPaths")) {
      console.log("Configuration UIComponentsPaths updated");
      tags.packagesTags = await getPackagesTags(config.get("configuration.UIComponentsPaths"));
    }
  });

  // Listen for new component files and update the tag list with the new components
  vscode.workspace.onDidCreateFiles(async e => {
    if (e.files.some(f => f.fsPath.includes(".component.ts"))) {
      console.log("add component file");
      tags.localTags = await getLocalTags();
    }
  });

  // Listen for component files change and update the tag list with any new meta data
  vscode.workspace.onDidChangeTextDocument(async e => {
    if (e.document.fileName.includes(".component.ts")) {
      console.log("change component file");
      tags.localTags = await getLocalTags();
    }
  });

  ////////////////////////////////////////////////////////////////////////////
  //
  // Providers
  //
  ////////////////////////////////////////////////////////////////////////////

  const tagsProvider = createTagsProvider(tags);
  context.subscriptions.push(tagsProvider);
}
