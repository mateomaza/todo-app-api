import { NestMiddleware, Injectable } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { AuditLogService } from './audit-log.service';

@Injectable()
export class AuditLogMiddleware implements NestMiddleware {
  constructor(private readonly auditLogService: AuditLogService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const originalMethod = res.locals.methodToCall;
    res.locals.methodToCall = async function (...args: any[]) {
      await this.auditLogService.logEntry({
        level: 'info',
        action: originalMethod.name,
        status: 'in-progress',
        details: `Method ${originalMethod.name} invoked`,
      });
      try {
        const result = await originalMethod.apply(this, args);
        await this.auditLogService.logEntry({
          level: 'info',
          action: originalMethod.name,
          status: 'success',
          details: `Method ${originalMethod.name} completed successfully`,
        });
        return result;
      } catch (error) {
        await this.auditLogService.logEntry({
          level: 'error',
          action: originalMethod.name,
          status: 'error',
          details: `Method ${originalMethod.name} encountered an error: ${error.message}`,
        });
        throw error;
      }
    };
    next();
  }
}
