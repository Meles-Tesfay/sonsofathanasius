import { Request, Response } from 'express';
import { ValidatedRequest } from '../validators/queryValidator.js';
import { DailyQueryParams } from '../validators/publicQueryValidator.js';

export interface DailyReadingItem {
  saintOfTheDay: Record<string, string>;
  scriptureReading: {
    reference: Record<string, string>;
    text: Record<string, string>;
  };
  patristicQuote: {
    author: Record<string, string>;
    source: Record<string, string>;
    quote: Record<string, string>;
  };
}

/**
 * Curated Patristic & Orthodox Spiritual Lectionary Reservoir
 */
const DAILY_READINGS_RESERVOIR: DailyReadingItem[] = [
  {
    saintOfTheDay: {
      am: 'ቅዱስ አትናቴዎስ ሐዋርያዊ (ሊቀ ጳጳሳት ዘእስክንድርያ)',
      en: 'St. Athanasius the Apostolic (Patriarch of Alexandria)',
      om: 'Qulqulluu Ataanaatewoos Ergamaa (Phaaphaasii Iskindiriyaa)',
      ti: 'ቅዱስ ኣትናቴዎስ ሃዋርያዊ (ሊቀ ጳጳሳት ናይ እስክንድርያ)',
    },
    scriptureReading: {
      reference: {
        am: 'ዮሐ 1:1-5',
        en: 'John 1:1-5',
        om: 'Yoh 1:1-5',
        ti: 'ዮሐ 1:1-5',
      },
      text: {
        am: 'በመጀመሪያ ቃል ነበረ፥ ቃልም በእግዚአብሔር ዘንድ ነበረ፥ ቃልም እግዚአብሔር ነበረ።',
        en: 'In the beginning was the Word, and the Word was with God, and the Word was God.',
        om: 'Jalqaba irratti Sagaletu ture, Sagalichis Waaqayyo bira ture, Sagalichis Waaqayyo ture.',
        ti: 'ብመጀመርታ ቓል ነበረ፡ እቲ ቓል ከኣ ኣብ ኣምላኽ ነበረ፡ እቲ ቓል እውን ኣምላኽ ነበረ።',
      },
    },
    patristicQuote: {
      author: {
        am: 'ቅዱስ አትናቴዎስ ሐዋርያዊ',
        en: 'St. Athanasius the Apostolic',
        om: 'Qulqulluu Ataanaatewoos',
        ti: 'ቅዱስ ኣትናቴዎስ',
      },
      source: {
        am: 'ነገረ ሥጋዌ (ስለ ሰው መሆን)',
        en: 'On the Incarnation (De Incarnatione)',
        om: 'Waa\'ee Nama Ta\'uu (De Incarnatione)',
        ti: 'ነገረ ስጋዌ (ብዛዕባ ሰብ ምዃን)',
      },
      quote: {
        am: 'እኛ በጸጋ አማልክት እንሆን ዘንድ እርሱ በባሕርዩ ሰው ሆነ።',
        en: 'He became what we are that He might make us what He is.',
        om: 'Nuyi ayyaanaan ijoollee Waaqayyoo akka taanuuf, Inni nama ta\'e.',
        ti: 'ንሕና ብጸጋ ውሉድ ኣምላኽ ምእንቲ ኽንከውን፡ ንሱ ብባህሪኡ ሰብ ኮነ።',
      },
    },
  },
  {
    saintOfTheDay: {
      am: 'ቅዱስ ዮሐንስ አፈወርቅ (ሊቀ ጳጳሳት ዘቍስጥንጥንያ)',
      en: 'St. John Chrysostom (Archbishop of Constantinople)',
      om: 'Qulqulluu Yohaannis Afaan Warqee',
      ti: 'ቅዱስ ዮሐንስ ኣፈወርቅ',
    },
    scriptureReading: {
      reference: {
        am: 'ማቴ 5:14-16',
        en: 'Matt 5:14-16',
        om: 'Mat 5:14-16',
        ti: 'ማቴ 5:14-16',
      },
      text: {
        am: 'እናንተ የዓለም ብርሃን ናችሁ፤ በተራራ ላይ ያለች ከተማ ልትሰወር አይቻላትም።',
        en: 'You are the light of the world. A city that is set on a hill cannot be hidden.',
        om: 'Isin ifa biyya lafaati; mandarri tulluu gubbaa jirtu dhokachuu hin dandeessu.',
        ti: 'ንስኻትኩም ብርሃን ዓለም ኢኹም፤ ኣብ ከረን ዘላ ኸተማ ኽትስወር ኣይከኣላን እዩ።',
      },
    },
    patristicQuote: {
      author: {
        am: 'ቅዱስ ዮሐንስ አፈወርቅ',
        en: 'St. John Chrysostom',
        om: 'Qulqulluu Yohaannis Afaan Warqee',
        ti: 'ቅዱስ ዮሐንስ ኣፈወርቅ',
      },
      source: {
        am: 'ድርሳነ ጸሎት',
        en: 'Homilies on Prayer',
        om: 'Lallaba Kadhannaa',
        ti: 'ድርሳን ጸሎት',
      },
      quote: {
        am: 'ጸሎት የነፍስ እስትንፋስ፣ የሕይወት መሠረትና ከመላእክት ጋር የመነጋገር በር ነው።',
        en: 'Prayer is the root, the fountain, the mother of a thousand blessings.',
        om: 'Kadhannaan hafuura lubbuuti, bu\'uura jireenyaati.',
        ti: 'ጸሎት እስትንፋስ ነፍሲ፡ መሰረት ህይወትን ምስ መላእኽቲ ናይ ምዝርራብ ማዕጾን እዩ።',
      },
    },
  },
  {
    saintOfTheDay: {
      am: 'ቅዱስ ቄርሎስ ዓምደ ሃይማኖት (ሊቀ ጳጳሳት ዘእስክንድርያ)',
      en: 'St. Cyril Pillar of Faith (Patriarch of Alexandria)',
      om: 'Qulqulluu Qerloos Utubaa Amantaa',
      ti: 'ቅዱስ ቄርሎስ ዓንዲ ሃይማኖት',
    },
    scriptureReading: {
      reference: {
        am: 'ዮሐ 10:30',
        en: 'John 10:30',
        om: 'Yoh 10:30',
        ti: 'ዮሐ 10:30',
      },
      text: {
        am: 'እኔና አብ አንድ ነን።',
        en: 'I and My Father are one.',
        om: 'Anii fi Abbaan tokko.',
        ti: 'ኣነን ኣቦን ሓደ ኢና።',
      },
    },
    patristicQuote: {
      author: {
        am: 'ቅዱስ ቄርሎስ ዓምደ ሃይማኖት',
        en: 'St. Cyril of Alexandria',
        om: 'Qulqulluu Qerloos',
        ti: 'ቅዱስ ቄርሎስ',
      },
      source: {
        am: 'ሃይማኖተ አበው',
        en: 'Faith of the Fathers',
        om: 'Amantaa Abbootii',
        ti: 'ሃይማኖተ ኣበው',
      },
      quote: {
        am: 'የእግዚአብሔር ቃል ሥጋ ሆነ ስንል መለኮቱ ተለወጠ ማለታችን አይደለም፤ ከሁለት ባሕርይ አንድ አካል አንድ ባሕርይ ሆነ እንላለን እንጂ።',
        en: 'One incarnate nature of God the Word, unmixed and indivisible.',
        om: 'Sagalichi Waaqayyoo foon uffate jennee yeroo dubbannu tokkummaa qabaachuusaa lallabna.',
        ti: 'ቓል ኣምላኽ ስጋ ኮነ ኽንብል ከለና፡ ካብ ክልተ ባህሪ ሓደ ኣካል ሓደ ባህሪ ኾነ እምበር መለኮቱ ተለወጠ ማለትና ኣይኮነን።',
      },
    },
  },
  {
    saintOfTheDay: {
      am: 'አባ ጊዮርጊስ ዘጋስጫ (ኢትዮጵያዊው ሊቅ)',
      en: 'Abba Giyorgis of Gasicha (Ethiopian Doctor of the Church)',
      om: 'Abbaa Giyoorgis Za Gaasichaa',
      ti: 'ኣባ ጊዮርጊስ ዘጋስጫ',
    },
    scriptureReading: {
      reference: {
        am: 'ቆላ 1:15-17',
        en: 'Col 1:15-17',
        om: 'Qol 1:15-17',
        ti: 'ቆላ 1:15-17',
      },
      text: {
        am: 'እርሱም የማይታይ አምላክ አምሳል ነው፤ ፍጥረታት ሁሉ በእርሱና ለእርሱ ተፈጥረዋል።',
        en: 'He is the image of the invisible God, the firstborn of all creation.',
        om: 'Inni fakkaattii Waaqayyo isa hin mul\'annee ti; uumamni hundi isaan uumame.',
        ti: 'ንሱ ምስሊ እቲ ዘይርአ ኣምላኽ እዩ፤ ፍጥረት ኩሉ ብእኡን ንዕኡን ተፈጢሩ።',
      },
    },
    patristicQuote: {
      author: {
        am: 'አባ ጊዮርጊስ ዘጋስጫ',
        en: 'Abba Giyorgis of Gasicha',
        om: 'Abbaa Giyoorgis',
        ti: 'ኣባ ጊዮርጊስ ዘጋስጫ',
      },
      source: {
        am: 'መጽሐፈ ምሥጢር (Book of Mystery)',
        en: 'Metsihafe Mistir (Book of Mystery)',
        om: 'Metsihafe Mistir (Kitaaba Iccitii)',
        ti: 'መጽሐፈ ምስጢር',
      },
      quote: {
        am: 'በሦስትነቱ ሳይነጣጠል፣ በአንድነቱ ሳይደባለቅ የሚኖር እውነተኛ አምላክ እግዚአብሔር ብቻ ነው።',
        en: 'God exists eternally in Trinity without division, and in Unity without confusion.',
        om: 'Waaqayyo tokkummaasaatiin osoo hin makamin, sadummaasaatiin osoo hin gargar ba\'in jiraata.',
        ti: 'ብመለኮቱ ሓደ፡ ብስሙን ብኣካሉን ሰለስተ ኾይኑ ዝነብር ናይ ሓቂ ኣምላኽ እግዚኣብሔር ጥራይ እዩ።',
      },
    },
  },
];

