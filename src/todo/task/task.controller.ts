import { Controller, Get, Post, Body } from '@nestjs/common';
import { TaskService } from './task.service';
import { CreateTaskDto } from './dto/create-task.dto';

@Controller('tasks')
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Get()
  findAll() {
    const tasks = this.taskService.findAll();
    return tasks;
  }

  @Post()
  create(@Body() createTaskDto: CreateTaskDto) {
    const newTask = this.taskService.create(createTaskDto);
    return newTask;
  }
}
