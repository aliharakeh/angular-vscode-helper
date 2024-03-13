export function isParsableArray(input: string) {
  return input.startsWith("[") && input.endsWith("]");
}

export function isParsableObject(input: string) {
  return input.startsWith("{") && input.endsWith("}");
}

export function isParsableString(input: string) {
  return [`"`, `'`].some(q => input.startsWith(q) && input.endsWith(q));
}

export function isKebabCase(input: string) {
  return input.match(/^\w+?(-\w+?)*$/) !== null;
}