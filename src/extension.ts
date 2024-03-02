import * as vscode from "vscode";
import {
  createTagsProvider,
  onDidChangeTextDocument,
  onDidCreateFiles,
  onDidChangeConfiguration,
  getLocalTags,
  getPackagesTags,
} from "./providers/tags-provider";
import { Env, EXTENSION_NAME } from "./env";

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
  const tags = {
    packagesTags: await getPackagesTags(config.get(Env("UIComponentsPaths"))),
    localTags: await getLocalTags(),
  };

  // Listen for configuration changes and update the tag list with the new packages ui components
  vscode.workspace.onDidChangeConfiguration(e => onDidChangeConfiguration(e, tags, config));

  // Listen for new component files and update the tag list with the new components
  vscode.workspace.onDidCreateFiles(e => onDidCreateFiles(e, tags));

  // Listen for component files change and update the tag list with any new component meta data
  vscode.workspace.onDidChangeTextDocument(e => onDidChangeTextDocument(e, tags));

  ////////////////////////////////////////////////////////////////////////////
  //
  // Providers
  //
  ////////////////////////////////////////////////////////////////////////////

  const tagsProvider = createTagsProvider(tags);
  context.subscriptions.push(tagsProvider);
}
