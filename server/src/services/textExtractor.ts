/**
 * HTML-to-Plain-Text Search Extractor
 * Extracts clean, normalized plain text from HTML content for MiniSearch indexing
 * and MariaDB body_searchable (MEDIUMTEXT).
 */

const HTML_ENTITY_MAP: Record<string, string> = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&mdash;': '—',
  '&ndash;': '–',
  '&hellip;': '…',
  '&laquo;': '«',
  '&raquo;': '»',
  '&bull;': '•',
};

/**
 * Decodes standard and numeric HTML entities into UTF-8 characters
 */
export function decodeHtmlEntities(text: string): string {
  if (!text) return '';

  // Named entities
  let decoded = text.replace(/&(nbsp|amp|lt|gt|quot|apos|mdash|ndash|hellip|laquo|raquo|bull);/gi, (match) => {
    return HTML_ENTITY_MAP[match.toLowerCase()] ?? match;
  });

  // Decimal numeric entities: &#123;
  decoded = decoded.replace(/&#(\d+);/g, (_, dec) => {
    try {
      return String.fromCharCode(parseInt(dec, 10));
    } catch {
      return '';
    }
  });

  // Hexadecimal numeric entities: &#x1f600;
  decoded = decoded.replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
    try {
      return String.fromCodePoint(parseInt(hex, 16));
    } catch {
      return '';
    }
  });

  return decoded;
}

/**
 * Strips HTML tags and extracts normalized plain text for search indexing
 */
export function extractPlainTextFromHtml(html: string): string {
  if (!html || typeof html !== 'string') {
    return '';
  }

  // 1. Remove comments
  let text = html.replace(/<!--[\s\S]*?-->/g, ' ');

  // 2. Remove script and style tags and their contents
  text = text.replace(/<(script|style|svg|noscript)[^>]*>[\s\S]*?<\/\1>/gi, ' ');

  // 3. Add spacing around block-level elements so words don't get glued together
  text = text.replace(/<\/(p|div|h[1-6]|li|blockquote|pre|tr|th|td|section|article)>/gi, ' ');
  text = text.replace(/<(br|hr)\s*\/?>/gi, ' ');

  // 4. Remove all remaining HTML tags
  text = text.replace(/<[^>]+>/g, ' ');

  // 5. Decode HTML entities
  text = decodeHtmlEntities(text);

  // 6. Unicode NFC Normalization
  text = text.normalize('NFC');

  // 7. Collapse multiple spaces and trim
  text = text.replace(/\s+/g, ' ').trim();

  return text;
}
