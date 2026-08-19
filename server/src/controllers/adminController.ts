import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { db } from '../db/index.js';
import {
  content,
  contentTranslations,
  contentMedia,
  contentTags,
  categories,
} from '../db/schema.js';
import { eq, and, sql } from 'drizzle-orm';
import { config } from '../config/index.js';
import {
  CreateArticleSchema,
  UpsertTranslationSchema,
  UpdateArticleSchema,
} from '../validators/authValidator.js';
import { processArticleContent } from '../services/sanitizerService.js';
import { refreshSearchIndex } from '../services/searchService.js';
import { eagerGenerateArticlePdfs } from '../services/pdfService.js';
import {
  invalidateArticleCaches,
  invalidateCategoryCaches,
  invalidateTagCaches,
} from '../cache/invalidation.js';
import { sendSuccess, sendError } from '../utils/response.js';

// ══════════════════════════════════════════════════════════════════
// 1. CREATE ARTICLE — POST /api/v1/admin/articles
//    Atomic transaction: content + translations + media + tags
// ══════════════════════════════════════════════════════════════════

export async function createArticle(req: Request, res: Response): Promise<void> {
  // 1. Validate payload
  const parsed = CreateArticleSchema.safeParse(req.body);
  if (!parsed.success) {
    const details = parsed.error.errors
      .map((e) => `${e.path.join('.')}: ${e.message}`)
      .join(', ');
    sendError(res, `Invalid article payload: ${details}`, 400);
    return;
  }

  const payload = parsed.data;
  let insertedContentId: number;

  try {
    // 2. Atomic transaction
    await db.transaction(async (tx) => {
      // 2a. Insert master content container
      const contentResult = await tx.insert(content).values({
        categoryId: payload.categoryId,
        authorName: payload.authorName ?? null,
        coverImage: payload.coverImage ?? null,
        status: payload.status,
        pdfEnabled: payload.pdfEnabled ? 1 : 0,
        publishedAt: payload.publishedAt ? new Date(payload.publishedAt) : null,
      });

      insertedContentId = (contentResult as unknown as [{ insertId: number }])[0].insertId;

      // 2b. Insert translations (with sanitization pipeline)
      for (const translation of payload.translations) {
        const { sanitizedHtml, bodySearchable } = processArticleContent(translation.body);

        await tx.insert(contentTranslations).values({
          contentId: insertedContentId,
          langCode: translation.langCode,
          title: translation.title,
          slug: translation.slug,
          summary: translation.summary ?? null,
          body: sanitizedHtml,
          bodySearchable,
        });
      }

      // 2c. Insert media records
      if (payload.media.length > 0) {
        await tx.insert(contentMedia).values(
          payload.media.map((m) => ({
            contentId: insertedContentId,
            mediaKind: m.mediaKind,
            platform: m.platform,
            embedId: m.embedId,
            caption: m.caption ?? null,
            sortOrder: m.sortOrder,
          }))
        );
      }

      // 2d. Insert content_tags
      if (payload.tagIds.length > 0) {
        await tx.insert(contentTags).values(
          payload.tagIds.map((tagId) => ({
            contentId: insertedContentId,
            tagId,
          }))
        );
      }
    });

    // 3. Post-transaction side effects (non-blocking)
    invalidateArticleCaches();
    invalidateCategoryCaches();
    invalidateTagCaches();

    // Asynchronous: search re-index + eager PDF generation
    refreshSearchIndex().catch((err) =>
      console.error('⚠️ [Admin] Search index refresh failed after article create:', err)
    );

    if (payload.status === 'published' && payload.pdfEnabled) {
      eagerGenerateArticlePdfs(insertedContentId!, true).catch((err) =>
        console.error('⚠️ [Admin] Eager PDF generation failed after article create:', err)
      );
    }

    // 4. Return created article ID
    sendSuccess(
      res,
      {
        id: insertedContentId!,
        message: 'Article created successfully',
        translationsCount: payload.translations.length,
        mediaCount: payload.media.length,
        tagsCount: payload.tagIds.length,
      },
      undefined,
      201
    );
  } catch (err) {
    console.error('❌ [Admin] Article creation failed:', err);
    sendError(res, 'Failed to create article', 500);
  }
}

// ══════════════════════════════════════════════════════════════════
// 2. UPSERT TRANSLATION — POST /api/v1/admin/articles/:id/translations
//    Adds or updates a single translation for an existing article.
// ══════════════════════════════════════════════════════════════════

