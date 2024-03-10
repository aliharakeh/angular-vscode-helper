import { commaSplit } from "./string";
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

export function parseObject(input: string, inputCleaner?: (s: string) => string) {
  if (!input || !isParsableObject(input)) return {};
  const res = {};
  let cleanedInput = input;
  if (inputCleaner) {
    cleanedInput = inputCleaner(cleanedInput);
  }
  // remove last `,` before object end
  cleanedInput = cleanedInput.replace(/,\s+}/g, " }");
  // remove object symbols
  if (cleanedInput.startsWith("{") && cleanedInput.endsWith("}")) {
    cleanedInput = cleanedInput.slice(1, -1);
  }
  const pairs = commaSplit(cleanedInput);
  pairs.forEach(p => {
    const [key, value] = p.split(":").map(s => s.trim());
    const parsedKey = parseString(key);
    if (parsedKey) {
      let parsedValue: any;
      if (isParsableArray(value)) {
        parsedValue = parseArray(value);
      } else if (isParsableObject(value)) {
        parsedValue = parseObject(value, inputCleaner);
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
  return [...matches].filter(Boolean).map(m => m.slice(1));
}

export function getPatternMatch(input: string, pattern: RegExp) {
  return pattern.exec(input)?.slice(1);
}
