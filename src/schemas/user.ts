import { z } from 'zod';
import '../openapi/zodExtend';

export const signupSchema = z
  .object({
    email: z.string().min(3).max(100).email().openapi({ example: 'rider@example.com' }),
    username: z.string().min(1).max(20).openapi({ example: 'rider' }),
    password: z.string().min(1).max(20).openapi({ example: 'password123' }),
  })
  .openapi('SignupRequest');

export const signinSchema = z
  .object({
    email: z.string().min(3).max(100).email().openapi({ example: 'rider@example.com' }),
    password: z.string().min(1).max(20).openapi({ example: 'password123' }),
  })
  .openapi('SigninRequest');
