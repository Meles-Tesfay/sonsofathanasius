import { Request, Response } from 'express';
import sanitizeHtml from 'sanitize-html';
import { db } from '../db/index.js';
import { contactMessages } from '../db/schema.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { ContactFormSchema } from '../validators/contactValidator.js';
import { sql, eq, and, gt } from 'drizzle-orm';

const SANITIZE_PLAIN_TEXT_OPTIONS = { allowedTags: [], allowedAttributes: {} };

const ENTITY_MAP: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&nbsp;': ' ',
};

/**
 * Decode common named + numeric HTML entities so stored plain text is human-readable.
 * Only runs AFTER sanitize-html has stripped all tags/attributes.
 */
function decodeHtmlEntities(input: string): string {
  return input.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match) => {
    if (ENTITY_MAP[match]) return ENTITY_MAP[match];
    if (match.startsWith('&#')) {
      const isHex = match[2] === 'x' || match[2] === 'X';
      const code = Number.parseInt(match.slice(isHex ? 3 : 2, -1), isHex ? 16 : 10);
      if (!Number.isNaN(code) && code > 0 && code <= 0x10ffff) return String.fromCodePoint(code);
    }
    return match;
  });
}

/**
 * Convert arbitrary HTML to safe, readable plain text:
 * 1. Surround every tag with spaces so stripping never merges adjacent words.
 * 2. sanitize-html strips all tags/attributes (script/style content is discarded).
 * 3. Decode entities for readability; collapse repeated whitespace.
 */
function htmlToPlainText(html: string): string {
  const spaced = html.replace(/<[^>]*>/g, (tag) => ` ${tag} `);
  const cleaned = sanitizeHtml(spaced, SANITIZE_PLAIN_TEXT_OPTIONS);
  return decodeHtmlEntities(cleaned).replace(/\s+/g, ' ').trim();
}

/**
 * Public Contact Form Submission Endpoint
 * POST /api/v1/contact
 */
export const submitContactForm = async (req: Request, res: Response) => {
  // 1. Validate request body using hardened Zod schema
  const data = ContactFormSchema.parse(req.body);

  // 2. Honeypot check: if website field is filled, silently discard (bot trap)
  if (data.website && data.website.trim().length > 0) {
    return sendSuccess(res, { message: 'Message received successfully.' });
  }

  // 3. HTML Sanitization: strip all HTML tags & attributes to guarantee pure plain text
  const plainName = htmlToPlainText(data.name);
  const plainSubject = data.subject ? htmlToPlainText(data.subject) : null;
  const plainMessage = htmlToPlainText(data.message);

  if (plainName.length === 0 || plainMessage.length < 10) {
    return sendError(res, 'Message content must contain at least 10 characters of readable text.', 400);
  }

  // 4. Forensic Metadata Capture
  const ipAddress = (req.ip || req.socket.remoteAddress || '').slice(0, 45);
  const rawUserAgent = req.headers['user-agent'];
  const userAgent = typeof rawUserAgent === 'string' ? rawUserAgent.trim().slice(0, 500) : null;

  // 5. Per-Email Frequency Guard: max 3 messages per hour per email address
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const [emailCountResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(contactMessages)
    .where(
      and(
        eq(contactMessages.email, data.email),
        gt(contactMessages.createdAt, oneHourAgo)
      )
    );

  const recentEmailCount = Number(emailCountResult?.count || 0);
  if (recentEmailCount >= 3) {
    return sendError(
      res,
      'Too many messages submitted from this email address. Please try again after an hour.',
      429
    );
  }

  // 6. Secure Database Insert (parameterized, SQL-injection safe)
  const [insertResult] = await db.insert(contactMessages).values({
    name: plainName,
    email: data.email,
    subject: plainSubject,
    message: plainMessage,
    ipAddress: ipAddress || null,
    userAgent: userAgent || null,
    status: 'new',
  });

  // 7. Non-PII Audit Logging
  console.log(`[Contact] Contact message #${insertResult.insertId} securely stored.`);

  // 8. Respond with standard API envelope
  return sendSuccess(res, { message: 'Message received successfully.' });
};