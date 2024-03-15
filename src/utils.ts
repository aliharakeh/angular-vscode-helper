import { opendir, stat } from "fs/promises";

////////////////////////////////////////////////////////////////////////////////
//
// Arrays
//
////////////////////////////////////////////////////////////////////////////////

export function fillEmptyData(data: string[], length: number) {
  return Array.from({ length }, (_, i) => (i < data.length ? data[i].trim() : null));
}

////////////////////////////////////////////////////////////////////////////////
//
// Strings
//
////////////////////////////////////////////////////////////////////////////////

const SYMBOLS = {
  "{": "}",
  "[": "]",
  "<": ">",
};

export function commaSplit(content: string) {
  const stack = [];
  const data = [];
  let currentPosition = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content[i];

    // add the current character to the stack if it is an opening symbol
    if (SYMBOLS[char] || (char === '"' && stack[stack.length - 1] !== '"')) {
      stack.push(char);
    }
    // remove the last element from the stack if the current character is the closing symbol of the last element
    else if (SYMBOLS[stack[stack.length - 1]] === char || (char === '"' && stack[stack.length - 1] === '"')) {
      stack.pop();
    }

    // if the current character is a comma and the stack is empty, then split the content
    if (char === "," && stack.length === 0) {
      data.push(content.slice(currentPosition, i));
      currentPosition = i + 1;
    } else if (i === content.length - 1) {
      data.push(content.slice(currentPosition));
    }
  }

  return data;
}

////////////////////////////////////////////////////////////////////////////////
//
// Files
//
////////////////////////////////////////////////////////////////////////////////

export type ComponentFile = {
  path: string;
  name: string;
  directory: string;
  modulePath?: string;
};

export async function getFiles(path: string, filter: (filename: string) => boolean = () => true) {
  const files: ComponentFile[] = [];
  const entries = await opendir(path);
  for await (const entry of entries) {
    if (entry.isFile() && filter(entry.name)) {
      files.push({
        path: entry.path,
        name: entry.name,
        directory: path,
        modulePath: path,
      });
    } else if (entry.isDirectory()) {
      files.push(...(await getFiles(entry.path, filter)));
    }
  }
  return files;
}

export function exists(path: string) {
  return stat(path)
    .then(() => true)
    .catch(() => false);
}

export function buildDirectoryTree(files) {
  const tree = {};
  files.forEach(file => {
    const parts = file.split(/[\\/]/);
    let currentLevel = tree;
    parts.forEach((part, index) => {
      if (index === parts.length - 1) {
        // If it's the last part, it's a file, so we add it to the current level
        currentLevel[part] = true;
      } else {
        // If it's not the last part, it's a directory, so we ensure it exists in the tree
        currentLevel[part] = currentLevel[part] || {};
        currentLevel = currentLevel[part];
      }
    });
  });
  return tree;
}

////////////////////////////////////////////////////////////////////////////////
//
// Parsers
//
////////////////////////////////////////////////////////////////////////////////

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

////////////////////////////////////////////////////////////////////////////////
//
// Validation
//
////////////////////////////////////////////////////////////////////////////////

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

////////////////////////////////////////////////////////////////////////////////
//
// Helpers
//
////////////////////////////////////////////////////////////////////////////////
export function debounce(func, timeout = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      func(...args);
    }, timeout);
  };
}
