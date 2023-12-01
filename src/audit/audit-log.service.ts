import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditLog } from './audit-log.model';

@Injectable()
export class AuditLogService {
  constructor(
    @InjectModel(AuditLog.name) private auditLogModel: Model<AuditLog>,
  ) {}

  async logEntry(
    userId: string,
    action: string,
    status: string,
    details: string,
  ): Promise<AuditLog> {
    const newEntry = new this.auditLogModel({
      userId,
      action,
      status,
      details,
    });

    return newEntry.save();
  }
}
