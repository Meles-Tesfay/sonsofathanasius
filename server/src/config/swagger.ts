export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'ደቂቀ አትናቴዎስ (Sons of Athanasius) — REST API',
    version: '2.0.0',
    description:
      'Official API for the Ethiopian Orthodox Tewahedo Church (EOTC) Apologetics & Digital Library platform. Features high-performance in-memory caching, Amharic homophone search, multi-language content delivery (Amharic, English, Afaan Oromoo, Tigrigna), dynamic PDF generation, and rich scripture citation support.',
    contact: {
      name: 'Sons of Athanasius Engineering Team',
      url: 'https://www.sonsofathanasius.com',
      email: 'info@sonsofathanasius.org',
    },
    license: {
      name: 'Proprietary / EOTC',
    },
  },
  servers: [
    {
      url: 'http://localhost:5000/api/v1',
      description: 'Local Development Server',
    },
    {
      url: 'https://www.sonsofathanasius.com/api/v1',
      description: 'Production Server',
    },
  ],
  tags: [
    { name: 'System', description: 'API Health and System Status endpoints' },
    { name: 'Categories', description: 'Multilingual theological category taxonomy' },
    { name: 'Articles', description: 'Public apologetics articles, feeds, and single reader' },
    { name: 'Search', description: 'Amharic homophone normalized in-memory fulltext search' },
    { name: 'PDF', description: 'Pure JavaScript dynamic PDF export with Ethiopic fonts' },
    { name: 'Daily', description: 'Daily lectionary, saints, and patristic quotes' },
    { name: 'Contact', description: 'Contact form submission and inquiries' },
    { name: 'Admin', description: 'Protected content management endpoints (JWT required)' },
  ],
  paths: {
    '/health': {
      get: {
        tags: ['System'],
        summary: 'Health Check & Service Status',
        description: 'Returns the current operating status, API version, environment, and cache metrics.',
        responses: {
          '200': {
            description: 'System is healthy and operational',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/HealthResponse',
                },
              },
            },
          },
        },
      },
    },
    '/search': {
      get: {
        tags: ['Search'],
        summary: 'Full-Text In-Memory Search (Amharic Normalized)',
        description:
          'Searches through published articles using MiniSearch with Ethiopic phonetic homophone normalization (ሀ↔ሐ↔ኀ, ሠ↔ሰ, ዐ↔አ, ጸ↔ፀ), prefix matching, and typo tolerance.',
        parameters: [
          {
            name: 'q',
            in: 'query',
            required: true,
            description: 'Search query string (e.g. "ሥላሴ", "ክርስቶስ", "Trinity")',
            schema: { type: 'string', example: 'ሥላሴ' },
          },
          {
            name: 'lang',
            in: 'query',
            required: false,
            description: 'Content language filter (default: "am")',
            schema: { type: 'string', enum: ['am', 'en', 'om', 'ti'], default: 'am' },
          },
          {
            name: 'category',
            in: 'query',
            required: false,
            description: 'Optional category slug filter (e.g. "christianity")',
            schema: { type: 'string', example: 'christianity' },
          },
          {
            name: 'limit',
            in: 'query',
            required: false,
            description: 'Maximum number of results to return (max: 50, default: 20)',
            schema: { type: 'integer', minimum: 1, maximum: 50, default: 20 },
          },
        ],
        responses: {
          '200': {
            description: 'Matching search results ordered by BM25 relevance score',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/SearchResultItem' },
                    },
                    meta: { $ref: '#/components/schemas/ResponseMeta' },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Invalid query parameters',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/articles/{slug}/pdf': {
      get: {
        tags: ['Articles', 'PDF'],
        summary: 'Download Pre-Generated or On-Demand Article PDF',
        description:
          'Streams static pre-generated A4 PDF document with Unicode NFC normalization and localized typography. Generates on-the-fly and caches to disk if missing.',
        parameters: [
          {
            name: 'slug',
            in: 'path',
            required: true,
            description: 'Article slug',
            schema: { type: 'string', example: 'deity-of-jesus-christ-scripture' },
          },
          {
            name: 'lang',
            in: 'query',
            required: false,
            description: 'Language code (default: "am")',
            schema: { type: 'string', enum: ['am', 'en', 'om', 'ti'], default: 'am' },
          },
        ],
        responses: {
          '200': {
            description: 'Binary PDF Stream',
            content: {
              'application/pdf': {
                schema: { type: 'string', format: 'binary' },
              },
            },
          },
          '404': {
            description: 'Article not found or PDF export disabled',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/admin/covers/upload': {
      post: {
        tags: ['Admin', 'Uploads'],
        summary: 'Upload Article Cover Image',
        description:
          'Uploads and stores a WebP or JPEG cover image with client-side canvas compression (≤500KB) and server-side magic byte validation.',
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  cover: {
                    type: 'string',
                    format: 'binary',
                    description: 'WebP or JPEG image file (max 500KB)',
                  },
                },
                required: ['cover'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Cover image uploaded and verified successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        coverUrl: { type: 'string', example: '/uploads/covers/cover_1723901234_a1b2c3d4.webp' },
                        filename: { type: 'string', example: 'cover_1723901234_a1b2c3d4.webp' },
                        sizeBytes: { type: 'integer', example: 142050 },
                        format: { type: 'string', example: 'webp' },
                      },
                    },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Invalid image format, size exceeded, or magic bytes mismatch',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/contact': {
      post: {
        tags: ['Contact'],
        summary: 'Submit Contact Message',
        description: 'Submits a contact or inquiry message from a user. Highly rate-limited.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ContactForm' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Message received successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        message: { type: 'string', example: 'Message received successfully.' },
                      },
                    },
                    meta: { $ref: '#/components/schemas/ResponseMeta' },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Invalid form payload (Zod validation error)',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '429': {
            description: 'Rate limit exceeded',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your JWT admin token for authorized CMS mutations.',
      },
    },
    schemas: {
      ResponseMeta: {
        type: 'object',
        properties: {
          page: { type: 'integer', example: 1 },
          limit: { type: 'integer', example: 12 },
          total: { type: 'integer', example: 45 },
          totalPages: { type: 'integer', example: 4 },
          cached: { type: 'boolean', example: true },
          timestamp: { type: 'string', format: 'date-time', example: '2026-08-17T06:30:00.000Z' },
        },
        required: ['timestamp'],
      },
      ApiResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: { type: 'object' },
          meta: { $ref: '#/components/schemas/ResponseMeta' },
        },
        required: ['success'],
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: { type: 'string', example: 'Validation failed or resource not found.' },
          meta: { $ref: '#/components/schemas/ResponseMeta' },
        },
        required: ['success', 'error'],
      },
      HealthResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'object',
            properties: {
              app: { type: 'string', example: 'Sons of Athanasius API' },
              version: { type: 'string', example: '2.0.0' },
              status: { type: 'string', example: 'healthy' },
              environment: { type: 'string', example: 'development' },
              timestamp: { type: 'string', format: 'date-time' },
            },
          },
          meta: { $ref: '#/components/schemas/ResponseMeta' },
        },
      },
      ContactForm: {
        type: 'object',
        properties: {
          name: { type: 'string', example: 'John Doe' },
          email: { type: 'string', example: 'john.doe@example.com' },
          subject: { type: 'string', example: 'Question about theology' },
          message: { type: 'string', example: 'I would like to ask about the trinity.' },
        },
        required: ['name', 'email', 'message'],
      },
      Category: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          slug: { type: 'string', example: 'christianity' },
          nameEn: { type: 'string', example: 'Christianity' },
          nameAm: { type: 'string', example: 'በእንተ ክርስትና' },
          nameOm: { type: 'string', example: "Waa'ee Kiristaanummaa" },
          nameTi: { type: 'string', example: 'ብዛዕባ ክርስትና' },
          descriptionEn: { type: 'string', example: 'Orthodox Christian theology and patristics.' },
          descriptionAm: { type: 'string', example: 'የኦርቶዶክሳዊት ተዋሕዶ እምነት አስተምህሮ።' },
          descriptionOm: { type: 'string', example: "Waa'ee amantii Ortodoksii Tawaahidoo." },
          descriptionTi: { type: 'string', example: 'ናይ ኦርቶዶክሳዊት ተዋሕዶ እምነት ትምህርቲ።' },
          sortOrder: { type: 'integer', example: 1 },
          articleCount: { type: 'integer', example: 18 },
        },
      },
      ContentMedia: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          contentId: { type: 'integer', example: 10 },
          mediaKind: { type: 'string', enum: ['video', 'audio'], example: 'video' },
          platform: { type: 'string', enum: ['youtube', 'vimeo', 'soundcloud', 'self-hosted'], example: 'youtube' },
          embedId: { type: 'string', example: 'dQw4w9WgXcQ' },
          caption: { type: 'string', example: 'Theological video explanation' },
          sortOrder: { type: 'integer', example: 0 },
        },
      },
      ArticleListItem: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          categoryId: { type: 'integer', example: 1 },
          categorySlug: { type: 'string', example: 'christianity' },
          categoryName: { type: 'string', example: 'በእንተ ክርስትና' },
          authorName: { type: 'string', example: 'ዘአትናቴዎስ' },
          coverImage: { type: 'string', example: 'https://images.unsplash.com/photo-1548625361-195fe578ae5a' },
          title: { type: 'string', example: 'የኢየሱስ ክርስቶስ አምላክነት በቅዱሳት መጻሕፍት ብርሃን' },
          slug: { type: 'string', example: 'deity-of-jesus-christ-scripture' },
          summary: { type: 'string', example: 'ጥናታዊ የዕቅበተ እምነት ማብራሪያ።' },
          langCode: { type: 'string', example: 'am' },
          pdfEnabled: { type: 'boolean', example: true },
          viewCount: { type: 'integer', example: 342 },
          publishedAt: { type: 'string', format: 'date-time' },
        },
      },
      ArticleDetail: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          categoryId: { type: 'integer', example: 1 },
          categorySlug: { type: 'string', example: 'christianity' },
          categoryName: { type: 'string', example: 'በእንተ ክርስትና' },
          authorName: { type: 'string', example: 'ዘአትናቴዎስ' },
          coverImage: { type: 'string', example: 'https://images.unsplash.com/photo-1548625361-195fe578ae5a' },
          title: { type: 'string', example: 'የኢየሱስ ክርስቶስ አምላክነት በቅዱሳት መጻሕፍት ብርሃን' },
          slug: { type: 'string', example: 'deity-of-jesus-christ-scripture' },
          summary: { type: 'string', example: 'ጥናታዊ የዕቅበተ እምነት ማብራሪያ።' },
          body: { type: 'string', example: '<p>የጌታችንና የመድኃኒታችን የኢየሱስ ክርስቶስ ፍጹም አምላክነት... <span data-ref="ዮሐ 1:1" class="scripture-citation">[ዮሐ 1:1]</span></p>' },
          langCode: { type: 'string', example: 'am' },
          isFallback: { type: 'boolean', example: false },
          availableLanguages: {
            type: 'array',
            items: { type: 'string' },
            example: ['am', 'en', 'om', 'ti'],
          },
          media: {
            type: 'array',
            items: { $ref: '#/components/schemas/ContentMedia' },
          },
          tags: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'integer', example: 1 },
                slug: { type: 'string', example: 'christology' },
                name: { type: 'string', example: 'ክርስቶሎጂ | Christology' },
              },
            },
          },
          pdfEnabled: { type: 'boolean', example: true },
          viewCount: { type: 'integer', example: 342 },
          publishedAt: { type: 'string', format: 'date-time' },
        },
      },
      SearchResultItem: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          contentId: { type: 'integer', example: 1 },
          title: { type: 'string', example: 'የኢየሱስ ክርስቶስ አምላክነት በቅዱሳት መጻሕፍት ብርሃን' },
          slug: { type: 'string', example: 'deity-of-jesus-christ-scripture' },
          summary: { type: 'string', example: 'ጥናታዊ የዕቅበተ እምነት ማብራሪያ።' },
          coverImage: { type: 'string', example: 'https://images.unsplash.com/photo-1548625361-195fe578ae5a' },
          authorName: { type: 'string', example: 'ዘአትናቴዎስ' },
          categorySlug: { type: 'string', example: 'christianity' },
          categoryName: { type: 'string', example: 'በእንተ ክርስትና' },
          langCode: { type: 'string', example: 'am' },
          publishedAt: { type: 'string', format: 'date-time' },
          score: { type: 'number', example: 12.45 },
          match: {
            type: 'object',
            additionalProperties: {
              type: 'array',
              items: { type: 'string' },
            },
            example: { 'ስላሴ': ['title', 'bodySearchable'] },
          },
        },
      },
    },
  },
};
