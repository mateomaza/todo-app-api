/* eslint-disable prettier/prettier */
import { Controller, Get, Post, Body } from '@nestjs/common';
import { TaskService } from './task.service';

@Controller('tasks')
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Get()
  findAll() {
    // Implement the logic to fetch all tasks from the database.
  }

  @Post()
  create(@Body() createTaskDto: CreateTaskDto) {
    // Implement the logic to create a new task in the database.
  }
}