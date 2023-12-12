import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpStatus,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditLogService } from './audit-log.service';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(private auditLogService: AuditLogService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const controllerName = context.getClass().name;
    const handlerName = context.getHandler().name;

    this.auditLogService.logEntry({
      level: 'info',
      action: `${request.method} ${request.url}`,
      outcome: 'in-progress',
      details: `Entering ${controllerName}.${handlerName}`,
    });

    return next.handle().pipe(
      tap(() => {
        const response = context.switchToHttp().getResponse();
        const status = response.statusCode || HttpStatus.OK;

        this.auditLogService.logEntry({
          level: status >= 400 ? 'error' : 'info',
          action: `${request.method} ${request.url}`,
          outcome: status >= 400 ? 'failed' : 'success',
          details: `Completed ${controllerName}.${handlerName} with status ${status}`,
        });
      }),
    );
  }
}
