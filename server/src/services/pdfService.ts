import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import { config } from '../config/index.js';
import { db } from '../db/index.js';
import { content, contentTranslations, categories } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';

export interface ArticlePdfData {
  contentId: number;
  title: string;
  slug: string;
  summary: string | null;
  body: string;
  bodySearchable?: string;
  authorName: string | null;
  categoryName: string;
  langCode: string;
  publishedAt: Date | string | null;
  updatedAt?: Date | string | null;
}

// Single-Flight Request Coalescing Map for concurrent PDF generations
const inflightPdfGenerations = new Map<string, Promise<{ filePath: string; fileName: string }>>();

// Ensure Unicode NFC Normalization
export function normalizeNfc(text: string): string {
  if (!text) return '';
  return text.normalize('NFC');
}

export type ContentBlock = 
  | { type: 'paragraph'; text: string }
  | { type: 'heading'; level: number; text: string }
  | { type: 'quote'; text: string }
  | { type: 'list-item'; ordered: boolean; index: number; text: string }
  | { type: 'pre'; text: string };

/**
 * Robust HTML parser converting rich text (paragraphs, headings, blockquotes, lists, tables) into structured PDF blocks
 */
export function parseHtmlToBlocks(html: string): ContentBlock[] {
  if (!html) return [];

  // 1. Replace scripture span tags with clean bracketed citation
  let clean = html.replace(/<span\s+data-ref="([^"]+)"[^>]*>([\s\S]*?)<\/span>/gi, '[$1]');
  
  // 2. Replace break tags with newline
  clean = clean.replace(/<br\s*\/?>/gi, '\n');

  const blocks: ContentBlock[] = [];

  // Match all top-level / block-level HTML tags
  const blockRegex = /<(p|h1|h2|h3|h4|h5|h6|blockquote|ul|ol|pre|table)[^>]*>([\s\S]*?)<\/\1>/gi;
  let match: RegExpExecArray | null;

  while ((match = blockRegex.exec(clean)) !== null) {
    const tag = match[1].toLowerCase();
    const rawContent = match[2];

    if (tag === 'ul' || tag === 'ol') {
      const isOrdered = tag === 'ol';
      const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
      let liMatch: RegExpExecArray | null;
      let itemIndex = 1;

      while ((liMatch = liRegex.exec(rawContent)) !== null) {
        const textContent = liMatch[1].replace(/<[^>]+>/g, '').trim();
        if (textContent) {
          blocks.push({
            type: 'list-item',
            ordered: isOrdered,
            index: itemIndex++,
            text: textContent,
          });
        }
      }
    } else if (tag.startsWith('h')) {
      const level = parseInt(tag.charAt(1), 10) || 2;
      const textContent = rawContent.replace(/<[^>]+>/g, '').trim();
      if (textContent) {
        blocks.push({ type: 'heading', level, text: textContent });
      }
    } else if (tag === 'blockquote') {
      const textContent = rawContent.replace(/<[^>]+>/g, '').trim();
      if (textContent) {
        blocks.push({ type: 'quote', text: textContent });
      }
    } else if (tag === 'pre') {
      const textContent = rawContent.replace(/<[^>]+>/g, '').trim();
      if (textContent) {
        blocks.push({ type: 'pre', text: textContent });
      }
    } else if (tag === 'table') {
      // Extract cell texts from table rows
      const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
      let rowMatch: RegExpExecArray | null;
      while ((rowMatch = rowRegex.exec(rawContent)) !== null) {
        const cellText = rowMatch[1].replace(/<[^>]+>/g, '  |  ').trim();
        if (cellText) {
          blocks.push({ type: 'paragraph', text: cellText });
        }
      }
    } else {
      const textContent = rawContent.replace(/<[^>]+>/g, '').trim();
      if (textContent) {
        blocks.push({ type: 'paragraph', text: textContent });
      }
    }
  }

  // Fallback: if no standard HTML tags matched, split by newlines
  if (blocks.length === 0) {
    const plain = clean.replace(/<[^>]+>/g, '').trim();
    const lines = plain.split(/\n\s*\n/);
    for (const line of lines) {
      if (line.trim()) {
        blocks.push({ type: 'paragraph', text: line.trim() });
      }
    }
  }

  return blocks;
}

interface LocalizedPdfLabels {
  headerTitle: string;
  headerSubtitle: string;
  authorLabel: string;
  categoryLabel: string;
  dateLabel: string;
  defaultAuthor: string;
  footerQuote: string;
  pageLabel: (current: number, total: number) => string;
}

