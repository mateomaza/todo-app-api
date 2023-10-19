import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TaskModule } from './todo/task/task.module';

@Module({
  imports: [
    MongooseModule.forRoot('mongodb://localhost/todo-list'),
    TaskModule,
  ],
})
export class AppModule {}