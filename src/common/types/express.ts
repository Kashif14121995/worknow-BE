import { Request as ExpressRequest, Response } from 'express';

type UserRequestSchema = {
  email: string;
  id: string;
  role: string;
};

export interface Request extends ExpressRequest {
  user: UserRequestSchema;
}

export type APIResponse = Promise<Response<any, Record<string, any>>>;