const LOCALIZED_LABELS: Record<string, LocalizedPdfLabels> = {
  am: {
    headerTitle: 'ደቂቀ አትናቴዎስ  |  SONS OF ATHANASIUS',
    headerSubtitle: 'www.sonsofathanasius.com  •  የኢትዮጵያ ኦርቶዶክስ ተዋሕዶ ቤተ ክርስቲያን የዕቅበተ እምነት ዲጂታል ቤተ መጻሕፍት',
    authorLabel: 'ደራሲ',
    categoryLabel: 'ምድብ',
    dateLabel: 'ቀን',
    defaultAuthor: 'ደቂቀ አትናቴዎስ',
    footerQuote: '«የእግዚአብሔር ቃል ለዘላለም ጸንቶ ይኖራል።»  •  ደቂቀ አትናቴዎስ  •  www.sonsofathanasius.com',
    pageLabel: (current, total) => `ገጽ ${current} / ${total}`,
  },
  ti: {
    headerTitle: 'ደቂቀ አትናቴዎስ  |  SONS OF ATHANASIUS',
    headerSubtitle: 'www.sonsofathanasius.com  •  ናይ ኢትዮጵያ ኦርቶዶክስ ተዋሕዶ ቤተ ክርስቲያን ናይ ዕቅበተ እምነት ዲጂታል ቤተ መጻሕፍቲ',
    authorLabel: 'ደራሲ',
    categoryLabel: 'ምድብ',
    dateLabel: 'ዕለት',
    defaultAuthor: 'ደቂቀ አትናቴዎስ',
    footerQuote: '«ቃል እግዚኣብሔር ንዘለኣለም ይነብር።»  •  ደቂቀ አትናቴዎስ  •  www.sonsofathanasius.com',
    pageLabel: (current, total) => `ገጽ ${current} / ${total}`,
  },
  en: {
    headerTitle: 'SONS OF ATHANASIUS',
    headerSubtitle: 'www.sonsofathanasius.com  •  Orthodox Christian Apologetics Digital Library',
    authorLabel: 'Author',
    categoryLabel: 'Category',
    dateLabel: 'Date',
    defaultAuthor: 'Sons of Athanasius',
    footerQuote: '“The Word of the Lord endures forever.”  •  Sons of Athanasius  •  www.sonsofathanasius.com',
    pageLabel: (current, total) => `Page ${current} of ${total}`,
  },
  om: {
    headerTitle: 'ILMAAN ATNAATEWOOS  |  SONS OF ATHANASIUS',
    headerSubtitle: 'www.sonsofathanasius.com  •  Kuusaa Barreeffamoota Amantii Ortodoksii Tawaahidoo Itoophiyaa',
    authorLabel: 'Barreessaa',
    categoryLabel: 'Kutaa',
    dateLabel: 'Guyyaa',
    defaultAuthor: 'Ilmaan Atnaatewoos',
    footerQuote: '«Dubbiin Waaqayyoo bara baraan jiraata.»  •  Ilmaan Atnaatewoos  •  www.sonsofathanasius.com',
    pageLabel: (current, total) => `Fuula ${current} / ${total}`,
  },
};

/**
 * Strips unsupported characters when rendering Latin fonts to prevent empty glyph rectangles
 */
function sanitizeForFont(text: string, isEthiopic: boolean, fallback: string = ''): string {
  if (!text) return fallback;
  if (!isEthiopic) {
    // Remove Ethiopic Unicode block (U+1200 - U+139F, U+2D80 - U+2DDF, U+AB00 - U+AB2F)
    const cleaned = text
      .replace(/[\u1200-\u139F\u2D80-\u2DDF\uAB00-\uAB2F]+/g, '')
      .replace(/[()]/g, '')
      .trim();
    return cleaned || fallback;
  }
  return text.trim() || fallback;
}

/**
 * Generate a high-resolution PDF document using PDFKit with static font registration
 */
