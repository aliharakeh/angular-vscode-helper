import * as vscode from "vscode";
import { createTagsProvider, getTagList } from "./providers/tags-provider";

export function activate(context: vscode.ExtensionContext) {
  ////////////////////////////////////////////////////////////////////////////
  //
  // Configuration
  //
  ////////////////////////////////////////////////////////////////////////////

  const config = vscode.workspace.getConfiguration("angular-helper");
  const uiComponentsPaths = config.get(
    "configuration.UIComponentsPaths"
  ) as string[];

  ////////////////////////////////////////////////////////////////////////////
  //
  // Providers
  //
  ////////////////////////////////////////////////////////////////////////////

  const tagList = getTagList(uiComponentsPaths);
  const tagsProvider = createTagsProvider(tagList);
  context.subscriptions.push(tagsProvider);
}
