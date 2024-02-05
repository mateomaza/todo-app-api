import { Document } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { v4 as uuidv4 } from 'uuid';

@Schema()
export class Task extends Document {
  @Prop({ default: () => uuidv4() })
  id: string;

  @Prop()
  title: string;

  @Prop({ required: false })
  description?: string;

  @Prop()
  completed: boolean;

  @Prop({ default: new Date(Date.now() + 60 * 60 * 1000).toISOString() })
  time: string;

  @Prop({ default: Date.now })
  createdAt: Date;
}

export const TaskSchema = SchemaFactory.createForClass(Task);
TaskSchema.index({ id: 1 });