export function generateArticlePdf(data: ArticlePdfData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const isEthiopic = data.langCode === 'am' || data.langCode === 'ti';
      const labels = LOCALIZED_LABELS[data.langCode] || LOCALIZED_LABELS.am;

      const safeTitle = sanitizeForFont(normalizeNfc(data.title), isEthiopic, data.title);
      const safeAuthor = sanitizeForFont(
        data.authorName ? normalizeNfc(data.authorName) : '',
        isEthiopic,
        labels.defaultAuthor
      );
      const safeCategory = sanitizeForFont(normalizeNfc(data.categoryName), isEthiopic, 'Theology');

      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        bufferPages: true,
        info: {
          Title: safeTitle,
          Author: safeAuthor,
          Subject: safeCategory,
          Keywords: 'Orthodox, Apologetics, EOTC, Theology, Patristics',
          Creator: 'ደቂቀ አትናቴዎስ (Sons of Athanasius) Digital Library',
        },
      });

      const buffers: Buffer[] = [];
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      const fontsDir = config.storage.fontsDir;

      // Register Fonts
      const fontRegularPath = isEthiopic
        ? path.join(fontsDir, 'NotoSerifEthiopic-Regular.ttf')
        : path.join(fontsDir, 'PlusJakartaSans-Regular.ttf');

      const fontBoldPath = isEthiopic
        ? path.join(fontsDir, 'NotoSerifEthiopic-Bold.ttf')
        : path.join(fontsDir, 'PlusJakartaSans-Bold.ttf');

      const fontHeadingPath = isEthiopic
        ? path.join(fontsDir, 'NotoSerifEthiopic-Bold.ttf')
        : path.join(fontsDir, 'Cinzel-Bold.ttf');

      doc.registerFont('AppRegular', fontRegularPath);
      doc.registerFont('AppBold', fontBoldPath);
      doc.registerFont('AppHeading', fontHeadingPath);

      // Colors
      const primaryCrimson = '#7A0C0C';
      const secondaryGold = '#D4AF37';
      const darkText = '#1A1A1A';
      const mutedText = '#666666';

      // ── Header ──────────────────────────────────────────
      doc
        .font('AppHeading')
        .fontSize(10)
        .fillColor(primaryCrimson)
        .text(labels.headerTitle, 50, 45, { align: 'center', characterSpacing: 1 });

      doc
        .font('AppRegular')
        .fontSize(8)
        .fillColor(mutedText)
        .text(labels.headerSubtitle, {
          align: 'center',
        });

      doc.moveDown(0.5);

      // Decorative Crimson & Gold Header Bar
      const startX = 50;
      const lineWidth = 495;
      const currentY = doc.y;

      doc.rect(startX, currentY, lineWidth, 2).fill(primaryCrimson);
      doc.rect(startX + 180, currentY, 135, 2).fill(secondaryGold);
      doc.moveDown(1.2);

      // ── Title ───────────────────────────────────────────
      doc
        .font('AppHeading')
        .fontSize(19)
        .fillColor(primaryCrimson)
        .text(safeTitle, { align: 'left', lineGap: 4 });

      doc.moveDown(0.6);

      // ── Metadata Byline ─────────────────────────────────
      const pubDate = data.publishedAt
        ? new Date(data.publishedAt).toLocaleDateString(isEthiopic ? 'am-ET' : 'en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })
        : new Date().toLocaleDateString('en-US');

      doc
        .font('AppBold')
        .fontSize(9)
        .fillColor(mutedText)
        .text(`${labels.authorLabel}: ${safeAuthor}   •   ${labels.categoryLabel}: ${safeCategory}   •   ${labels.dateLabel}: ${pubDate}`);

      doc.moveDown(0.8);

      // Thin divider
      doc.strokeColor('#E5E5E5').lineWidth(0.5).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(0.8);

      // ── Summary Callout Box (if present) ────────────────
      if (data.summary && data.summary.trim()) {
        const summaryY = doc.y;
        const summaryText = sanitizeForFont(normalizeNfc(data.summary.trim()), isEthiopic);

        doc
          .rect(50, summaryY, 495, 45)
          .fillAndStroke('#FAF8F5', '#EADFC7');

        doc
          .font('AppRegular')
          .fontSize(9.5)
          .fillColor('#4A3E2D')
          .text(summaryText, 62, summaryY + 8, {
            width: 471,
            lineGap: 3,
          });

        doc.y = summaryY + 55;
        doc.moveDown(0.5);
      }

      // ── Body Blocks ─────────────────────────────────────
      const blocks = parseHtmlToBlocks(data.body);

      for (const block of blocks) {
        if (doc.y > 720) {
          doc.addPage();
        }

        if (block.type === 'heading') {
          doc.moveDown(0.6);
          const headingSize = block.level <= 2 ? 14 : 12;
          doc
            .font('AppHeading')
            .fontSize(headingSize)
            .fillColor(primaryCrimson)
            .text(normalizeNfc(block.text), { lineGap: 3 });
          doc.moveDown(0.3);
        } else if (block.type === 'quote') {
          doc.moveDown(0.4);
          const quoteY = doc.y;
          doc.rect(50, quoteY, 3, 25).fill(secondaryGold);
          doc
            .font('AppRegular')
            .fontSize(10)
            .fillColor('#333333')
            .text(normalizeNfc(block.text), 60, quoteY + 2, {
              width: 480,
              lineGap: 3,
            });
          doc.moveDown(0.5);
        } else if (block.type === 'list-item') {
          const prefix = block.ordered ? `${block.index}. ` : '• ';
          doc
            .font('AppBold')
            .fontSize(10)
            .fillColor(primaryCrimson)
            .text(prefix, 60, doc.y, { continued: true });

          doc
            .font('AppRegular')
            .fontSize(10)
            .fillColor(darkText)
            .text(normalizeNfc(block.text), {
              lineGap: 3,
              paragraphGap: 4,
            });
        } else if (block.type === 'pre') {
          doc.moveDown(0.3);
          const preY = doc.y;
          doc.rect(50, preY, 495, 30).fill('#F4F4F4');
          doc
            .font('AppRegular')
            .fontSize(9)
            .fillColor('#222222')
            .text(normalizeNfc(block.text), 58, preY + 6, { width: 480 });
          doc.y = preY + 36;
          doc.moveDown(0.4);
        } else {
          doc
            .font('AppRegular')
            .fontSize(10.5)
            .fillColor(darkText)
            .text(normalizeNfc(block.text), {
              align: 'justify',
              lineGap: 4,
              paragraphGap: 6,
            });
        }
      }

      // ── Header & Footer for All Pages ───────────────────
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);

        // Temporarily disable bottom margin to prevent auto-page break
        const oldBottomMargin = doc.page.margins.bottom;
        doc.page.margins.bottom = 0;

        // Footer rule
        doc.strokeColor('#D4AF37').lineWidth(0.5).moveTo(50, 785).lineTo(545, 785).stroke();

        // Footer text
        doc
          .font('AppRegular')
          .fontSize(8)
          .fillColor(mutedText)
          .text(
            labels.footerQuote,
            50,
            793,
            { align: 'left', width: 390, lineBreak: false }
          );

        // Page Number
        doc
          .font('AppRegular')
          .fontSize(8)
          .fillColor(mutedText)
          .text(labels.pageLabel(i + 1, range.count), 450, 793, {
            align: 'right',
            width: 95,
            lineBreak: false,
          });

        doc.page.margins.bottom = oldBottomMargin;
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Generate and write a static PDF file to disk with atomic write and cache bust timestamp
 */
