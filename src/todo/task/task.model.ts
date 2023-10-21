import { Document } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { v4 as uuidv4 } from 'uuid';

@Schema()
export class Task extends Document {
  @Prop({ default: uuidv4() })
  id: string;

  @Prop()
  title: string;

  @Prop()
  description: string;

  @Prop()
  completed: boolean;

  @Prop({ default: new Date(Date.now() + 60 * 60 * 1000) })
  time: Date;

  @Prop({ default: Date.now })
  createdAt: Date;
}

export const TaskSchema = SchemaFactory.createForClass(Task);
