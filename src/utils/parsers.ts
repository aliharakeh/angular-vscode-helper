import { isParsableArray, isParsableObject, isParsableString } from "./validation";

export function parseString(input: string) {
  if (!input) return "";
  const trimmed = input.trim();
  // remove quotes
  if (isParsableString(trimmed)) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

export function parseArray(input: string) {
  if (!input || !isParsableArray(input)) return [];
  return input
    .slice(1, -1) // remove []
    .split(",")
    .map(s => s.trim());
}

export function parseObject(input: string, separator = ";") {
  if (!input || !isParsableObject(input)) return {};
  const res = {};
  const cleanedInput = input.replaceAll(separator, ",").replace(/,\s+}/g, " }").slice(1, -1); // remove last `,` before object end
  const pairs = cleanedInput.split(separator);
  pairs.forEach(p => {
    const [key, value] = p.split(":").map(s => s.trim());
    const parsedKey = parseString(key);
    if (parsedKey) {
      let parsedValue: any;
      if (isParsableArray(value)) {
        parsedValue = parseArray(value);
      } else if (isParsableObject(value)) {
        parsedValue = parseObject(value);
      } else {
        parsedValue = parseString(value);
      }
      res[parsedKey] = parsedValue;
    }
  });
  return res;
}

export function parseAny(input: string) {
  if (!input) return "";
  switch (true) {
    case isParsableObject(input):
      return parseObject(input);
    case isParsableArray(input):
      return parseArray(input);
    default:
      return parseString(input);
  }
}

export function getPatternMatches(input: string, pattern: RegExp) {
  const matches = input.matchAll(pattern);
  return [...matches].filter(Boolean).map(m => m[1]);
}

export function getPatternMatch(input: string, pattern: RegExp) {
  return pattern.exec(input)?.[1];
}
