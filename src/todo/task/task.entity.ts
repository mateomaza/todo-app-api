/* eslint-disable prettier/prettier */
import { Document } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema()
export class Task extends Document {
  @Prop()
  title: string;

  @Prop()
  description: string;

  @Prop()
  completed: boolean;

  @Prop({ default: Date.now })
  createdAt: Date;
}

export const TaskModel = SchemaFactory.createForClass(Task);
