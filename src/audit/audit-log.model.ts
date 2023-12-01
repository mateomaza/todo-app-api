import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class AuditLog extends Document {
  @Prop({ default: Date.now })
  timestamp: Date;

  @Prop()
  userId: string;

  @Prop()
  action: string;

  @Prop()
  status: string;

  @Prop()
  details: string;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);
