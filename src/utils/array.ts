export function fillEmptyData(data: string[], length: number) {
  return Array.from({ length: 9 }, (_, i) => (i < data.length ? data[i].trim() : null));
}
