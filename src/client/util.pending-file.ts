let pendingFile: File | null = null;

export function setPendingFile(file: File): void {
  pendingFile = file;
}

export function getPendingFile(): File | null {
  return pendingFile;
}

export function clearPendingFile(): void {
  pendingFile = null;
}
