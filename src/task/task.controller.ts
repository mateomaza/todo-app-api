import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Param,
  Patch,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TaskService } from './task.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { Task } from './task.model';
import { JwtAuthGuard } from 'src/auth/jwt.auth.guard';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('tasks')
@ApiBearerAuth()
@Controller('api/tasks')
@UseGuards(JwtAuthGuard)
/**
 * All endpoints in this controller require authentication and may return a 401 Unauthorized status.
 */
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @ApiOperation({
    summary: 'Get all tasks by user _id',
    description:
      'Retrieves all tasks from one user using its MongoDB ObjectId (`_id`). This is an exception to the general use of UUIDs for identifiers in other operations.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'All tasks from one specific user have been retrieved',
  })
  @Get()
  findAllByUserId(@Query('userId') userId: string) {
    if (userId) {
      return this.taskService.findAllByUserId(userId);
    }
    return this.taskService.findAll();
  }

  @ApiOperation({ summary: 'Get task by id' })
  @ApiParam({
    name: 'id',
    description: 'UUID of the model instace to find a task',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'A task has been retrieved by id',
  })
  @Get(':id')
  async findById(@Param('id') id: string): Promise<Task> {
    return this.taskService.findById(id);
  }

  @ApiOperation({ summary: 'Get all uncompleted tasks' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'All uncompleted tasks have been retrieved',
  })
  @Get('find/uncompleted')
  async findUncompletedTasks(): Promise<Task[]> {
    const tasks = await this.taskService.findUncompletedTasks();
    return tasks;
  }

  @ApiOperation({ summary: 'Create task' })
  @ApiBody({
    type: CreateTaskDto,
    description: 'Payload to create a new task',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'The task has been successfully created',
  })
  @Post('create')
  async create(@Body() createTaskDto: CreateTaskDto): Promise<Task> {
    return this.taskService.create(createTaskDto);
  }

  @ApiOperation({ summary: 'Update task by id' })
  @ApiBody({
    type: UpdateTaskDto,
    description: 'Payload to update an existing task',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID of the model instace to update a task',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The task has been successfully updated',
  })
  @Patch(':id/update')
  async update(
    @Param('id') id: string,
    @Body() updateTaskDto: UpdateTaskDto,
  ): Promise<Task> {
    return this.taskService.update(id, updateTaskDto);
  }

  @ApiOperation({
    summary: 'Delete task by _id',
    description:
      'Deletes a task model instance using its MongoDB ObjectId (`_id`). This is an exception to the general use of UUIDs for identifiers in other operations.',
  })
  @ApiParam({
    name: '_id',
    description: 'MongoDB ObjectId of the model instance to delete',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'The task has been successfully deleted',
  })
  @Delete(':_id/delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('_id') _id: string): Promise<void> {
    await this.taskService.remove(_id);
  }

  @ApiOperation({ summary: 'Search task by query' })
  @Get('search/for')
  async searchTasks(@Query('search') query: string): Promise<Task[]> {
    return this.taskService.searchTasks(query);
  }
}
