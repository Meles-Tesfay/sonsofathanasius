/**
 * Scripture Citation Parser & Extractor
 * Enforces TipTap citation node standards and extracts distinct scripture references
 * with strict biblical book canon validation for the Ethiopian Orthodox Tewahedo Church
 * (EOTC 81-Book Canon) alongside standard English and Afaan Oromoo translations.
 *
 * Standard Format: <span class="scripture-citation" data-ref="ዮሐ 5:31">[ዮሐ 5:31]</span>
 * (data-ref has NO brackets; display text HAS brackets).
 */

import { normalizeAmharic } from './amharicNormalizer.js';

// ── Single-Volume Canonical Biblical Books ──────────────────────────────
const SINGLE_VOLUME_BOOKS = [
  // ── Old Testament & Deuterocanonical (Ethiopic / Amharic / Tigrigna) ──
  'ዘፍጥረት', 'ዘፍ', 'ዘጸአት', 'ዘጸ', 'ዘሌዋውያን', 'ዘሌ', 'ዘኍልቁ', 'ዘሁልቁ', 'ዘኍ', 'ዘሁ',
  'ዘዳግም', 'ዘዳ', 'ኢያሱ', 'ኢያ', 'መሳፍንት', 'መሳ', 'ሩት', 'ዕዝራ', 'ዕዝ', 'ዕዝራ ሱቱኤል',
  'ነህምያ', 'ነህ', 'ጦቢት', 'ጦቢ', 'ዮዲት', 'ዮዲ', 'አስቴር', 'አስ', 'ኢዮብ', 'ኢዮ',
  'መዝሙረ ዳዊት', 'መዝሙር', 'መዝ', 'ምሳሌ', 'ምሳ', 'ተግሣጽ', 'ተግሳጽ', 'ተግ', 'መክብብ', 'መክ',
  'መኃልየ መኃልይ', 'መኃልይ', 'መኃ', 'መሀ', 'ጥበበ ሰሎሞን', 'ጥበብ', 'ጥበ', 'ሲራክ', 'ሲራ',
  'ኢሳይያስ', 'ኢሳ', 'ኤርምያስ', 'ኤር', 'ሰቆቃወ ኤርምያስ', 'ሰቆቃው', 'ሰቆ', 'ባሮክ', 'ባሮ',
  'ሕዝቅኤል', 'ህዝቅኤል', 'ሕዝ', 'ህዝ', 'ዳንኤል', 'ዳን', 'ሆሴዕ', 'ሆሴ', 'አሞጽ', 'አሞ',
  'ሚክያስ', 'ሚክ', 'ኢዩኤል', 'ኢዩ', 'አብድዩ', 'አብ', 'ዮናስ', 'ዮና', 'ናሆም', 'ናሆ',
  'ዕንባቆም', 'እንባቆም', 'ዕን', 'እን', 'ሶፎንያስ', 'ሶፎ', 'ሐጌ', 'ሀጌ', 'ዘካርያስ', 'ዘካ',
  'ሚልክያስ', 'ሚል', 'ኩፋሌ', 'ኩፋ', 'ሔኖክ', 'ሄኖክ', 'ሔኖ', 'ሄኖ', 'ዜና አይሁድ',

  // ── New Testament (Ethiopic / Amharic / Tigrigna) ─────────────────────
  'ማቴዎስ', 'ማቴ', 'ማርቆስ', 'ማር', 'ሉቃስ', 'ሉቃ', 'የሐዋርያት ሥራ', 'የሐዋርያት', 'ሐዋርያት', 'ሐዋ', 'ሀዋ',
  'ሮሜ', 'ገላትያ', 'ገላ', 'ኤፌሶን', 'ኤፌ', 'ፊልጵስዩስ', 'ፊል', 'ቆላስይስ', 'ቆላ',
  'ቲቶ', 'ፊልሞና', 'ፊልሞ', 'ዕብራውያን', 'እብራውያን', 'ዕብ', 'እብ', 'ያዕቆብ', 'ያእቆብ', 'ያዕ', 'ያእ',
  'ይሁዳ', 'ይሁ', 'የዮሐንስ ራእይ', 'ዮሐንስ ራእይ', 'ራእይ', 'ራእ',
  // Church Order Books
  'ሲኖዶስ', 'መጽሐፈ ኪዳን', 'ቀለሜንጦስ', 'ዲድስቅልያ',

  // ── English Books & Abbreviations ──────────────────────────────────────
  'genesis', 'gen', 'gn', 'exodus', 'exod', 'ex', 'leviticus', 'lev', 'lv', 'numbers', 'num', 'nm',
  'deuteronomy', 'deut', 'dt', 'joshua', 'josh', 'jos', 'judges', 'judg', 'jdg', 'ruth', 'ru', 'rut',
  'ezra', 'ezr', 'nehemiah', 'neh', 'ne', 'esther', 'esth', 'es', 'job', 'jb',
  'psalms', 'psalm', 'ps', 'psa', 'proverbs', 'prov', 'prv', 'ecclesiastes', 'eccl', 'ecc', 'ec',
  'song of solomon', 'song of songs', 'song', 'sos', 'canticle of canticles',
  'isaiah', 'isa', 'is', 'jeremiah', 'jer', 'je', 'lamentations', 'lam', 'la',
  'ezekiel', 'ezek', 'eze', 'daniel', 'dan', 'da', 'hosea', 'hos', 'ho',
  'joel', 'jl', 'joe', 'amos', 'am', 'obadiah', 'obad', 'ob', 'jonah', 'jon', 'jnh',
  'micah', 'mic', 'mc', 'nahum', 'nah', 'na', 'habakkuk', 'hab', 'hb',
  'zephaniah', 'zeph', 'zep', 'haggai', 'hag', 'hg', 'zechariah', 'zech', 'zec', 'malachi', 'mal', 'ml',
  // Deuterocanonical / Apocrypha
  'tobit', 'tob', 'tb', 'judith', 'jdt', 'jth', 'wisdom', 'wis', 'sirach', 'sir', 'ecclesiasticus',
  'baruch', 'bar', 'enoch', 'jubilees',
  // NT
  'matthew', 'matt', 'mt', 'mark', 'mk', 'mrk', 'luke', 'luk', 'lk',
  'acts', 'act', 'romans', 'rom', 'ro', 'rm',
  'galatians', 'gal', 'ga', 'ephesians', 'eph', 'ep', 'philippians', 'phil', 'php',
  'colossians', 'col', 'cl', 'titus', 'tit', 'ti', 'philemon', 'phlm', 'phm',
  'hebrews', 'heb', 'he', 'james', 'jas', 'jm', 'jude', 'jud', 'jd',
  'revelation', 'rev', 're', 'apocalypse',

  // ── Afaan Oromoo Books & Abbreviations ─────────────────────────────────
  'umaama', 'uma', 'ba\'uu', 'baa', 'seera lewwootaa', 'lew', 'lakkoobsa', 'lak',
  'seera keessa deebii', 'kes', 'iyaasuu', 'iya', 'abboota firdii', 'abo', 'ruut', 'rut',
  'izraa', 'izr', 'nahimiyaa', 'nah', 'asteer', 'ast', 'iyoob', 'iyo',
  'faarfannaa', 'far', 'fakkii', 'fak', 'lallabaa', 'lal', 'weedduu weedduu caalu', 'wee',
  'isaayyaas', 'isa', 'ermiyaas', 'er', 'faaruu ermiyaas', 'faer', 'hizqi\'eel', 'his',
  'daani\'el', 'dan', 'hoose\'aa', 'hos', 'yow\'el', 'yow', 'amoos', 'amo', 'obaadiyaa', 'oba',
  'yonaas', 'yon', 'miikiyaas', 'mik', 'naahom', 'nah', 'inbaaqom', 'inb', 'sefaaniyaa', 'sef',
  'haagee', 'hag', 'zakaariyaas', 'zak', 'milkiyaas', 'mil',
  'maatewos', 'mat', 'marqos', 'mar', 'luqaas', 'luq', 'yohaannis', 'yoh',
  'hojii ergamootaa', 'hod', 'roomaa', 'rom', 'galaatiyaa', 'gal', 'efesoon', 'efe',
  'filiphisiyus', 'fil', 'qolosaayis', 'qol', 'tiitoo', 'tit', 'filemoonaa', 'fil',
  'ibroota', 'ibr', 'yaaqob', 'yaq', 'yihudaa', 'yuh', 'mul\'ata', 'mul'
];

