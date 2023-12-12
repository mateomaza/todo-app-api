import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import helmet from 'helmet';
import { AppController } from 'src/app.controller';
import { AppService } from 'src/app.service';
import {
  INestApplication,
  MiddlewareConsumer,
  NestModule,
  Module,
} from '@nestjs/common';

@Module({
  controllers: [AppController],
  providers: [AppService],
})
class TestModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(
        helmet({
          contentSecurityPolicy: {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'"],
              reportUri: '/report-csp-violation',
            },
          },
        }),
      )
      .forRoutes('*');
  }
}

describe('CSP Implementation', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [TestModule],
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
