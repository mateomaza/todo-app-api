import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
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
      details: `Entering ${controllerName}.${handlerName}`,
      outcome: 'in-progress',
    });

    return next.handle().pipe(
      tap(() => {
        const response = context.switchToHttp().getResponse();
        const status = response.statusCode;

        this.auditLogService.logEntry({
          level: status >= 400 ? 'error' : 'info',
          action: `${request.method} ${request.url}`,
          details: `Completed ${controllerName}.${handlerName} with status ${status}`,
          outcome: status >= 400 ? 'fail' : 'success',
        });
      }),
    );
  }
}