/**
 * Calculates current day of year (1 - 366)
 */
function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime() + (start.getTimezoneOffset() - date.getTimezoneOffset()) * 60 * 1000;
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

/**
 * Approximate Ethiopian Calendar Date String
 */
function getApproximateEthiopianDate(date: Date): string {
  const monthNamesEth = ['መስከረም', 'ጥቅምት', 'ኅዳር', 'ታኅሣሥ', 'ጥር', 'የካቲት', 'መጋቢት', 'ሚያዝያ', 'ግንቦት', 'ሰኔ', 'ሐምሌ', 'ነሐሴ', 'ጳጉሜን'];
  
  // Ethiopian new year is Sept 11 (or Sept 12 in leap years)
  const gYear = date.getFullYear();
  const gMonth = date.getMonth(); // 0-indexed
  const gDay = date.getDate();

  let ethYear = gYear - 8;
  if (gMonth > 8 || (gMonth === 8 && gDay >= 11)) {
    ethYear = gYear - 7;
  }

  // Sample rough mapping for day of year
  const ethMonthIndex = (gMonth + 4) % 12;
  const ethMonthName = monthNamesEth[ethMonthIndex];
  const ethDay = ((gDay + 10) % 30) + 1;

  return `${ethMonthName} ${ethDay} ${ethYear}`;
}

