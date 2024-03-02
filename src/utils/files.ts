import { opendir, stat } from "fs/promises";

export async function getFiles(path: string, endsWith?: string) {
  const files = [];
  const dirs = await opendir(path);
  for await (const dir of dirs) {
    const filePath = path + "/" + dir.name;
    const typeMatch = endsWith ? dir.name.endsWith(endsWith) : true;
    if (dir.isFile() && typeMatch) {
      files.push(filePath);
    } else if (dir.isDirectory()) {
      files.push(...(await getFiles(filePath, endsWith)));
    }
  }
  return files;
}

export function exists(path: string) {
  return stat(path)
    .then(() => true)
    .catch(() => false);
}
