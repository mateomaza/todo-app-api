import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class AuditLog extends Document {
  @Prop({ default: Date.now })
  timestamp: Date;

  @Prop()
  level: string;

  @Prop({ required: false })
  userId?: string;

  @Prop()
  action: string;

  @Prop()
  status: string;

  @Prop({ required: false })
  details?: string;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);
