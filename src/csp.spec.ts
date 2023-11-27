import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { CspTestModule } from './csp-test.module';

describe('CSP Headers', () => {
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

  afterAll(async () => {
    await app.close();
  });
});
