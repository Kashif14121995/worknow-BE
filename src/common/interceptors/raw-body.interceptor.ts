import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class RawBodyInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    if (request.body && typeof request.body === 'object') {
      request.rawBody = Buffer.from(JSON.stringify(request.body));
    }
    return next.handle();
  }
}

