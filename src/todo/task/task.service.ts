/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { Task } from './task.entity'; // The Task interface

@Injectable()
export class TaskService {
  private tasks: Task[] = [];

  create(task: Task): Task {
    // Implement logic to create a task and store it.
  }

  findAll(): Task[] {
    // Implement logic to retrieve all tasks.
  }
}