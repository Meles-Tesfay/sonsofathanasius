/**
 * Robust Multilingual Slug Generator
 * Supports Ethiopic / Ge'ez characters (\u1200-\u137F), Latin alphanumeric, and hyphens.
 */
export function generateSlug(text: string): string {
  if (!text || typeof text !== 'string') {
    return `item-${Date.now()}`;
  }

  // 1. Unicode NFC Normalization
  const normalized = text.normalize('NFC').trim();

  // 2. Convert spaces, underscores, and common punctuation to hyphens
  let slug = normalized
    .toLowerCase()
    .replace(/[\s_—–/\\.,;:!?()[\]{}'"`]+/g, '-')
    // 3. Remove characters that are NOT Latin alphanumeric, numbers, or Ethiopic Unicode block
    .replace(/[^\u1200-\u137Fa-z0-9-]/g, '')
    // 4. Collapse consecutive hyphens into a single hyphen
    .replace(/-+/g, '-')
    // 5. Trim leading and trailing hyphens
    .replace(/^-+|-+$/g, '');

  if (!slug) {
    return `item-${Date.now()}`;
  }

  return slug.slice(0, 250);
}
