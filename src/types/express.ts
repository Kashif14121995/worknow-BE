import { Request as ExpressRequest, Response } from 'express';

type UserRequestSchema = {
  email: string;
  id: string;
  role: string;
};

// Extend the Express Request type with UserRequestSchema
export interface Request extends ExpressRequest {
  user: UserRequestSchema;
}

export type APIResponse = Promise<Response<any, Record<string, any>>>;
