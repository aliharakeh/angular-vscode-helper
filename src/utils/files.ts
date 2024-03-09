import { opendir, stat } from "fs/promises";

export async function getFiles(path: string, filter: (path: string) => boolean = () => true) {
  const files = [];
  const dirs = await opendir(path);
  for await (const dir of dirs) {
    const filePath = path + "/" + dir.name;
    if (dir.isFile() && filter(filePath)) {
      files.push(filePath);
    } else if (dir.isDirectory()) {
      files.push(...(await getFiles(filePath, filter)));
    }
  }
  return files;
}

export function exists(path: string) {
  return stat(path)
    .then(() => true)
    .catch(() => false);
}
