import { Injectable } from '@nestjs/common';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';

@Injectable()
export class HttpStatusCodesService {
  readonly STATUS_OK = StatusCodes.OK;
  readonly STATUS_NOT_FOUND = StatusCodes.NOT_FOUND;
  readonly STATUS_UNAUTHORIZED = StatusCodes.UNAUTHORIZED;
  readonly STATUS_ALREADY_EXIST = StatusCodes.CONFLICT;
  readonly STATUS_SUCCESSFULLY_CREATION = StatusCodes.CREATED;
  readonly STATUS_INTERNAL_SERVER_ERROR = StatusCodes.INTERNAL_SERVER_ERROR;
  readonly STATUS_EXPIRED = StatusCodes.GONE;

  readonly STATUS_MESSAGE_FOR_EXPIRED = getReasonPhrase(StatusCodes.GONE);

  readonly STATUS_MESSAGE_FOR_NOT_FOUND = getReasonPhrase(
    StatusCodes.NOT_FOUND,
  );
  readonly STATUS_MESSAGE_FOR_WRONG_OTP = 'Invalid One Time Password';
  readonly STATUS_ALREADY_EXIST_MESSAGE = getReasonPhrase(StatusCodes.CONFLICT);
  readonly STATUS_MESSAGE_FOR_UNAUTHORIZED = getReasonPhrase(
    StatusCodes.UNAUTHORIZED,
  );
}
