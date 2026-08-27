export function compactText(text: string, max = 82) {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, Math.max(max - 3, 0)).trimEnd()}...`;
}
