/**
 * Amharic & Ethiopic Phonetic Homophone Normalizer
 *
 * Canonical Character Maps:
 * - ሐ / ኀ  -->  ሀ     (and vowel orders: ሁ, ሂ, ሃ, ሄ, ህ, ሆ)
 * - ሠ       -->  ሰ     (and vowel orders: ሱ, ሲ, ሳ, ሴ, ስ, ሶ)
 * - ዐ       -->  አ     (and vowel orders: ኡ, ኢ, ኣ, ኤ, እ, ኦ)
 * - ፀ       -->  ጸ     (and vowel orders: ጹ, ጺ, ጻ, ጼ, ጽ, ጾ)
 *
 * Ethiopic Punctuation Normalization:
 * - ። (Arat Neteb / Period)
 * - ፣ (Netela Serez / Comma)
 * - ፤ (Dirib Serez / Semicolon)
 * - ፥ (Yekidme Serez / Colon)
 * - ፦ (Ankets / Paragraph)
 * - ፧ (Hulate Neteb)
 * - ፨ (Hidar Neteb)
 */

export function normalizeAmharic(text: string): string {
  if (!text) return '';

  return text
    // 1. ሐ / ኀ -> ሀ
    .replace(/[ሐኀ]/g, 'ሀ')
    .replace(/[ሑኁ]/g, 'ሁ')
    .replace(/[ሒኂ]/g, 'ሂ')
    .replace(/[ሓኃ]/g, 'ሃ')
    .replace(/[ሔኄ]/g, 'ሄ')
    .replace(/[ሕኅ]/g, 'ህ')
    .replace(/[ሖኆ]/g, 'ሆ')
    // 2. ሠ -> ሰ
    .replace(/ሠ/g, 'ሰ')
    .replace(/ሡ/g, 'ሱ')
    .replace(/ሢ/g, 'ሲ')
    .replace(/ሣ/g, 'ሳ')
    .replace(/ሤ/g, 'ሴ')
    .replace(/ሥ/g, 'ስ')
    .replace(/ሦ/g, 'ሶ')
    // 3. ዐ -> አ
    .replace(/ዐ/g, 'አ')
    .replace(/ዑ/g, 'ኡ')
    .replace(/ዒ/g, 'ኢ')
    .replace(/ዓ/g, 'ኣ')
    .replace(/ዔ/g, 'ኤ')
    .replace(/ዕ/g, 'እ')
    .replace(/ዖ/g, 'ኦ')
    // 4. ፀ -> ጸ
    .replace(/ፀ/g, 'ጸ')
    .replace(/ፁ/g, 'ጹ')
    .replace(/ፂ/g, 'ጺ')
    .replace(/ፃ/g, 'ጻ')
    .replace(/ፄ/g, 'ጼ')
    .replace(/ፅ/g, 'ጽ')
    .replace(/ፆ/g, 'ጾ')
    // 5. Ethiopic Punctuation to whitespace
    .replace(/[።፣፤፥፦፧፨]/g, ' ')
    // 6. Western Scripture & Syntax Delimiters to whitespace
    .replace(/[[\]():;,\-_/\\#]/g, ' ')
    // 7. Collapse multi-spaces
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Tokenize and normalize text for search indexing
 */
export function processSearchTerm(term: string): string {
  if (!term) return '';
  return normalizeAmharic(term.toLowerCase());
}
