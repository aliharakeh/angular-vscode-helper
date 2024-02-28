export function parseObject(s: string) {
  if (!s || !s.includes("{")) return {};
  return JSON.parse(
    s.replaceAll(";", ",").replace(/,\s+}/g, " }") // remove last , before object end
  );
}
