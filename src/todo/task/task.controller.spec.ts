import { Test, TestingModule } from '@nestjs/testing';
import { TaskModule } from './task.module';
import { JwtAuthGuard } from 'src/auth/jwt.auth.guard';
import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { TaskService } from './task.service';
import { Task, TaskSchema } from './task.model';
import { v4 as uuidv4 } from 'uuid';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongooseModule } from '@nestjs/mongoose';

const mockTask: Task = {
  id: uuidv4(),
  title: 'Test Task',
  description: 'Test Description',
  completed: false,
  time: new Date(),
  createdAt: new Date(),
} as any;
mockTask.save = jest.fn().mockResolvedValue(mockTask);

describe('TaskController (e2e)', () => {
  let app: INestApplication;
  let mongoMemoryServer: MongoMemoryServer;
  let taskService: TaskService;

  beforeAll(async () => {
    mongoMemoryServer = await MongoMemoryServer.create();
    const mockTaskService = {
      create: jest.fn().mockResolvedValue(mockTask),
      findAll: jest.fn().mockResolvedValue([mockTask]),
      findById: jest.fn().mockResolvedValue(mockTask),
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
      findUncompletedTasks: jest.fn().mockResolvedValue([mockTask]),
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
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideProvider(TaskService)
      .useValue(mockTaskService)
      .compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
    taskService = app.get(TaskService);
  });

  it('should retrieve all tasks', async () => {
    jest.spyOn(taskService, 'findAll').mockResolvedValue([mockTask]);
    return request(app.getHttpServer())
      .get('/api/tasks')
      .expect(HttpStatus.OK)
      .expect([mockTask]);
  });

  it('should retrieve all uncompleted tasks', async () => {
    jest
      .spyOn(taskService, 'findUncompletedTasks')
      .mockResolvedValue([mockTask]);
    return request(app.getHttpServer())
      .get('/api/tasks/uncompleted')
      .expect(HttpStatus.OK)
      .expect([mockTask]);
  });

  it('should retrieve a task based on the id', () => {
    jest.spyOn(taskService, 'findById').mockResolvedValue(mockTask);
    return request(app.getHttpServer())
      .get(`/api/tasks/${mockTask.id}`)
      .expect(HttpStatus.OK)
      .expect(mockTask);
  });

  it('should create a task', () => {
    jest.spyOn(taskService, 'create').mockResolvedValue(mockTask);

    return request(app.getHttpServer())
      .post('/api/tasks')
      .send({
        title: 'New Task',
        description: 'New Description',
        completed: false,
        time: new Date(),
      })
      .expect(HttpStatus.CREATED)
      .expect(mockTask);
  });
  it('should update a task', () => {
    const updatedTask: Partial<Task> = {
      ...mockTask,
      title: 'Updated Task Title',
    };
    jest.spyOn(taskService, 'update').mockResolvedValue(updatedTask as Task);

    return request(app.getHttpServer())
      .patch(`/api/tasks/${mockTask.id}`)
      .send({
        title: 'Updated Task Title',
      })
      .expect(HttpStatus.OK)
      .expect(updatedTask);
  });

  it('should delete a task', () => {
    jest.spyOn(taskService, 'remove').mockResolvedValue(undefined);

    return request(app.getHttpServer())
      .delete(`/api/tasks/${mockTask.id}`)
      .expect(HttpStatus.NO_CONTENT);
  });
  it('should validate field types in CreateTaskDto', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/tasks')
      .send({
        title: 123,
        description: true,
        completed: 'yes',
        time: 'any_date',
      })
      .expect(400);

    expect(response.body.message).toEqual(
      expect.arrayContaining([
        'Title must be a string',
        'Description must be a string',
        'Completed must be a boolean',
        'Time must be a valid date',
      ]),
    );
  });
  it('should proceed when optional fields are absent in CreateTaskDto', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/tasks')
      .send({
        title: 'Valid Title',
        completed: false,
        time: new Date(),
      })
      .expect(201);

    expect(response.body).toHaveProperty('id');
  });
  it('should validate field types in UpdateTaskDto', async () => {
    const response = await request(app.getHttpServer())
      .patch('/api/tasks')
      .send({
        title: 123,
        description: true,
        completed: 'yes',
        time: 'any_date',
      })
      .expect(400);

    expect(response.body.message).toEqual(
      expect.arrayContaining([
        'Title must be a string',
        'Description must be a string',
        'Completed must be a boolean',
        'Time must be a valid date',
      ]),
    );
  });
  it('should handle empty updated in UpdateTaskDto', async () => {
    const taskId = mockTask.id;
    const response = await request(app.getHttpServer())
      .patch(`/api/tasks/${taskId}}`)
      .send({})
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        id: taskId,
      }),
    );
  });
  afterAll(async () => {
    await app.close();
    await mongoMemoryServer.stop();
  });
});