export async function generateAndSaveArticlePdf(data: ArticlePdfData): Promise<string> {
  const versionTimestamp = data.updatedAt ? new Date(data.updatedAt).getTime() : Date.now();
  const fileName = `article_${data.contentId}_${versionTimestamp}_${data.langCode}.pdf`;
  const relativePath = `/uploads/pdf/${fileName}`;
  const absolutePath = path.join(config.storage.pdfDir, fileName);

  // Ensure pdf directory exists
  if (!fs.existsSync(config.storage.pdfDir)) {
    fs.mkdirSync(config.storage.pdfDir, { recursive: true });
  }

  // Generate buffer
  const buffer = await generateArticlePdf(data);

  // Atomic write: write to temp file then rename
  const tmpPath = `${absolutePath}.tmp.${Date.now()}`;
  await fs.promises.writeFile(tmpPath, buffer);
  await fs.promises.rename(tmpPath, absolutePath);

  // Fetch current translation row to remove previous static PDF if filename changed
  const prevRows = await db
    .select({ pdfFilePath: contentTranslations.pdfFilePath })
    .from(contentTranslations)
    .where(
      and(
        eq(contentTranslations.contentId, data.contentId),
        eq(contentTranslations.langCode, data.langCode)
      )
    )
    .limit(1);

  if (prevRows.length > 0 && prevRows[0].pdfFilePath && prevRows[0].pdfFilePath !== relativePath) {
    const oldFileName = path.basename(prevRows[0].pdfFilePath);
    const oldAbsolutePath = path.join(config.storage.pdfDir, oldFileName);
    try {
      if (fs.existsSync(oldAbsolutePath)) {
        await fs.promises.unlink(oldAbsolutePath);
      }
    } catch {
      // Ignore cleanup error
    }
  }

  // Update translation row in MariaDB
  await db
    .update(contentTranslations)
    .set({
      pdfFilePath: relativePath,
      pdfGeneratedAt: new Date(),
    })
    .where(
      and(
        eq(contentTranslations.contentId, data.contentId),
        eq(contentTranslations.langCode, data.langCode)
      )
    );

  return relativePath;
}

