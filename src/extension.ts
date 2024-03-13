import * as vscode from "vscode";
import { ExtensionData, createTagsProvider, getLocalTags, getPackagesTags } from "./tags-provider";
import { Env, EXTENSION_NAME } from "./env";
import { onDidChangeConfiguration, onDidCreateFiles, onDidChangeTextDocument } from "./events";

export async function activate(context: vscode.ExtensionContext) {
  ////////////////////////////////////////////////////////////////////////////
  //
  // Configuration
  //
  ////////////////////////////////////////////////////////////////////////////

  const config = vscode.workspace.getConfiguration(EXTENSION_NAME);

  ////////////////////////////////////////////////////////////////////////////
  //
  // Autocomplete Suggestions
  //
  ////////////////////////////////////////////////////////////////////////////

  // use an object to make it easy to keep the main reference when we change the inner tag lists later
  const data: ExtensionData = {
    packagesTags: await getPackagesTags(config.get(Env("UIComponentsPaths"))),
    localTags: await getLocalTags(),
  };

  console.log(data);

  // Listen for configuration changes and update the tag list with the new packages ui components
  vscode.workspace.onDidChangeConfiguration(e => onDidChangeConfiguration(e, data, config));

  // Listen for new component files and update the tag list with the new components
  vscode.workspace.onDidCreateFiles(e => onDidCreateFiles(e, data));

  // Listen for component files change and update the tag list with any new component meta data
  vscode.workspace.onDidChangeTextDocument(e => onDidChangeTextDocument(e, data));

  ////////////////////////////////////////////////////////////////////////////
  //
  // Providers
  //
  ////////////////////////////////////////////////////////////////////////////

  const tagsProvider = createTagsProvider(data);
  context.subscriptions.push(tagsProvider);
}
