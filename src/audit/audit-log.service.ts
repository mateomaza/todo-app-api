import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditLog } from './audit-log.model';

@Injectable()
export class AuditLogService implements OnModuleDestroy {
  private logBuffer: AuditLog[] = [];
  private readonly flushInterval = 10000;
  private readonly maxBufferSize = 100;

  constructor(
    @InjectModel(AuditLog.name) private auditLogModel: Model<AuditLog>,
  ) {
    setInterval(() => this.flushLogs(), this.flushInterval);
  }

  async logEntry(
    level: string,
    userId: string,
    action: string,
    status: string,
    details: string,
  ): Promise<void> {
    const newEntry = new this.auditLogModel({
      level,
      userId,
      action,
      status,
      details,
    });

    this.logBuffer.push(newEntry);

    if (this.logBuffer.length >= this.maxBufferSize) {
      await this.flushLogs();
    }
  }

  private async flushLogs(): Promise<void> {
    if (this.logBuffer.length === 0) {
      return;
    }
    await this.auditLogModel.insertMany(this.logBuffer);
    this.logBuffer = [];
  }

  async onModuleDestroy() {
    await this.flushLogs();
  }
}