/**
 * Helper to resolve localized category name
 */
function resolveCategoryName(row: {
  langCode: string;
  categoryNameAm?: string | null;
  categoryNameEn?: string | null;
  categoryNameOm?: string | null;
  categoryNameTi?: string | null;
}): string {
  if (row.langCode === 'en' && row.categoryNameEn) return row.categoryNameEn;
  if (row.langCode === 'om' && row.categoryNameOm) return row.categoryNameOm;
  if (row.langCode === 'ti' && row.categoryNameTi) return row.categoryNameTi;
  return row.categoryNameAm || 'ኦርቶዶክሳዊ ትምህርት';
}

/**
 * Eagerly pre-generate static PDFs for all published translations of an article
 */
export async function eagerGenerateArticlePdfs(contentId: number): Promise<void> {
  try {
    const rows = await db
      .select({
        contentId: content.id,
        pdfEnabled: content.pdfEnabled,
        status: content.status,
        authorName: content.authorName,
        publishedAt: content.publishedAt,
        updatedAt: content.updatedAt,
        categoryNameAm: categories.nameAm,
        categoryNameEn: categories.nameEn,
        categoryNameOm: categories.nameOm,
        categoryNameTi: categories.nameTi,
        title: contentTranslations.title,
        slug: contentTranslations.slug,
        summary: contentTranslations.summary,
        body: contentTranslations.body,
        langCode: contentTranslations.langCode,
      })
      .from(content)
      .innerJoin(categories, eq(content.categoryId, categories.id))
      .innerJoin(contentTranslations, eq(contentTranslations.contentId, content.id))
      .where(eq(content.id, contentId));

    if (rows.length === 0) return;
    const master = rows[0];

    // Only generate if article is published and pdfEnabled is active
    if (master.status !== 'published' || !master.pdfEnabled) {
      return;
    }

    for (const row of rows) {
      const categoryName = resolveCategoryName(row);

      await generateAndSaveArticlePdf({
        contentId: row.contentId,
        title: row.title,
        slug: row.slug,
        summary: row.summary,
        body: row.body,
        authorName: row.authorName,
        categoryName,
        langCode: row.langCode,
        publishedAt: row.publishedAt,
        updatedAt: row.updatedAt,
      });
    }

    console.log(`📄 [PDFService] Eagerly generated ${rows.length} multilingual PDFs for article #${contentId}`);
  } catch (err) {
    console.error(`⚠️ [PDFService] Failed to eager-generate PDFs for article #${contentId}:`, err);
  }
}

/**
 * Reconcile / Backfill Missing PDFs for all published articles on boot
 */
export async function reconcileMissingPdfs(): Promise<void> {
  try {
    const publishedRows = await db
      .select({
        contentId: content.id,
        langCode: contentTranslations.langCode,
        pdfFilePath: contentTranslations.pdfFilePath,
      })
      .from(content)
      .innerJoin(contentTranslations, eq(contentTranslations.contentId, content.id))
      .where(and(eq(content.status, 'published'), eq(content.pdfEnabled, 1)));

    let backfilledCount = 0;
    const missingArticleIds = new Set<number>();

    for (const row of publishedRows) {
      const isMissingOnDisk = !row.pdfFilePath || !fs.existsSync(path.join(config.storage.uploadsDir, '..', row.pdfFilePath));
      if (isMissingOnDisk) {
        missingArticleIds.add(row.contentId);
      }
    }

    for (const contentId of missingArticleIds) {
      await eagerGenerateArticlePdfs(contentId);
      backfilledCount++;
    }

    if (backfilledCount > 0) {
      console.log(`📄 [PDFService] Boot sweep reconciled and backfilled PDFs for ${backfilledCount} articles.`);
    }
  } catch (err) {
    console.error('⚠️ [PDFService] Error in reconcileMissingPdfs sweep:', err);
  }
}

/**
 * Get cached PDF from disk, or generate on-the-fly with single-flight request coalescing
 */
