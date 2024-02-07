import { Model } from 'mongoose';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Task } from './task.model';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class TaskService {
  constructor(
    @InjectModel(Task.name) private readonly taskModel: Model<Task>,
  ) {}

  async create(createTaskDto: CreateTaskDto): Promise<Task> {
    return this.taskModel.create(createTaskDto);
  }
  async findAll(): Promise<Task[]> {
    return this.taskModel.find().exec();
  }
  async findAllByUserId(userId: string): Promise<Task[]> {
    return this.taskModel.find({ userId: userId }).populate('userId').exec();
  }
  async findById(id: string): Promise<Task> {
    return this.taskModel.findById(id).exec();
  }
  async update(id: string, updateTaskDto: UpdateTaskDto): Promise<Task> {
    const updatedTask = await this.taskModel
      .findOneAndUpdate({ id: id }, updateTaskDto, { new: true })
      .exec();
    if (!updatedTask) {
      throw new Error('Task not found');
    }
    return updatedTask;
  }
  async remove(id: string): Promise<void> {
    const result = await this.taskModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Task with ID '${id}' not found`);
    }
  }
  async findUncompletedTasks(): Promise<Task[]> {
    return this.taskModel.find({ completed: false }).exec();
  }

  @OnEvent('user.deleted')
  async handleEvent(payload: { userId: string }) {
    await this.deleteByUserId(payload.userId);
  }

  async deleteByUserId(userId: string): Promise<void> {
    await this.taskModel.deleteMany({ userId }).exec();
  }

  async searchTasks(query: string): Promise<Task[]> {
    return this.taskModel
      .find({
        $or: [
          { title: { $regex: query, $options: 'i' } },
          { description: { $regex: query, $options: 'i' } },
        ],
      })
      .exec();
  }
}
