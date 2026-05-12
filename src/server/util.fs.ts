import { promises as fs } from "fs";

export async function fileExists(path: string): Promise<boolean> {
  return fs
    .access(path)
    .then(() => true)
    .catch(() => false);
}
