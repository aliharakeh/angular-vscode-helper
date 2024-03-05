export function fillEmptyData(data: string[], length: number) {
  return Array.from({ length }, (_, i) => (i < data.length ? data[i].trim() : null));
}