export async function upsertTranslation(req: Request, res: Response): Promise<void> {
  const contentId = parseInt(String(req.params.id), 10);
  if (isNaN(contentId) || contentId <= 0) {
    sendError(res, 'Invalid article ID', 400);
    return;
  }

  // 1. Validate payload
  const parsed = UpsertTranslationSchema.safeParse(req.body);
  if (!parsed.success) {
    const details = parsed.error.errors
      .map((e) => `${e.path.join('.')}: ${e.message}`)
      .join(', ');
    sendError(res, `Invalid translation payload: ${details}`, 400);
    return;
  }

  const payload = parsed.data;

  try {
    // 2. Verify article exists
    const articleRows = await db
      .select({ id: content.id, status: content.status, pdfEnabled: content.pdfEnabled })
      .from(content)
      .where(eq(content.id, contentId))
      .limit(1);

    if (articleRows.length === 0) {
      sendError(res, `Article not found: ${contentId}`, 404);
      return;
    }

    const article = articleRows[0];

    // 3. Process content through sanitization pipeline
    const { sanitizedHtml, bodySearchable } = processArticleContent(payload.body);

    // 4. UPSERT: Insert or update on duplicate (contentId, langCode)
    //    Using raw SQL for ON DUPLICATE KEY UPDATE since Drizzle doesn't have first-class upsert for MySQL
    await db.insert(contentTranslations).values({
      contentId,
      langCode: payload.langCode,
      title: payload.title,
      slug: payload.slug,
      summary: payload.summary ?? null,
      body: sanitizedHtml,
      bodySearchable,
    }).onDuplicateKeyUpdate({
      set: {
        title: sql`VALUES(${contentTranslations.title})`,
        slug: sql`VALUES(${contentTranslations.slug})`,
        summary: sql`VALUES(${contentTranslations.summary})`,
        body: sql`VALUES(${contentTranslations.body})`,
        bodySearchable: sql`VALUES(${contentTranslations.bodySearchable})`,
        // Reset PDF path so it regenerates
        pdfFilePath: sql`NULL`,
        pdfGeneratedAt: sql`NULL`,
      },
    });

    // 5. Post-write side effects
    invalidateArticleCaches();

    refreshSearchIndex().catch((err) =>
      console.error('⚠️ [Admin] Search index refresh failed after translation upsert:', err)
    );

    if (article.status === 'published' && article.pdfEnabled) {
      eagerGenerateArticlePdfs(contentId, true).catch((err) =>
        console.error('⚠️ [Admin] Eager PDF generation failed after translation upsert:', err)
      );
    }

    sendSuccess(res, {
      contentId,
      langCode: payload.langCode,
      message: 'Translation upserted successfully',
    });
  } catch (err) {
    console.error('❌ [Admin] Translation upsert failed:', err);
    sendError(res, 'Failed to upsert translation', 500);
  }
}

// ══════════════════════════════════════════════════════════════════
// 3. UPDATE ARTICLE — PUT /api/v1/admin/articles/:id
//    Updates article metadata & optionally replaces translations,
//    media, and tags atomically.
// ══════════════════════════════════════════════════════════════════

