import { opendir, stat } from "fs/promises";

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
