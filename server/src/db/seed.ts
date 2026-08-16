import { db, poolConnection } from './index.js';
import { categories, content, contentTranslations, contentMedia, tags, contentTags } from './schema.js';
import { eq } from 'drizzle-orm';
import sanitizeHtml from 'sanitize-html';

async function seed() {
  console.log('🌱 [Seed] Starting database seeding for Sons of Athanasius...');

  // 1. Seed Core Categories
  console.log('🌱 [Seed] Seeding 5 Core Categories...');
  const categoryData = [
    {
      slug: 'christianity',
      nameEn: 'Christianity',
      nameAm: 'በእንተ ክርስትና',
      nameOm: "Waa'ee Kiristaanummaa",
      nameTi: 'ብዛዕባ ክርስትና',
      description: 'Orthodox Christian theology, Christology, Trinity, scriptural consistency, and Early Church patristics.',
      sortOrder: 1,
      isActive: 1,
    },
    {
      slug: 'islamic',
      nameEn: 'Islamic Dialogue',
      nameAm: 'በእንተ እስልምና',
      nameOm: "Waa'ee Islaamummaa",
      nameTi: 'ብዛዕባ እስልምና',
      description: 'Christian-Islamic interfaith dialogues, historical inquiry, and scriptural analysis.',
      sortOrder: 2,
      isActive: 1,
    },
    {
      slug: 'testimonies',
      nameEn: 'Testimonies',
      nameAm: 'ምስክርነቶች',
      nameOm: "Dhugaa Ba'umsa",
      nameTi: 'ምስክርነታት',
      description: 'Real-life conversion and spiritual transformation stories.',
      sortOrder: 3,
      isActive: 1,
    },
    {
      slug: 'atheism',
      nameEn: 'Atheism & Reason',
      nameAm: 'በእንተ ኢ-አማኒነት',
      nameOm: 'Waa\'ee Waaqayyo Maleeyyii',
      nameTi: 'ብዛዕባ ዘይኣማንነት',
      description: 'Orthodox Christian philosophical and rational responses to secularism and atheism.',
      sortOrder: 4,
      isActive: 1,
    },
    {
      slug: 'spiritual-teachings',
      nameEn: 'Spiritual Teachings',
      nameAm: 'መንፈሳዊ ትምህርቶች',
      nameOm: 'Barnoota Afuuraa',
      nameTi: 'መንፈሳዊ ትምህርትታት',
      description: 'Spiritual growth, ascetic teachings, prayers, and Orthodox Christian life.',
      sortOrder: 5,
      isActive: 1,
    },
  ];

  const categoryMap = new Map<string, number>();

  for (const cat of categoryData) {
    const existing = await db.select().from(categories).where(eq(categories.slug, cat.slug)).limit(1);
    if (existing.length === 0) {
      const [insertResult] = await db.insert(categories).values(cat);
      categoryMap.set(cat.slug, insertResult.insertId);
      console.log(`   ✓ Inserted category: ${cat.slug} (ID: ${insertResult.insertId})`);
    } else {
      categoryMap.set(cat.slug, existing[0].id);
      console.log(`   ℹ Category already exists: ${cat.slug} (ID: ${existing[0].id})`);
    }
  }

  // 2. Seed Foundational Tags
  console.log('🌱 [Seed] Seeding Foundational Tags...');
  const tagData = [
    { slug: 'trinity', name: 'ሥላሴ | Trinity' },
    { slug: 'christology', name: 'ክርስቶሎጂ | Christology' },
    { slug: 'patristics', name: 'ትምህርተ አበው | Patristics' },
    { slug: 'scripture', name: 'ቅዱሳት መጻሕፍት | Scripture' },
    { slug: 'apologetics', name: 'ዕቅበተ እምነት | Apologetics' },
    { slug: 'church-history', name: 'ታሪከ ቤተክርስቲያን | Church History' },
    { slug: 'salvation', name: 'ደህንነት | Soteriology' },
  ];

  const tagMap = new Map<string, number>();

  for (const tag of tagData) {
    const existing = await db.select().from(tags).where(eq(tags.slug, tag.slug)).limit(1);
    if (existing.length === 0) {
      const [insertResult] = await db.insert(tags).values(tag);
      tagMap.set(tag.slug, insertResult.insertId);
      console.log(`   ✓ Inserted tag: ${tag.slug}`);
    } else {
      tagMap.set(tag.slug, existing[0].id);
      console.log(`   ℹ Tag already exists: ${tag.slug}`);
    }
  }

  // 3. Seed Sample Apologetics Articles with Multilingual Content
  console.log('🌱 [Seed] Seeding Sample Articles & Translations...');

  const sampleArticles = [
    {
      categorySlug: 'christianity',
      authorName: 'ዘአትናቴዎስ (Zeathanasius)',
      coverImage: 'https://images.unsplash.com/photo-1548625361-195fe578ae5a?q=80&w=1000&auto=format&fit=crop',
      tags: ['christology', 'scripture', 'apologetics'],
      translations: [
        {
          langCode: 'am',
          title: 'የኢየሱስ ክርስቶስ አምላክነት በቅዱሳት መጻሕፍት ብርሃን',
          slug: 'deity-of-jesus-christ-scripture',
          summary: 'በኦርቶዶክሳዊት ተዋሕዶ ቤተክርስቲያን አስተምህሮ መሠረት የጌታችን የኢየሱስ ክርስቶስ ፍጹም አምላክነት በብሉይና በሐዲስ ኪዳን የተረጋገጠበት ጥናታዊ ማብራሪያ።',
          body: `<p>የጌታችንና የመድኃኒታችን የኢየሱስ ክርስቶስ ፍጹም አምላክነትና ፍጹም ሰውነት የክርስትና እምነት መሠረትና ማዕከል ነው። በቅዱሳት መጻሕፍት እንደተገለጠው፣ ቃል ሥጋ ሆነ <span data-ref="ዮሐ 1:14" class="scripture-citation">[ዮሐ 1:14]</span>።</p>
<h2>፩. የክርስቶስ የዘላለም አምላክነት</h2>
<p>በወንጌላዊው ዮሐንስ መጽሐፍ መጀመሪያ ላይ እንደተጻፈው፡ «በመጀመሪያው ቃል ነበረ፥ ቃልም በእግዚአብሔር ዘንድ ነበረ፥ ቃልም እግዚአብሔር ነበረ» <span data-ref="ዮሐ 1:1" class="scripture-citation">[ዮሐ 1:1]</span>። ይህ ቃል ፍጡር ሳይሆን ፈጣሪ መሆኑን ሐዋርያው ያረጋግጣል።</p>
<blockquote>«እኔና አብ አንድ ነን» <span data-ref="ዮሐ 10:30" class="scripture-citation">[ዮሐ 10:30]</span></blockquote>
<h2>፪. የቅዱሳን አበው ምስክርነት</h2>
<p>ታላቁ ቅዱስ አትናቴዎስ እንዳስተማረው፡ «እኛ የእግዚአብሔር ልጆች እንሆን ዘንድ እርሱ የሰው ልጅ ሆነ፤ እኛ አምላካዊውን ባሕርይ እንካፈል ዘንድ እርሱ ሰው ሆነ።»</p>`,
        },
        {
          langCode: 'en',
          title: 'The Deity of Jesus Christ in the Light of Holy Scripture',
          slug: 'deity-of-jesus-christ-scripture',
          summary: 'A theological study confirming the full deity of our Lord Jesus Christ in the Old and New Testaments according to the Ethiopian Orthodox Tewahedo Church.',
          body: `<p>The full deity and full humanity of our Lord and Savior Jesus Christ is the cornerstone of Christian doctrine. As revealed in the Holy Scriptures, the Word became flesh <span data-ref="John 1:14" class="scripture-citation">[John 1:14]</span>.</p>
<h2>1. The Eternal Deity of Christ</h2>
<p>As written at the beginning of the Gospel of John: "In the beginning was the Word, and the Word was with God, and the Word was God" <span data-ref="John 1:1" class="scripture-citation">[John 1:1]</span>.</p>
<blockquote>"I and the Father are one." <span data-ref="John 10:30" class="scripture-citation">[John 10:30]</span></blockquote>
<h2>2. Patristic Witness</h2>
<p>As Saint Athanasius the Great famously declared: "God became man so that man might become god."</p>`,
        },
        {
          langCode: 'om',
          title: 'Waaqummaa Yesuus Kiristoos Ifa Kitaaba Qulqulluutiin',
          slug: 'deity-of-jesus-christ-scripture',
          summary: 'Barnoota Waldaa Ortodoksii Tawaahidoo irratti hundaa\'uun Waaqummaa Gooftaa keenya Yesuus Kiristoos ibsu.',
          body: `<p>Waaqummaa fi namummaan Gooftaa keenya Yesuus Kiristoos bu\'uura amantii Kiristaanaati <span data-ref="Yoh 1:14" class="scripture-citation">[Yoh 1:14]</span>.</p>
<h2>1. Waaqummaa Isa Bara Baraa</h2>
<p>Wangeela Yohaannis irratti: "Jalqaba irratti dubbiin ture, dubbiinis Waaqayyo bira ture, dubbiinis Waaqayyo ture" <span data-ref="Yoh 1:1" class="scripture-citation">[Yoh 1:1]</span>.</p>`,
        },
        {
          langCode: 'ti',
          title: 'ኣምላኽነት ኢየሱስ ክርስቶስ ብብርሃን ቅዱሳት መጻሕፍቲ',
          slug: 'deity-of-jesus-christ-scripture',
          summary: 'ብመሰረት ትምህርቲ ኦርቶዶክሳዊት ተዋሕዶ ቤተክርስቲያን ፍጹም ኣምላኽነት ጎይታና ኢየሱስ ክርስቶስ ዘረጋገጸ ጥናታዊ መብርሂ።',
          body: `<p>ፍጹም ኣምላኽነትን ፍጹም ሰብነትን ናይ ጎይታናን መድሓኒናን ኢየሱስ ክርስቶስ ማእከል ናይ ክርስትና እምነት እዩ <span data-ref="ዮሐ 1:14" class="scripture-citation">[ዮሐ 1:14]</span>።</p>
<h2>፩. ናይ ዘለኣለም ኣምላኽነት</h2>
<p>ኣብ ወንጌል ዮሓንስ ከምዝተጻሕፈ፡ «ብመጀመርታ ቓል ነበረ፡ እቲ ቓል ድማ ኣብ ኣምላኽ ነበረ፡ እቲ ቓልውን ኣምላኽ ነበረ» <span data-ref="ዮሐ 1:1" class="scripture-citation">[ዮሐ 1:1]</span>።</p>`,
        },
      ],
      media: [
        {
          mediaKind: 'video' as const,
          platform: 'youtube',
          embedId: 'dQw4w9WgXcQ',
          caption: 'የክርስቶስ አምላክነት ጥናታዊ ትምህርት በቪዲዮ',
        },
      ],
    },
    {
      categorySlug: 'islamic',
      authorName: 'ዘአትናቴዎስ (Zeathanasius)',
      coverImage: 'https://images.unsplash.com/photo-1519817650390-64a93db51149?q=80&w=1000&auto=format&fit=crop',
      tags: ['apologetics', 'scripture', 'church-history'],
      translations: [
        {
          langCode: 'am',
          title: 'የሥላሴ ምስጢር በኦርቶዶክሳዊት ቤተክርስቲያን እይታ',
          slug: 'mystery-of-the-holy-trinity-explained',
          summary: 'አንድ አምላክ በሦስት አካላት (አብ፣ ወልድ፣ መንፈስ ቅዱስ) መገለጡ ለሚነሱ የተለመዱ የተሳሳቱ አመለካከቶች የተሰጠ ጥልቅ ምላሽ።',
          body: `<p>ቅድስት ሥላሴ አንድ አምላክ በሦስት አካላት ሲሆን ይህም አብ፣ ወልድ፣ መንፈስ ቅዱስ ነው። ክርስትና ሦስት አማልክትን አያመልክም፤ ይልቁንም በአንድ ባሕርይና ህልውና ያሉ ሦስት አካላትን ያመልካል <span data-ref="ማቴ 28:19" class="scripture-citation">[ማቴ 28:19]</span>።</p>`,
        },
        {
          langCode: 'en',
          title: 'The Mystery of the Holy Trinity in Orthodox Apologetics',
          slug: 'mystery-of-the-holy-trinity-explained',
          summary: 'A deep patristic defense addressing common misconceptions concerning the One God in Three Persons.',
          body: `<p>The Holy Trinity is One God in Three distinct Persons: Father, Son, and Holy Spirit <span data-ref="Matt 28:19" class="scripture-citation">[Matt 28:19]</span>.</p>`,
        },
      ],
      media: [],
    },
    {
      categorySlug: 'testimonies',
      authorName: 'ዘማሪ ተስፋ ሚካኤል (የቀድሞው አብዱ አደም)',
      coverImage: 'https://images.unsplash.com/photo-1438232992991-995b7058bbb3?q=80&w=1000&auto=format&fit=crop',
      tags: ['salvation', 'church-history'],
      translations: [
        {
          langCode: 'am',
          title: 'ከጨለማ ወደ ድንቅ ብርሃኑ — የቀድሞው አብዱ አደም ምስክርነት',
          slug: 'testimony-abdu-adem-tesfa-michael',
          summary: 'የቀድሞው ሙስሊም ወጣት አብዱ አደም እውነተኛውን የክርስቶስ ፍቅር አውቆ ወደ ኦርቶዶክስ ተዋሕዶ እምነት የመጣበት ድንቅ የሕይወት ምስክርነት።',
          body: `<p>«እኔ የዓለም ብርሃን ነኝ፤ የሚከተለኝ የሕይወት ብርሃን ይሆንለታል እንጂ በጨለማ አይመላለስም» <span data-ref="ዮሐ 8:12" class="scripture-citation">[ዮሐ 8:12]</span>። በሕይወቴ እውነተኛውን ሰላም ስፈልግ ቆይቼ በመጨረሻ በክርስቶስ ፍቅር ተማርኬ ወደ ተዋሕዶ እምነት ተቀላቀልኩ።</p>`,
        },
      ],
      media: [],
    },
  ];

  for (const art of sampleArticles) {
    const categoryId = categoryMap.get(art.categorySlug);
    if (!categoryId) continue;

    // Check if main translation exists
    const amTranslation = art.translations.find((t) => t.langCode === 'am');
    if (!amTranslation) continue;

    const existingTrans = await db
      .select()
      .from(contentTranslations)
      .where(eq(contentTranslations.slug, amTranslation.slug))
      .limit(1);

    let contentId: number;

    if (existingTrans.length === 0) {
      // Create master content
      const [insertContent] = await db.insert(content).values({
        categoryId,
        authorName: art.authorName,
        coverImage: art.coverImage,
        status: 'published',
        pdfEnabled: 1,
        publishedAt: new Date(),
      });

      contentId = insertContent.insertId;
      console.log(`   ✓ Created master article (ID: ${contentId})`);

      // Insert all translations
      for (const t of art.translations) {
        const plainText = sanitizeHtml(t.body, { allowedTags: [] });
        await db.insert(contentTranslations).values({
          contentId,
          langCode: t.langCode,
          title: t.title,
          slug: t.slug,
          summary: t.summary,
          body: t.body,
          bodySearchable: plainText,
        });
        console.log(`      ↳ Added translation [${t.langCode}]: ${t.title.substring(0, 30)}...`);
      }

      // Attach media
      for (const m of art.media) {
        await db.insert(contentMedia).values({
          contentId,
          mediaKind: m.mediaKind,
          platform: m.platform,
          embedId: m.embedId,
          caption: m.caption,
        });
      }

      // Attach tags
      for (const tagSlug of art.tags) {
        const tagId = tagMap.get(tagSlug);
        if (tagId) {
          await db.insert(contentTags).values({ contentId, tagId });
        }
      }
    } else {
      console.log(`   ℹ Article already exists: ${amTranslation.slug}`);
    }
  }

  console.log('✅ [Seed] Database seeding completed successfully!');
}

seed()
  .catch((err) => {
    console.error('❌ [Seed] Error seeding database:', err);
    process.exit(1);
  })
  .finally(async () => {
    await poolConnection.end();
  });
