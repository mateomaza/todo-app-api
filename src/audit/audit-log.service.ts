import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AuditLog } from './audit-log.model';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';

@Injectable()
export class AuditLogService implements OnModuleDestroy {
  private logBuffer: CreateAuditLogDto[] = [];
  private readonly flushInterval = 10000;
  private readonly maxBufferSize = 100;

  constructor(
    @InjectModel(AuditLog.name) private auditLogModel: Model<AuditLog>,
  ) {}

  @Cron(CronExpression.EVERY_10_SECONDS)
  async handleCron() {
    await this.flushLogs();
  }

  async logEntry(dto: CreateAuditLogDto): Promise<void> {
    this.logBuffer.push(dto);
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

  get logBufferForTesting() {
    return this.logBuffer;
  }

  get maxBufferSizeForTesting() {
    return this.maxBufferSize;
  }
}
