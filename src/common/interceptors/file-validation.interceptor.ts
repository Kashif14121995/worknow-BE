import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
} from '@nestjs/common';
import { Observable } from 'rxjs';

// File type configurations
const ALLOWED_FILE_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  document: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
  all: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'],
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

@Injectable()
export class FileValidationInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const file = request.file;

    if (!file) {
      return next.handle();
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
      );
    }

    // Validate file type (basic check - can be enhanced)
    const allowedTypes = ALLOWED_FILE_TYPES.all;
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `File type ${file.mimetype} is not allowed. Allowed types: ${allowedTypes.join(', ')}`,
      );
    }

    // Validate file extension
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.doc', '.docx'];
    const fileExtension = file.originalname
      .substring(file.originalname.lastIndexOf('.'))
      .toLowerCase();
    
    if (!allowedExtensions.includes(fileExtension)) {
      throw new BadRequestException(
        `File extension ${fileExtension} is not allowed. Allowed extensions: ${allowedExtensions.join(', ')}`,
      );
    }

    return next.handle();
  }
}

