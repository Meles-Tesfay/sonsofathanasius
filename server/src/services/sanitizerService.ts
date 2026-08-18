import sanitizeHtml from 'sanitize-html';
import { extractPlainTextFromHtml } from './textExtractor.js';
import { extractScriptureCitations, autoWrapScriptureCitations } from './citationParser.js';

/**
 * Strict Sanitize-HTML Configuration for Orthodox Theological Rich-Text Articles (TipTap)
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
    // Links & Media
    'a',
    'img',
    'figure',
    'figcaption',
    // Tables
    'table',
    'thead',
    'tbody',
    'tr',
    'th',
    'td',
  ],

  allowedAttributes: {
    a: ['href', 'target', 'rel', 'name'],
    span: ['class', 'data-ref', 'data-type'],
    img: ['src', 'alt', 'title', 'loading', 'width', 'height', 'class'],
    code: ['class'],
    pre: ['class'],
    blockquote: ['class'],
    th: ['colspan', 'rowspan', 'align', 'valign'],
    td: ['colspan', 'rowspan', 'align', 'valign'],
    figure: ['class'],
    figcaption: ['class'],
  },

  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowedSchemesByTag: {
    a: ['http', 'https', 'mailto', 'tel'],
    img: ['http', 'https'],
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

    img: (tagName, attribs) => {
      // Enforce lazy loading on all content images
      if (!attribs.loading) {
        attribs.loading = 'lazy';
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
  nonTextTags: ['script', 'style', 'textarea', 'option', 'noscript', 'iframe', 'object', 'embed', 'applet', 'form'],
};

/**
 * Sanitizes rich-text HTML string:
 * 1. Strips malicious tags/attributes (XSS immunity).
 * 2. Auto-wraps raw bracketed scripture citations into TipTap citation nodes.
 * 3. Applies Unicode NFC normalization.
 */
export function sanitizeArticleHtml(rawHtml: string): string {
  if (!rawHtml || typeof rawHtml !== 'string') {
    return '';
  }

  // 1. Unicode NFC Normalization on raw input
  const normalizedInput = rawHtml.normalize('NFC');

  // 2. Auto-wrap raw bracketed scriptures into TipTap spans
  const wrappedHtml = autoWrapScriptureCitations(normalizedInput);

  // 3. Strict HTML Sanitization
  const cleaned = sanitizeHtml(wrappedHtml, SANITIZER_OPTIONS);

  // 4. Final NFC Normalization on output
  return cleaned.normalize('NFC').trim();
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
 * - `citations`: Unique scripture references array (e.g. `["[ዮሐ 5:31]", "[1 ቆሮ 15:3]"]`)
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
