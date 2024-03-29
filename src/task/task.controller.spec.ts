import { Test, TestingModule } from '@nestjs/testing';
import { TaskModule } from './task.module';
import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { TaskService } from './task.service';
import { Task, TaskSchema } from './task.model';
import { v4 as uuidv4 } from 'uuid';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtAuthGuard } from 'src/auth/jwt.auth.guard';
import { AuditLogService } from 'src/audit/audit-log.service';
import mockEnv from 'mocked-env';
import { EventEmitterModule } from '@nestjs/event-emitter';

describe('TaskController (e2e)', () => {
  let app: INestApplication;
  let mongoMemoryServer: MongoMemoryServer;
  let taskService: jest.Mocked<TaskService>;
  let restoreEnv: () => void;

  const mockTask: Partial<Task> = {
    id: uuidv4(),
    title: 'Test Task',
    description: 'Test Description',
    completed: true,
    time: new Date().toISOString(),
    createdAt: new Date(),
  };
  const mockUncompleted: Partial<Task>[] = [
    { id: uuidv4(), completed: false },
    { id: uuidv4(), completed: false },
    { id: uuidv4(), completed: false },
  ];
  const taskArray: Partial<Task>[] = [mockTask, mockTask, mockTask];

  const mockAuditLogService: Partial<AuditLogService> = {
    logEntry: jest.fn(),
  };

  beforeAll(async () => {
    mongoMemoryServer = await MongoMemoryServer.create();
    restoreEnv = mockEnv({
      JWT_SECRET_KEY: 'test-key',
    });
    const mockTaskService: Partial<jest.Mocked<TaskService>> = {
      create: jest.fn(),
      findAll: jest.fn(),
      findById: jest.fn(),
      findUncompletedTasks: jest.fn(),
      searchTasks: jest.fn(),
      update: jest.fn().mockImplementation((id, updateTaskDto) => {
        if (id === mockTask.id) {
          return Promise.resolve({ ...mockTask, ...updateTaskDto });
        } else {
          return Promise.reject(new Error('Task not found'));
        }
      }),
      remove: jest.fn().mockImplementation((id) => {
        if (id === mockTask.id) {
          return Promise.resolve(undefined);
        } else {
          return Promise.resolve(undefined);
        }
      }),
    };
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        MongooseModule.forRootAsync({
          useFactory: async () => ({
            uri: mongoMemoryServer.getUri(),
          }),
        }),
        MongooseModule.forFeature([{ name: Task.name, schema: TaskSchema }]),
        TaskModule,
        EventEmitterModule.forRoot(),
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: true })
      .overrideProvider(TaskService)
      .useValue(mockTaskService as jest.Mocked<TaskService>)
      .overrideProvider(AuditLogService)
      .useValue(mockAuditLogService as jest.Mocked<AuditLogService>)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    taskService = app.get(TaskService);
    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should retrieve all tasks', async () => {
    taskService.findAll.mockResolvedValue(taskArray as Task[]);
    const response = await request(app.getHttpServer())
      .get('/api/tasks')
      .expect(HttpStatus.OK);
    response.body.forEach((task: Task) => {
      expect(task).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          title: expect.any(String),
          description: expect.any(String),
          completed: expect.any(Boolean),
          time: expect.any(String),
          createdAt: expect.any(String),
        }),
      );
    });
  });

  it('should retrieve all uncompleted tasks', async () => {
    taskService.findUncompletedTasks.mockResolvedValue(
      mockUncompleted as Task[],
    );
    const response = await request(app.getHttpServer())
      .get('/api/tasks/find/uncompleted')
      .expect(HttpStatus.OK);
    expect(Array.isArray(response.body)).toBeTruthy();
    expect(response.body).toEqual(
      expect.arrayContaining([expect.objectContaining({ completed: false })]),
    );
  });

  it('should retrieve a task based on the id', async () => {
    taskService.findById.mockResolvedValue(mockTask as Task);
    const response = await request(app.getHttpServer())
      .get(`/api/tasks/${mockTask.id}`)
      .expect(HttpStatus.OK);
    expect(response.body).toEqual(
      expect.objectContaining({
        id: mockTask.id,
        title: mockTask.title,
        description: mockTask.description,
        completed: mockTask.completed,
        time: expect.any(String),
        createdAt: expect.any(String),
      }),
    );
  });

  it('should create a task', async () => {
    taskService.create.mockResolvedValue(mockTask as Task);
    const response = await request(app.getHttpServer())
      .post('/api/tasks/create')
      .send({
        title: 'Test Task',
        description: 'Test Description',
        completed: true,
        time: mockTask.time,
        createdAt: mockTask.createdAt,
        userId: 'userid-123',
      })
      .expect(HttpStatus.CREATED);
    expect(response.body).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        title: 'Test Task',
        description: 'Test Description',
        completed: true,
        time: expect.any(String),
        createdAt: expect.any(String),
      }),
    );
  });

  it('should update a task', async () => {
    const updatedTask: Partial<Task> = {
      ...mockTask,
      title: 'Updated Task Title',
    };
    taskService.update.mockResolvedValue(updatedTask as Task);
    const response = await request(app.getHttpServer())
      .patch(`/api/tasks/${mockTask.id}/update`)
      .send({
        title: 'Updated Task Title',
        completed: true,
        time: mockTask.time,
        userId: 'user123',
      })
      .expect(HttpStatus.OK);
    expect(response.body).toEqual(
      expect.objectContaining({
        id: mockTask.id,
        title: 'Updated Task Title',
        description: 'Test Description',
        completed: true,
        time: mockTask.time,
        createdAt: mockTask.createdAt.toISOString(),
      }),
    );
  });

  it('should delete a task', async () => {
    const response = await request(app.getHttpServer()).delete(
      `/api/tasks/${mockTask.id}/delete`,
    );
    expect(response.status).toBe(HttpStatus.NO_CONTENT);
  });

  it('should validate field types in CreateTaskDto', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/tasks/create')
      .send({
        title: 123,
        description: true,
        completed: 'yes',
        time: 420,
      })
      .expect(HttpStatus.BAD_REQUEST);
    expect(response.body.message).toEqual(
      expect.arrayContaining([
        'Title must be a string',
        'Description must be a string',
        'Completed must be a boolean',
        'Time must be an ISO date string',
      ]),
    );
  });

  it('should proceed when optional fields (description) are absent in CreateTaskDto', async () => {
    taskService.create.mockResolvedValue(mockTask as Task);
    const response = await request(app.getHttpServer())
      .post('/api/tasks/create')
      .send({
        title: 'Test Task',
        completed: true,
        time: mockTask.time,
        userId: 'userid-123',
      })
      .expect(HttpStatus.CREATED);

    expect(response.body).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        title: 'Test Task',
        completed: true,
        time: expect.any(String),
      }),
    );
  });

  it('should validate field types in UpdateTaskDto', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/tasks/${mockTask.id}/update`)
      .send({
        title: 123,
        description: true,
        completed: 'yes',
        time: 420,
      })
      .expect(HttpStatus.BAD_REQUEST);
    expect(response.body.message).toEqual(
      expect.arrayContaining([
        'Title must be a string',
        'Description must be a string',
        'Completed must be a boolean',
        'Time must be an ISO date string',
      ]),
    );
  });

  it('should successfully search tasks with a given query', async () => {
    const query = 'Test Task';
    taskService.searchTasks.mockResolvedValue(taskArray as Task[]);
    const response = await request(app.getHttpServer())
      .get(`/api/tasks/search/for?query=${query}`)
      .expect(HttpStatus.OK);
    expect(response.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: expect.any(String),
          title: expect.any(String),
          description: expect.any(String),
          completed: expect.any(Boolean),
          time: expect.any(String),
          createdAt: expect.any(String),
        }),
      ]),
    );
  });

  it('should return an empty object for a search query with no matches', async () => {
    const query = 'Nonexistent Task';
    taskService.searchTasks.mockResolvedValue([]);
    const response = await request(app.getHttpServer())
      .get(`/api/tasks/search/for?query=${query}`)
      .expect(HttpStatus.OK);
    expect(response.body).toEqual([]);
  });

  afterAll(async () => {
    restoreEnv();
    await app.close();
    await mongoMemoryServer.stop();
  });
});