// ── Multi-Volume Books (Accepts prefixes: 1, 2, 3, I, II, III, ፩, ፪, ፫) ─
const MULTI_VOLUME_BOOKS = [
  // Ethiopic
  'ሳሙኤል', 'ሳሙ',
  'ነገሥት', 'ነገ',
  'ዜና መዋዕል', 'ዜና',
  'መቃብያን', 'መቃ',
  'ቆሮንቶስ', 'ቆሮ',
  'ተሰሎንቄ', 'ተሰ',
  'ጢሞቴዎስ', 'ጢሞ',
  'ጴጥሮስ', 'ጴጥ',
  'ዮሐንስ', 'ዮሐ', 'ዮሀ',
  'ዕዝራ', 'ዕዝ', // 1 & 2 ዕዝራ

  // English
  'samuel', 'sam',
  'kings', 'kgs', 'kg',
  'chronicles', 'chr', 'chron',
  'maccabees', 'macc', 'mac',
  'corinthians', 'cor',
  'thessalonians', 'thess', 'thes',
  'timothy', 'tim',
  'peter', 'pet', 'pe',
  'john', 'jn', 'jhn',
  'ezra', 'ezr',

  // Afaan Oromoo
  'saamu\'eel', 'sam',
  'moototaa', 'mot',
  'seenaa baraa', 'sen',
  'qorontos', 'qor',
  'tesaloniiqee', 'tes',
  'ximotewos', 'tim',
  'pheexros', 'phe',
  'yohaannis', 'yoh'
];

