export function parseArray(s: string) {
  if (!s || !s.startsWith("[")) return [];
  return s
    .trim()
    .slice(1, -1)
    .split(",")
    .map(s => s.trim());
}

export function parseObject(s: string) {
  if (!s || !s.startsWith("{")) return {};
  return JSON.parse(
    s.trim().replaceAll(";", ",").replace(/,\s+}/g, " }") // remove last `,` before object end
  );
}

export function parseString(s: string) {
  if (!s) return "";
  const trimmed = s.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

export function parsePattern(content: string, pattern: RegExp) {
  const matches = content.matchAll(pattern);
  return [...matches].filter(Boolean).map(m => m[1]);
}

export function parseAny(content: string) {
  if (!content) return "";
  switch (true) {
    case content.startsWith("{"):
      return parseObject(content);
    case content.startsWith("["):
      return parseArray(content);
    default:
      return parseString(content);
  }
}
