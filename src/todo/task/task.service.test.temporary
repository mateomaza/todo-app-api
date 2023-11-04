import { Test, TestingModule } from '@nestjs/testing';
import { TaskService } from './task.service';
import { getModelToken } from '@nestjs/mongoose';
import { Task } from './task.model';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const taskMock: Task = {
  id: uuidv4(),
  title: 'Test Task',
  description: 'Test Description',
  completed: false || true,
  time: new Date(),
  createdAt: new Date(),
  save: jest.fn().mockResolvedValue(this),
} as any;

const taskModelMock = {
  new: jest.fn().mockResolvedValue(taskMock),
  constructor: jest.fn().mockResolvedValue(taskMock),
  find: jest.fn(),
  findOne: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn(),
};

describe('TaskService', () => {
  let service: TaskService;
  let model: jest.Mocked<Model<Task>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskService,
        {
          provide: getModelToken(Task.name),
          useValue: taskModelMock,
        },
      ],
    }).compile();

    service = module.get<TaskService>(TaskService);
    model = module.get(getModelToken(Task.name));
  });
});
