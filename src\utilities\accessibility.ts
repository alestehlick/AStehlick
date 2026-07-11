const romanNumerals = [
  "I",
  "II",
  "III",
  "IV",
  "V",
  "VI",
  "VII",
  "VIII",
  "IX",
  "X",
];

export function toRoman(value: number): string {
  return romanNumerals[value - 1] ?? String(value);
}

export function layerDescription(
  current: number,
  total: number,
  label: string,
): string {
  return `Layer ${current} of ${total}: ${label}`;
}