/**
 * Get Daily Lectionary & Patristic Reading
 * GET /api/v1/daily?lang=am
 */
export async function getDailyReading(req: Request, _res: Response) {
  const query = (req as ValidatedRequest<DailyQueryParams>).validatedQuery || { lang: 'am' };
  const lang = query.lang || 'am';
  const now = new Date();
  const dayOfYear = getDayOfYear(now);
  const isoDate = now.toISOString().slice(0, 10);
  const ethiopianDate = getApproximateEthiopianDate(now);

  const readingIndex = (dayOfYear - 1) % DAILY_READINGS_RESERVOIR.length;
  const item = DAILY_READINGS_RESERVOIR[readingIndex];

  const getLoc = (dict: Record<string, string>): string => {
    return dict[lang] || dict['am'] || dict['en'] || Object.values(dict)[0] || '';
  };

  const responseData = {
    date: isoDate,
    dayOfYear,
    ethiopianDate,
    langCode: lang,
    saintOfTheDay: getLoc(item.saintOfTheDay),
    scriptureReading: {
      reference: getLoc(item.scriptureReading.reference),
      text: getLoc(item.scriptureReading.text),
    },
    patristicQuote: {
      author: getLoc(item.patristicQuote.author),
      source: getLoc(item.patristicQuote.source),
      quote: getLoc(item.patristicQuote.quote),
    },
  };

  return {
    success: true,
    data: responseData,
    meta: {
      timestamp: new Date().toISOString(),
      lang,
    },
  };
}
