// Disabling unused vars rule for type import - used for Mongoose schema typing, not directly referenced in the code.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { User } from 'src/auth/user/user.model';
import mongoose, { Document } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { v4 as uuidv4 } from 'uuid';
import { ApiProperty } from '@nestjs/swagger';

@Schema()
export class Task extends Document {
  @ApiProperty({ type: String, description: 'UUID for the task' })
  @Prop({ default: () => uuidv4(), unique: true })
  id: string;

  @ApiProperty({
    type: String,
    description: 'UUID from the user that created the task',
  })
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  userId: mongoose.Schema.Types.ObjectId;

  @ApiProperty({ type: String, description: 'Task title' })
  @Prop()
  title: string;

  @ApiProperty({ type: String, description: 'Task description' })
  @Prop({ required: false })
  description?: string;

  @ApiProperty({ type: Boolean, description: 'Task is completed or not' })
  @Prop()
  completed: boolean;

  @ApiProperty({ type: String, description: 'Time to make the task' })
  @Prop({ default: new Date(Date.now() + 60 * 60 * 1000).toISOString() })
  time: string;

  @ApiProperty({ type: Date, description: 'Task creation date' })
  @Prop({ default: Date.now })
  createdAt: Date;
}

export const TaskSchema = SchemaFactory.createForClass(Task);
TaskSchema.index({ id: 1 });