export async function getOrGenerateArticlePdf(
  slug: string,
  langCode: string = 'am'
): Promise<{ filePath: string; fileName: string }> {
  const coalescingKey = `${slug}:${langCode}`;

  // Check if this exact PDF is already currently generating
  const inflight = inflightPdfGenerations.get(coalescingKey);
  if (inflight) {
    return inflight;
  }

  const executionPromise = (async () => {
    // 1. Query article translation by slug and langCode
    let rows = await db
      .select({
        contentId: content.id,
        pdfEnabled: content.pdfEnabled,
        status: content.status,
        authorName: content.authorName,
        publishedAt: content.publishedAt,
        updatedAt: content.updatedAt,
        categoryNameAm: categories.nameAm,
        categoryNameEn: categories.nameEn,
        categoryNameOm: categories.nameOm,
        categoryNameTi: categories.nameTi,
        title: contentTranslations.title,
        slug: contentTranslations.slug,
        summary: contentTranslations.summary,
        body: contentTranslations.body,
        langCode: contentTranslations.langCode,
        pdfFilePath: contentTranslations.pdfFilePath,
      })
      .from(content)
      .innerJoin(categories, eq(content.categoryId, categories.id))
      .innerJoin(contentTranslations, eq(contentTranslations.contentId, content.id))
      .where(
        and(
          eq(contentTranslations.slug, slug),
          eq(contentTranslations.langCode, langCode),
          eq(content.status, 'published')
        )
      );

    // Fallback to Amharic if specific translation slug not found
    if (rows.length === 0 && langCode !== 'am') {
      rows = await db
        .select({
          contentId: content.id,
          pdfEnabled: content.pdfEnabled,
          status: content.status,
          authorName: content.authorName,
          publishedAt: content.publishedAt,
          updatedAt: content.updatedAt,
          categoryNameAm: categories.nameAm,
          categoryNameEn: categories.nameEn,
          categoryNameOm: categories.nameOm,
          categoryNameTi: categories.nameTi,
          title: contentTranslations.title,
          slug: contentTranslations.slug,
          summary: contentTranslations.summary,
          body: contentTranslations.body,
          langCode: contentTranslations.langCode,
          pdfFilePath: contentTranslations.pdfFilePath,
        })
        .from(content)
        .innerJoin(categories, eq(content.categoryId, categories.id))
        .innerJoin(contentTranslations, eq(contentTranslations.contentId, content.id))
        .where(
          and(
            eq(contentTranslations.slug, slug),
            eq(contentTranslations.langCode, 'am'),
            eq(content.status, 'published')
          )
        );
    }

    if (rows.length === 0) {
      const notFoundErr = new Error('Article not found or not published');
      (notFoundErr as unknown as { statusCode: number }).statusCode = 404;
      throw notFoundErr;
    }

    const article = rows[0];

    if (!article.pdfEnabled) {
      const disabledErr = new Error('PDF export is disabled for this article');
      (disabledErr as unknown as { statusCode: number }).statusCode = 404;
      throw disabledErr;
    }

    // 2. Check if static PDF exists on disk according to DB recorded path
    if (article.pdfFilePath) {
      const savedFileName = path.basename(article.pdfFilePath);
      const savedAbsolutePath = path.join(config.storage.pdfDir, savedFileName);

      if (fs.existsSync(savedAbsolutePath)) {
        return { filePath: savedAbsolutePath, fileName: `SOA_${article.slug}.pdf` };
      }
    }

    // 3. Lazy-on-miss fallback: Generate, atomically write to disk, update DB, and return
    const categoryName = resolveCategoryName(article);

    const relativePath = await generateAndSaveArticlePdf({
      contentId: article.contentId,
      title: article.title,
      slug: article.slug,
      summary: article.summary,
      body: article.body,
      authorName: article.authorName,
      categoryName,
      langCode: article.langCode,
      publishedAt: article.publishedAt,
      updatedAt: article.updatedAt,
    });

    const newAbsolutePath = path.join(config.storage.pdfDir, path.basename(relativePath));
    return { filePath: newAbsolutePath, fileName: `SOA_${article.slug}.pdf` };
  })();

  // Store in single-flight map and ensure cleanup upon resolution or rejection
  inflightPdfGenerations.set(coalescingKey, executionPromise);
  try {
    return await executionPromise;
  } finally {
    inflightPdfGenerations.delete(coalescingKey);
  }
}
