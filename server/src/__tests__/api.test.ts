import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import app from '../index.js'; // The app is exported without starting the server when NODE_ENV=test

describe('B9: API Integration Tests', () => {
  describe('Health Endpoint', () => {
    it('GET /api/v1/health -> 200 with proper envelope', async () => {
      const response = await request(app).get('/api/v1/health');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('healthy');
      expect(response.body.meta).toHaveProperty('timestamp');
    });
  });

  describe('Contact Form (B8)', () => {
    it('POST /api/v1/contact with valid payload -> 200', async () => {
      const response = await request(app)
        .post('/api/v1/contact')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          subject: 'Test Subject',
          message: 'This is a test message that is at least 10 characters long.',
        });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('Message received successfully.');
    });

    it('POST /api/v1/contact with invalid payload -> 400', async () => {
      const response = await request(app)
        .post('/api/v1/contact')
        .send({
          name: 'T', // Too short
          email: 'not-an-email',
          message: 'short',
        });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Validation failed');
    });

    it('POST /api/v1/contact triggers rate limiting on spam (429)', async () => {
      // The rate limit for contact is 5 per 15 minutes.
      // We already sent two requests above (one valid, one invalid).
      // We'll send 4 more to ensure it blocks on the 6th total request.
      for (let i = 0; i < 3; i++) {
        await request(app).post('/api/v1/contact').send({
          name: 'Spammer',
          email: 'spam@example.com',
          message: 'Spam message over 10 chars.',
        });
      }
      
      const response = await request(app)
        .post('/api/v1/contact')
        .send({
          name: 'Spammer',
          email: 'spam@example.com',
          message: 'Spam message over 10 chars.',
        });
      
      expect(response.status).toBe(429);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('limit reached');
    });
  });

  describe('Missing / 404 Route', () => {
    it('GET /api/v1/nonexistent -> 404', async () => {
      const response = await request(app).get('/api/v1/nonexistent');
      
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('API route not found');
    });
  });

  // ---------------------------------------------------------
  // Placeholders for teammate integrations (B9 Plan)
  // ---------------------------------------------------------
  describe('Category Controller (Teammate B6)', () => {
    it.todo('GET /api/v1/categories -> returns 5 core categories with multilingual descriptions');
  });

  describe('Article Controller Fallback (Teammate B6)', () => {
    it.todo('GET /api/v1/articles/:slug?lang=om -> returns Amharic with isFallback: true');
  });

  describe('Search Engine (Teammate B3)', () => {
    it.todo('GET /api/v1/search?q=ስላሴ -> returns matches with Amharic normalization (ሥላሴ)');
  });
});
