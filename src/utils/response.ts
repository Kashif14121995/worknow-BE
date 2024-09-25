export class SuccessResponse<T> {
  success: boolean;
  data: T;
  message?: string;

  constructor(data: T, message?: string) {
    this.success = true;
    this.data = data;
    this.message = message || 'Operation successful';
  }
}

export class ErrorResponse {
  success: boolean;
  errorCode: string | number;
  message: string;
  details?: any;

  constructor(errorCode: string | number, message: string, details?: any) {
    this.success = false;
    this.errorCode = errorCode;
    this.message = message;
    this.details = details;
  }
}
