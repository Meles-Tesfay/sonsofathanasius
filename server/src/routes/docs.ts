import { Router, Request, Response } from 'express';
import swaggerUi from 'swagger-ui-express';
import { openApiSpec } from '../config/swagger.js';
import { config } from '../config/index.js';
import { notFoundHandler } from '../middleware/errorHandler.js';

const router = Router();

if (config.enableSwagger) {
  // 1. Raw OpenAPI 3.0 JSON specification
  router.get('/docs.json', (_req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/json');
    res.json(openApiSpec);
  });

  // 2. Swagger UI Interactive Explorer
  router.use(
    '/docs',
    swaggerUi.serve,
    swaggerUi.setup(openApiSpec, {
      customSiteTitle: 'ደቂቀ አትናቴዎስ (Sons of Athanasius) — API Docs',
      customCss: `
        .swagger-ui .topbar { background-color: #7a0c0c; border-bottom: 2px solid #d4af37; }
        .swagger-ui .topbar .download-url-wrapper { display: none; }
        .swagger-ui .info .title { color: #7a0c0c; font-family: 'Noto Serif Ethiopic', serif; }
        .swagger-ui .btn.authorize { background-color: #7a0c0c; border-color: #7a0c0c; color: #fff; }
        .swagger-ui .btn.authorize svg { fill: #fff; }
      `,
      swaggerOptions: {
        persistAuthorization: true,
        docExpansion: 'list',
        filter: true,
      },
    })
  );
} else {
  // In production (unless ENABLE_SWAGGER=true), Swagger UI is disabled and returns 404
  router.use('/docs', notFoundHandler);
  router.get('/docs.json', notFoundHandler);
}

export default router;
