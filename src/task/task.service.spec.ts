import { Test, TestingModule } from '@nestjs/testing';
import { TaskService } from './task.service';
import { getModelToken } from '@nestjs/mongoose';
import { Task } from './task.model';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { NotFoundException } from '@nestjs/common';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

describe('TaskService', () => {
  let service: TaskService;
  let model: jest.Mocked<Model<Task>>;

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

  const mockTaskModel = {
    create: jest.fn().mockResolvedValue(mockTask),
    find: jest.fn().mockReturnThis(),
    findById: jest.fn().mockReturnThis(),
    findOneAndUpdate: jest.fn().mockReturnThis(),
    findByIdAndDelete: jest.fn().mockReturnThis(),
    exec: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskService,
        {
          provide: getModelToken(Task.name),
          useValue: mockTaskModel,
        },
      ],
    }).compile();

    service = module.get<TaskService>(TaskService);
    model = module.get(getModelToken(Task.name));
  });

  it('should create a task', async () => {
    const createdTaskDto: CreateTaskDto = {
      title: 'New Task',
      description: 'New Description',
      completed: false,
      time: new Date().toISOString(),
      userId: 'userid-123',
    };
    expect(await service.create(createdTaskDto)).toEqual(mockTask as Task);
    expect(model.create).toHaveBeenCalledWith(createdTaskDto);
  });

  it('should find all tasks', async () => {
    mockTaskModel.find.mockReturnValue({
      exec: jest.fn().mockResolvedValue(taskArray),
    });
    expect(await service.findAll()).toEqual(taskArray);
  });

  it('should find a task by id', async () => {
    mockTaskModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockTask),
    });
    expect(await service.findById(mockTask.id)).toEqual(mockTask);
    expect(model.findById).toHaveBeenCalledWith(mockTask.id);
  });

  it('should update a task', async () => {
    mockTaskModel.findOneAndUpdate.mockReturnValue({
      exec: jest
        .fn()
        .mockResolvedValue({ ...mockTask, title: 'Updated Task Title' }),
    });
    const updatedTaskDto: UpdateTaskDto = { title: 'Updated Task Title' };
    expect(await service.update(mockTask.id, updatedTaskDto)).toEqual({
      ...mockTask,
      ...updatedTaskDto,
    });
  });

  it('should remove a task', async () => {
    mockTaskModel.findByIdAndDelete.mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockTask),
    });
    expect(await service.remove(mockTask.id)).toBeUndefined();
    expect(model.findByIdAndDelete).toHaveBeenCalledWith(mockTask.id);
  });

  it('should throw NotFoundException if trying to remove a non-existent task', async () => {
    mockTaskModel.findByIdAndDelete.mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });
    await expect(service.remove('non_existing_id')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should find uncompleted tasks', async () => {
    mockTaskModel.find.mockReturnValueOnce({
      exec: jest.fn().mockResolvedValueOnce(mockUncompleted),
    });
    expect(await service.findUncompletedTasks()).toEqual(mockUncompleted);
    expect(mockTaskModel.find).toHaveBeenCalledWith({ completed: false });
  });

  it('should return tasks with exact match in title or description', async () => {
    const query = 'Test Task';
    mockTaskModel.find.mockReturnValue({
      exec: jest.fn().mockResolvedValue([mockTask]),
    });

    const result = await service.searchTasks(query);
    expect(result).toEqual([mockTask]);
    expect(mockTaskModel.find).toHaveBeenCalledWith({
      $or: [
        { title: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
      ],
    });
  });

  it('should return tasks with partial match in title or description', async () => {
    const query = 'Test';
    mockTaskModel.find.mockReturnValue({
      exec: jest.fn().mockResolvedValue([mockTask]),
    });

    const result = await service.searchTasks(query);
    expect(result).toEqual([mockTask]);
    expect(mockTaskModel.find).toHaveBeenCalledWith({
      $or: [
        { title: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
      ],
    });
  });

  it('should return an empty array if no tasks match the query', async () => {
    const query = 'Nonexistent Task';
    mockTaskModel.find.mockReturnValue({
      exec: jest.fn().mockResolvedValue([]),
    });

    const result = await service.searchTasks(query);
    expect(result).toEqual([]);
    expect(mockTaskModel.find).toHaveBeenCalledWith({
      $or: [
        { title: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
      ],
    });
  });

  it('should correctly handle queries with special characters', async () => {
    const query = 'Task$^';
    mockTaskModel.find.mockReturnValue({
      exec: jest.fn().mockResolvedValue([mockTask]),
    });

    const result = await service.searchTasks(query);
    expect(result).toEqual([mockTask]);
    expect(mockTaskModel.find).toHaveBeenCalledWith({
      $or: [
        { title: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
      ],
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });
});
