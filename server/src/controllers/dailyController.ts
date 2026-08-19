import { Response } from 'express';
import { ValidatedRequest } from '../validators/queryValidator.js';
import { DailyQueryParams } from '../validators/publicQueryValidator.js';
import type { DailyLectionaryResponse } from '../types/index.js';

/**
 * Daily Lectionary & Saints Controller (Stub)
 * GET /api/v1/daily?lang=am
 *
 * Placeholder controller — daily lectionary data source is TBD.
 * Establishes route, caching, and response shape so the frontend can integrate.
 *
 * Returns raw envelope for cachedRoute().
 */
export async function getDailyLectionary(
  req: ValidatedRequest<DailyQueryParams>,
  _res: Response
): Promise<unknown> {
  const { lang } = req.validatedQuery!;

  // Current date in East Africa Time (UTC+3)
  const now = new Date();
  const etOffset = 3 * 60; // UTC+3 in minutes
  const localTime = new Date(now.getTime() + etOffset * 60 * 1000);
  const dateString = localTime.toISOString().split('T')[0]; // YYYY-MM-DD

  // Placeholder messages per language
  const messages: Record<string, string> = {
    am: 'የዕለቱ መንፈሳዊ ትምህርት በቅርብ ይጀምራል። እባክዎ ይጠብቁ።',
    en: 'Daily lectionary and saints content is coming soon. Please check back later.',
    om: "Barnoota afuuraa guyyaa guyyaa dhiyootti ni jalqabama. Mee irra deebi'aa ilaalaa.",
    ti: 'ናይ መዓልታዊ መንፈሳዊ ትምህርቲ ኣብ ቀረባ ክጅምር እዩ። በጃኹም ተጸበዩ።',
  };

  const result: DailyLectionaryResponse = {
    date: dateString,
    message: messages[lang] || messages['am'],
    lang,
  };

  return {
    success: true,
    data: result,
    meta: {
      date: dateString,
      lang,
      timestamp: new Date().toISOString(),
    },
  };
}
