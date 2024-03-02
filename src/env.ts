export const EXTENSION_NAME = "angular-vscode-helper";

const KEYS = {
  UIComponentsPaths: "configuration.UIComponentsPaths",
} as const;

export function Env(key: keyof typeof KEYS, fullKey = false) {
  if (fullKey) {
    return `${EXTENSION_NAME}.${KEYS[key]}`;
  }
  return KEYS[key];
}
