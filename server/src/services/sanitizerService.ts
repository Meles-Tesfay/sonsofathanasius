import sanitizeHtml from 'sanitize-html';
import { extractPlainTextFromHtml } from './textExtractor.js';
import { extractScriptureCitations, autoWrapScriptureCitations } from './citationParser.js';

/**
 * Strict Sanitize-HTML Configuration for Orthodox Theological Rich-Text Articles (TipTap)
 * Per Decision D3 (FILE_STORAGE_PLAN.md): Covers-only storage policy.
 * Inline <img>, <figure>, and <figcaption> are disallowed.
 */
export const SANITIZER_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    // Headings
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    // Paragraphs & Structure
    'p',
    'blockquote',
    'pre',
    'code',
    'hr',
    'br',
    // Lists
    'ul',
    'ol',
    'li',
    // Inlines & Typography
    'strong',
    'b',
    'em',
    'i',
    'u',
    's',
    'span',
    'sub',
    'sup',
    // Links
    'a',
    // Tables
    'table',
    'thead',
    'tbody',
    'tr',
    'th',
    'td',
  ],

  allowedAttributes: {
    a: ['href', 'target', 'rel', 'name', 'title'],
    span: ['class', 'data-ref', 'data-type'],
    code: ['class'],
    pre: ['class'],
    blockquote: ['class'],
    th: ['colspan', 'rowspan', 'align', 'valign'],
    td: ['colspan', 'rowspan', 'align', 'valign'],
    p: ['title'],
  },

  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowedSchemesByTag: {
    a: ['http', 'https', 'mailto', 'tel'],
  },

  // Enforce security policies and link relations
  transformTags: {
    a: (tagName, attribs) => {
      const href = attribs.href || '';
      // Block any javascript: or data: URIs that might bypass scheme checks
      if (href.trim().toLowerCase().startsWith('javascript:') || href.trim().toLowerCase().startsWith('data:')) {
        return {
          tagName: 'span',
          attribs: {},
        };
      }

      // If opening in a new tab, enforce noopener noreferrer
      if (attribs.target === '_blank') {
        attribs.rel = 'noopener noreferrer';
      }

      return {
        tagName,
        attribs,
      };
    },

    span: (tagName, attribs) => {
      // Validate class for spans (only allow scripture-citation or safe typographic classes)
      const allowedClasses = ['scripture-citation', 'patristic-quote', 'theological-term', 'text-highlight'];
      if (attribs.class) {
        const classes = attribs.class.split(/\s+/).filter((c) => allowedClasses.includes(c));
        attribs.class = classes.join(' ');
      }
      return {
        tagName,
        attribs,
      };
    },
  },

  // Strip dangerous elements completely along with their inner text
  nonTextTags: ['script', 'style', 'textarea', 'option', 'noscript', 'iframe', 'object', 'embed', 'applet', 'form', 'img'],
};

/**
 * Sanitizes rich-text HTML string:
 * 1. Unicode NFC Normalization on raw input.
 * 2. Strict HTML Sanitization (XSS immunity & tag whitelisting).
 * 3. Safe, text-node-aware scripture citation wrapping on well-formed output.
 * 4. Final NFC Normalization on output.
 */
export function sanitizeArticleHtml(rawHtml: string): string {
  if (!rawHtml || typeof rawHtml !== 'string') {
    return '';
  }

  // 1. Unicode NFC Normalization on raw input
  const normalizedInput = rawHtml.normalize('NFC');

  // 2. Strict HTML Sanitization first (eliminates invalid markup, scripts, and ensures well-formed attributes)
  const cleaned = sanitizeHtml(normalizedInput, SANITIZER_OPTIONS);

  // 3. Auto-wrap verified canonical scripture citations on text nodes only
  const wrappedHtml = autoWrapScriptureCitations(cleaned);

  // 4. Final NFC Normalization on output
  return wrappedHtml.normalize('NFC').trim();
}

export interface ProcessedArticleContent {
  sanitizedHtml: string;
  bodySearchable: string;
  citations: string[];
}

/**
 * Unified Rich Text Processing Pipeline
 * Takes raw HTML input from Admin editor, seeder, or migration script and produces:
 * - `sanitizedHtml`: XSS-immune HTML for MariaDB `content_translations.body`
 * - `bodySearchable`: Clean plain text for MariaDB `content_translations.body_searchable` and MiniSearch
 * - `citations`: Unique canonical scripture references array (e.g. `["ዮሐ 5:31", "1 ቆሮ 15:3-4"]`)
 */
export function processArticleContent(rawHtml: string): ProcessedArticleContent {
  const sanitizedHtml = sanitizeArticleHtml(rawHtml);
  const bodySearchable = extractPlainTextFromHtml(sanitizedHtml);
  const citations = extractScriptureCitations(sanitizedHtml);

  return {
    sanitizedHtml,
    bodySearchable,
    citations,
  };
}