export async function updateArticle(req: Request, res: Response): Promise<void> {
  const contentId = parseInt(String(req.params.id), 10);
  if (isNaN(contentId) || contentId <= 0) {
    sendError(res, 'Invalid article ID', 400);
    return;
  }

  // 1. Validate payload
  const parsed = UpdateArticleSchema.safeParse(req.body);
  if (!parsed.success) {
    const details = parsed.error.errors
      .map((e) => `${e.path.join('.')}: ${e.message}`)
      .join(', ');
    sendError(res, `Invalid update payload: ${details}`, 400);
    return;
  }

  const payload = parsed.data;

  try {
    // 2. Verify article exists
    const existingRows = await db
      .select({ id: content.id })
      .from(content)
      .where(eq(content.id, contentId))
      .limit(1);

    if (existingRows.length === 0) {
      sendError(res, `Article not found: ${contentId}`, 404);
      return;
    }

    // 3. Atomic transaction for update
    await db.transaction(async (tx) => {
      // 3a. Update content master record (only provided fields)
      const updateFields: Record<string, unknown> = {};
      if (payload.categoryId !== undefined) updateFields.categoryId = payload.categoryId;
      if (payload.authorName !== undefined) updateFields.authorName = payload.authorName;
      if (payload.coverImage !== undefined) updateFields.coverImage = payload.coverImage;
      if (payload.status !== undefined) updateFields.status = payload.status;
      if (payload.pdfEnabled !== undefined) updateFields.pdfEnabled = payload.pdfEnabled ? 1 : 0;
      if (payload.publishedAt !== undefined) {
        updateFields.publishedAt = payload.publishedAt ? new Date(payload.publishedAt) : null;
      }

      if (Object.keys(updateFields).length > 0) {
        await tx.update(content).set(updateFields).where(eq(content.id, contentId));
      }

      // 3b. Replace translations if provided
      if (payload.translations && payload.translations.length > 0) {
        // Delete existing translations
        await tx.delete(contentTranslations).where(eq(contentTranslations.contentId, contentId));

        // Insert updated translations with sanitization
        for (const translation of payload.translations) {
          const { sanitizedHtml, bodySearchable } = processArticleContent(translation.body);

          await tx.insert(contentTranslations).values({
            contentId,
            langCode: translation.langCode,
            title: translation.title,
            slug: translation.slug,
            summary: translation.summary ?? null,
            body: sanitizedHtml,
            bodySearchable,
          });
        }
      }

      // 3c. Replace media if provided
      if (payload.media !== undefined) {
        await tx.delete(contentMedia).where(eq(contentMedia.contentId, contentId));

        if (payload.media.length > 0) {
          await tx.insert(contentMedia).values(
            payload.media.map((m) => ({
              contentId,
              mediaKind: m.mediaKind,
              platform: m.platform,
              embedId: m.embedId,
              caption: m.caption ?? null,
              sortOrder: m.sortOrder,
            }))
          );
        }
      }

      // 3d. Replace tags if provided
      if (payload.tagIds !== undefined) {
        await tx.delete(contentTags).where(eq(contentTags.contentId, contentId));

        if (payload.tagIds.length > 0) {
          await tx.insert(contentTags).values(
            payload.tagIds.map((tagId) => ({
              contentId,
              tagId,
            }))
          );
        }
      }
    });

    // 4. Post-transaction side effects
    invalidateArticleCaches();
    invalidateCategoryCaches();
    invalidateTagCaches();

    refreshSearchIndex().catch((err) =>
      console.error('⚠️ [Admin] Search index refresh failed after article update:', err)
    );

    // Eagerly regenerate all PDFs with force=true (content changed)
    eagerGenerateArticlePdfs(contentId, true).catch((err) =>
      console.error('⚠️ [Admin] Eager PDF generation failed after article update:', err)
    );

    sendSuccess(res, {
      id: contentId,
      message: 'Article updated successfully',
    });
  } catch (err) {
    console.error('❌ [Admin] Article update failed:', err);
    sendError(res, 'Failed to update article', 500);
  }
}

// ══════════════════════════════════════════════════════════════════
// 4. DELETE ARTICLE — DELETE /api/v1/admin/articles/:id
//    Cascades translations, media, tags (via FK ON DELETE CASCADE),
//    and cleans up static PDF files from disk.
// ══════════════════════════════════════════════════════════════════

export async function deleteArticle(req: Request, res: Response): Promise<void> {
  const contentId = parseInt(String(req.params.id), 10);
  if (isNaN(contentId) || contentId <= 0) {
    sendError(res, 'Invalid article ID', 400);
    return;
  }

  try {
    // 1. Verify article exists and fetch translation PDF paths for disk cleanup
    const articleRows = await db
      .select({ id: content.id })
      .from(content)
      .where(eq(content.id, contentId))
      .limit(1);

    if (articleRows.length === 0) {
      sendError(res, `Article not found: ${contentId}`, 404);
      return;
    }

    // 2. Fetch all PDF file paths before deletion
    const pdfRows = await db
      .select({ pdfFilePath: contentTranslations.pdfFilePath })
      .from(contentTranslations)
      .where(eq(contentTranslations.contentId, contentId));

    // 3. Delete static PDF files from disk
    for (const row of pdfRows) {
      if (row.pdfFilePath) {
        const fileName = path.basename(row.pdfFilePath);
        const absolutePath = path.join(config.storage.pdfDir, fileName);
        try {
          if (fs.existsSync(absolutePath)) {
            await fs.promises.unlink(absolutePath);
          }
        } catch {
          // Non-critical: best-effort cleanup
        }
      }
    }

    // 4. Also clean up any orphaned PDFs matching the pattern article_${id}_*
    try {
      const pdfFiles = await fs.promises.readdir(config.storage.pdfDir);
      const prefix = `article_${contentId}_`;
      for (const file of pdfFiles) {
        if (file.startsWith(prefix)) {
          const filePath = path.join(config.storage.pdfDir, file);
          await fs.promises.unlink(filePath).catch(() => {});
        }
      }
    } catch {
      // Non-critical: directory may not exist yet
    }

    // 5. Delete from DB (ON DELETE CASCADE handles translations, media, tags)
    await db.delete(content).where(eq(content.id, contentId));

    // 6. Post-deletion side effects
    invalidateArticleCaches();
    invalidateCategoryCaches();
    invalidateTagCaches();

    refreshSearchIndex().catch((err) =>
      console.error('⚠️ [Admin] Search index refresh failed after article delete:', err)
    );

    sendSuccess(res, {
      id: contentId,
      message: 'Article deleted successfully',
    });
  } catch (err) {
    console.error('❌ [Admin] Article deletion failed:', err);
    sendError(res, 'Failed to delete article', 500);
  }
}
