import { Model } from 'mongoose';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Task } from './task.model';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Injectable()
export class TaskService {
  constructor(@InjectModel('Task') private readonly taskModel: Model<Task>) {}
  private tasks: Task[] = [];

  async create(createTaskDto: CreateTaskDto): Promise<Task> {
    const newTask = new this.taskModel(createTaskDto);
    return newTask.save();
  }
  async findAll(): Promise<Task[]> {
    return this.taskModel.find().exec();
  }
  async findById(id: string): Promise<Task> {
    return this.taskModel.findById(id).exec();
  }
  async update(id: string, updateTaskDto: UpdateTaskDto): Promise<Task> {
    const updatedTask = await this.taskModel
      .findByIdAndUpdate(id, updateTaskDto, { new: true })
      .exec();
    if (!updatedTask) {
      throw new Error('Task not found');
    }
    return updatedTask;
  }
  async remove(id: string): Promise<void> {
    await this.taskModel.findByIdAndDelete(id).exec();
  }
  async findUncompletedTasks(): Promise<Task[]> {
    return this.taskModel.find({ completed: false }).exec();
  }
}
