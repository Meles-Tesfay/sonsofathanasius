/**
 * Scripture Citation Parser & Extractor
 * Enforces TipTap citation node standards and extracts distinct scripture references
 * for cross-indexing, search, and frontend tooltip interactions.
 */

// Matches TipTap scripture citation nodes: <span ... data-ref="..." ...>...</span>
const CITATION_SPAN_REGEX = /<span\b[^>]*\bclass=["'][^"']*\bscripture-citation\b[^"']*["'][^>]*\bdata-ref=["']([^"']+)["'][^>]*>([\s\S]*?)<\/span>/gi;

// Matches bracketed scripture citations: [ዮሐ 5:31], [1 ቆሮ 15:3-4], [John 3:16], [Rom 8:28]
// Supports Ge'ez numbers and colons (፡) as well as Arabic numerals and standard colons (:)
const BRACKETED_SCRIPTURE_REGEX = /\[\s*([0-9\u1200-\u137F\w\s]+?\s+[0-9\u1369-\u137C]+[:፡][0-9\u1369-\u137C]+(?:[-–][0-9\u1369-\u137C]+)?)\s*\]/g;

/**
 * Normalizes a scripture reference string (cleans brackets, whitespace, and NFC normalization)
 * e.g. " [  ዮሐ 5:31  ] " -> "[ዮሐ 5:31]"
 */
export function normalizeScriptureRef(ref: string): string {
  if (!ref) return '';
  const trimmed = ref.trim().replace(/^\[\s*/, '').replace(/\s*\]$/, '').trim();
  const cleaned = trimmed.replace(/\s+/g, ' ').normalize('NFC');
  return `[${cleaned}]`;
}

/**
 * Formats a standardized TipTap Scripture Citation HTML span node
 */
export function formatScriptureCitationSpan(ref: string, displayText?: string): string {
  const normalizedRef = normalizeScriptureRef(ref);
  const text = (displayText || normalizedRef).trim().normalize('NFC');
  return `<span class="scripture-citation" data-ref="${normalizedRef}">${text}</span>`;
}

/**
 * Extracts all distinct, normalized scripture references from HTML content or text
 * Returns an array of unique bracketed references, e.g. ["[ዮሐ 1:1]", "[ዮሐ 10:30]"]
 */
export function extractScriptureCitations(content: string): string[] {
  if (!content || typeof content !== 'string') {
    return [];
  }

  const citationsSet = new Set<string>();

  // 1. Extract from existing <span class="scripture-citation" data-ref="..."> nodes
  let spanMatch: RegExpExecArray | null;
  const spanRegex = new RegExp(CITATION_SPAN_REGEX.source, 'gi');
  while ((spanMatch = spanRegex.exec(content)) !== null) {
    const rawRef = spanMatch[1];
    if (rawRef) {
      citationsSet.add(normalizeScriptureRef(rawRef));
    }
  }

  // 2. Extract from raw bracketed references [ዮሐ 5:31], [John 3:16]
  let bracketMatch: RegExpExecArray | null;
  const bracketRegex = new RegExp(BRACKETED_SCRIPTURE_REGEX.source, 'g');
  while ((bracketMatch = bracketRegex.exec(content)) !== null) {
    const rawRef = bracketMatch[1];
    if (rawRef) {
      citationsSet.add(normalizeScriptureRef(rawRef));
    }
  }

  return Array.from(citationsSet);
}

/**
 * Auto-wraps raw bracketed scripture citations in HTML paragraphs with TipTap citation spans
 * Skips text that is already inside a <span class="scripture-citation"> node
 */
export function autoWrapScriptureCitations(html: string): string {
  if (!html || typeof html !== 'string') {
    return '';
  }

  // First replace existing spans with placeholders to avoid double-wrapping
  const placeholders: string[] = [];
  let placeholderIndex = 0;

  let transformed = html.replace(CITATION_SPAN_REGEX, (fullSpan) => {
    const placeholder = `___SCRIPTURE_SPAN_PLACEHOLDER_${placeholderIndex++}___`;
    placeholders.push(fullSpan);
    return placeholder;
  });

  // Now wrap raw bracketed citations
  transformed = transformed.replace(BRACKETED_SCRIPTURE_REGEX, (_, refContent) => {
    return formatScriptureCitationSpan(refContent);
  });

  // Restore placeholders
  for (let i = 0; i < placeholders.length; i++) {
    transformed = transformed.replace(`___SCRIPTURE_SPAN_PLACEHOLDER_${i}___`, placeholders[i]);
  }

  return transformed;
}
