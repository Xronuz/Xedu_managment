import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';

@Injectable()
export class QueryTimingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(QueryTimingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest<Request>();
    const method = req.method;
    const path = req.url;
    const correlationId = req.headers['x-correlation-id'] as string | undefined;

    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - start;
        const logPayload: Record<string, any> = {
          method,
          path,
          duration_ms: duration,
          status_code: req.res?.statusCode ?? 200,
        };
        if (correlationId) {
          logPayload.correlation_id = correlationId;
        }

        if (duration > 1000) {
          this.logger.warn(
            `Slow request: ${method} ${path} took ${duration}ms`,
            logPayload,
          );
        } else {
          this.logger.log(
            `${method} ${path} — ${duration}ms`,
            logPayload,
          );
        }
      }),
    );
  }
}