/**
 * Clean canonical normalization helper:
 * Applies Amharic phonetic normalization and trims spaces/accents.
 */
function normalizeBookStem(name: string): string {
  return normalizeAmharic(name.trim().toLowerCase().normalize('NFC'));
}

const SINGLE_VOLUME_SET = new Set(SINGLE_VOLUME_BOOKS.map(normalizeBookStem));
const MULTI_VOLUME_SET = new Set(MULTI_VOLUME_BOOKS.map(normalizeBookStem));

// Order-insensitive match for existing TipTap citation spans:
// Matches <span ...> where attributes contain both scripture-citation class and data-ref in ANY order
const CITATION_SPAN_REGEX = /<span\b(?=[^>]*\bclass=["'][^"']*\bscripture-citation\b)(?=[^>]*\bdata-ref=["']([^"']+)["'])[^>]*>([\s\S]*?)<\/span>/gi;

// Matches bracketed candidates [word(s) num:num]: [ዮሐ 5:31], [1 ቆሮ 15:3-4], [John 3:16]
const BRACKETED_CANDIDATE_REGEX = /\[\s*([0-9\u1200-\u137F\w\s.'’]+?\s+[0-9\u1369-\u137C]+[:፡][0-9\u1369-\u137C]+(?:[-–][0-9\u1369-\u137C]+)?)\s*\]/g;

/**
 * Validates whether a bracketed reference candidate begins with a recognized canonical biblical book
 */
export function isValidScriptureReference(refContent: string): boolean {
  if (!refContent || typeof refContent !== 'string') {
    return false;
  }

  const cleaned = refContent.trim().replace(/^\[\s*/, '').replace(/\s*\]$/, '').trim();

  // Find where the chapter number starts (last word before number is the book name)
  const numberMatch = cleaned.match(/\s+([0-9\u1369-\u137C]+)[:፡]/);
  if (!numberMatch || numberMatch.index === undefined) {
    return false;
  }

  let rawBook = cleaned.slice(0, numberMatch.index).trim();
  if (!rawBook) return false;

  // 1. Check for volume prefix: 1, 2, 3, III, II, I, ፩, ፪, ፫
  // Note: Roman numerals & numbers must only match multi-volume books (e.g. "I Kings", "1 ቆሮ").
  // If the stem is not in MULTI_VOLUME_SET, we fall through to check full single/multi book stems
  // (preventing bare "I" lookahead from eating single-volume words like "Isaiah", "Isa", "Is", "Izraa").
  const prefixMatch = rawBook.match(/^(1|2|3|III|II|I|፩|፪|፫)(?:\s+|(?=[^\s\d]))/i);
  if (prefixMatch) {
    const multiStem = normalizeBookStem(rawBook.slice(prefixMatch[0].length));
    if (multiStem && MULTI_VOLUME_SET.has(multiStem)) {
      return true;
    }
  }

  // 2. Fall through: check full word against single-volume or multi-volume sets
  // (handles Isaiah, Isa, Is, Izraa, or full un-prefixed names)
  const fullStem = normalizeBookStem(rawBook);
  return SINGLE_VOLUME_SET.has(fullStem) || MULTI_VOLUME_SET.has(fullStem);
}

/**
 * Normalizes a scripture reference to clean canonical format WITHOUT brackets
 * e.g. " [  ዮሐ 5:31  ] " -> "ዮሐ 5:31"
 */
export function normalizeScriptureRef(ref: string): string {
  if (!ref) return '';
  const trimmed = ref.trim().replace(/^\[\s*/, '').replace(/\s*\]$/, '').trim();
  return trimmed.replace(/\s+/g, ' ').normalize('NFC');
}

/**
 * Formats a standardized TipTap Scripture Citation HTML span node
 * data-ref contains NO brackets; display text contains brackets.
 * e.g. <span class="scripture-citation" data-ref="ዮሐ 5:31">[ዮሐ 5:31]</span>
 */
export function formatScriptureCitationSpan(ref: string, displayText?: string): string {
  const normalizedRef = normalizeScriptureRef(ref);
  const text = displayText ? displayText.trim().normalize('NFC') : `[${normalizedRef}]`;
  return `<span class="scripture-citation" data-ref="${normalizedRef}">${text}</span>`;
}

/**
 * Extracts all distinct, normalized scripture references from HTML content or text
 * Returns unique unbracketed canonical references, e.g. ["ዮሐ 1:1", "1 ቆሮ 15:3-4"]
 */
export function extractScriptureCitations(content: string): string[] {
  if (!content || typeof content !== 'string') {
    return [];
  }

  const citationsSet = new Set<string>();

  // 1. Extract from existing <span ... data-ref="..." ...> nodes (order-insensitive)
  let spanMatch: RegExpExecArray | null;
  const spanRegex = new RegExp(CITATION_SPAN_REGEX.source, 'gi');
  while ((spanMatch = spanRegex.exec(content)) !== null) {
    const rawRef = spanMatch[1];
    if (rawRef) {
      const normalized = normalizeScriptureRef(rawRef);
      if (isValidScriptureReference(normalized)) {
        citationsSet.add(normalized);
      }
    }
  }

  // 2. Extract from raw bracketed references [ዮሐ 5:31], [John 3:16]
  let bracketMatch: RegExpExecArray | null;
  const bracketRegex = new RegExp(BRACKETED_CANDIDATE_REGEX.source, 'g');
  while ((bracketMatch = bracketRegex.exec(content)) !== null) {
    const candidate = bracketMatch[1];
    if (candidate && isValidScriptureReference(candidate)) {
      citationsSet.add(normalizeScriptureRef(candidate));
    }
  }

  return Array.from(citationsSet);
}

/**
 * Safely auto-wraps raw bracketed scripture citations in HTML text nodes.
 *
 * Guarantees:
 * 1. Only validates against canonical biblical book names (no false positives on [appendix 5:3]).
 * 2. Attribute-safe: Never wraps inside HTML tag definitions (<p title="[ዮሐ 5:31]"> is untouched).
 * 3. Idempotent: Existing <span class="scripture-citation"> nodes are preserved without double-wrapping.
 */
export function autoWrapScriptureCitations(html: string): string {
  if (!html || typeof html !== 'string') {
    return '';
  }

  // 1. Protect existing citation spans with placeholders (order-insensitive)
  const placeholders: string[] = [];
  let placeholderIndex = 0;

  let protectedHtml = html.replace(CITATION_SPAN_REGEX, (fullSpan) => {
    const placeholder = `___CITATION_SPAN_PROTECTED_${placeholderIndex++}___`;
    placeholders.push(fullSpan);
    return placeholder;
  });

  // 2. Parse into tags and text nodes: split on HTML tags
  const parts = protectedHtml.split(/(<[^>]+>)/g);

  for (let i = 0; i < parts.length; i++) {
    // Even indices are text nodes outside any HTML tags
    if (i % 2 === 0 && parts[i]) {
      parts[i] = parts[i].replace(BRACKETED_CANDIDATE_REGEX, (fullMatch, candidate) => {
        if (isValidScriptureReference(candidate)) {
          return formatScriptureCitationSpan(candidate);
        }
        return fullMatch;
      });
    }
  }

  let result = parts.join('');

  // 3. Restore protected placeholders
  for (let i = 0; i < placeholders.length; i++) {
    result = result.replace(`___CITATION_SPAN_PROTECTED_${i}___`, placeholders[i]);
  }

  return result;
}
