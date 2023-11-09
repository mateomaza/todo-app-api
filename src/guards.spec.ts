import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { TaskModule } from './todo/task/task.module';
import { Task, TaskSchema } from './todo/task/task.model';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongooseModule } from '@nestjs/mongoose';

describe('Guard Integration', () => {
  let app: INestApplication;
  let mongoMemoryServer: MongoMemoryServer;

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
    }).compile();

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
    await app.close();
    await mongoMemoryServer.stop();
  });
});
