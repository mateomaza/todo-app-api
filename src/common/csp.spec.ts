import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { CspTestModule } from './csp-test.module';

describe('CSP Implementation', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [CspTestModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('should have correct CSP headers set', async () => {
    const response = await request(app.getHttpServer()).get('/');
    expect(response.headers['content-security-policy']).toBeDefined();
  });

  it('should accept and process CSP violation reports', async () => {
    const mockCspReport = {
      'csp-report': {
        'document-uri': 'http://example.com',
        referrer: '',
        'violated-directive': 'script-src',
        'effective-directive': 'script-src',
      },
    };

    const response = await request(app.getHttpServer())
      .post('/report-csp-violation')
      .send(JSON.stringify(mockCspReport))
      .set('Content-Type', 'application/csp-report');

    expect(response.status).toBe(204);
  });

  afterAll(async () => {
    await app.close();
  });
});
