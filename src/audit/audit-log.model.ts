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
  details: string;

  @Prop({ required: false })
  outcome?: string;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);
AuditLogSchema.index({ userId: 1 });
AuditLogSchema.index({ action: 1 });
AuditLogSchema.index({ userId: 1, timestamp: -1 });
