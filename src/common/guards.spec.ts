import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { TaskModule } from '../task/task.module';
import { Task, TaskSchema } from '../task/task.model';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditLogService } from 'src/audit/audit-log.service';

describe('Guard Integration', () => {
  let app: INestApplication;
  let mongoMemoryServer: MongoMemoryServer;

  const mockAuditLogService: Partial<AuditLogService> = {
    logEntry: jest.fn(),
  };

  beforeAll(async () => {
    process.env.JWT_SECRET_KEY = 'test-key';
    mongoMemoryServer = await MongoMemoryServer.create();
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        MongooseModule.forRootAsync({
          useFactory: async () => ({
            uri: mongoMemoryServer.getUri(),
          }),
        }),
        MongooseModule.forFeature([{ name: Task.name, schema: TaskSchema }]),
        TaskModule,
      ],
    })
      .overrideProvider(AuditLogService)
      .useValue(mockAuditLogService as jest.Mocked<AuditLogService>)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('should deny access without a valid jwt token', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/tasks')
      .expect(HttpStatus.UNAUTHORIZED);
    expect(response.body.message).toBe('No auth token');
  });

  afterAll(async () => {
    jest.clearAllMocks();
    await app.close();
    await mongoMemoryServer.stop();
  });
});
