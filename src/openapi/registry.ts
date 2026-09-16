import { z } from 'zod';
import './zodExtend';
import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { signupSchema, signinSchema } from '../schemas/user';
import {
  checkTrainsQuerySchema,
  checkTrainsResponseSchema,
  checkFareQuerySchema,
  checkFareResponseSchema,
  subscribePnrRequestSchema,
  subscribePnrResponseSchema,
} from '../schemas/trains';

const registry = new OpenAPIRegistry();

// This API authenticates with a custom `token` request header (not a
// standard `Authorization: Bearer` header) — documented as an apiKey
// scheme in the actual header it uses, matching what auth.ts really reads.
const tokenAuth = registry.registerComponent('securitySchemes', 'tokenAuth', {
  type: 'apiKey',
  in: 'header',
  name: 'token',
  description: 'JWT returned by POST /api/v1/user/signin, sent as-is (no "Bearer " prefix).',
});

const messageResponseSchema = z.object({ message: z.string() }).openapi('MessageResponse');

const errorResponseSchema = z
  .object({
    message: z.string().openapi({ example: 'Incorrect Format' }),
    error: z.unknown().optional().openapi({ description: 'Present only on validation errors' }),
  })
  .openapi('ErrorResponse');

const healthResponseSchema = z.object({ status: z.literal('ok') }).openapi('HealthResponse');

function errorResponse(description: string) {
  return {
    description,
    content: { 'application/json': { schema: errorResponseSchema } },
  };
}

registry.registerPath({
  method: 'get',
  path: '/health',
  summary: 'Health check',
  description: 'Unauthenticated, dependency-free. Used by container/orchestrator healthchecks.',
  tags: ['Health'],
  responses: {
    200: {
      description: 'The service is up',
      content: { 'application/json': { schema: healthResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/user/signup',
  summary: 'Create a new user account',
  tags: ['User'],
  request: {
    body: { content: { 'application/json': { schema: signupSchema } } },
  },
  responses: {
    200: {
      description: 'Account created',
      content: { 'application/json': { schema: messageResponseSchema } },
    },
    400: errorResponse('Validation failed'),
    409: errorResponse('Email already registered'),
    429: errorResponse('Too many attempts — rate limited'),
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/user/signin',
  summary: 'Sign in and receive a JWT',
  tags: ['User'],
  request: {
    body: { content: { 'application/json': { schema: signinSchema } } },
  },
  responses: {
    200: {
      description: 'Signed in successfully',
      content: {
        'application/json': {
          schema: z.object({ token: z.string() }).openapi('SigninResponse'),
        },
      },
    },
    400: errorResponse('Validation failed'),
    403: errorResponse('User does not exist, or incorrect password'),
    429: errorResponse('Too many attempts — rate limited'),
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/train/checktrains',
  summary: 'Search trains between two stations',
  tags: ['Train'],
  security: [{ [tokenAuth.name]: [] }],
  request: { query: checkTrainsQuerySchema },
  responses: {
    200: {
      description: 'Matching trains',
      content: { 'application/json': { schema: checkTrainsResponseSchema } },
    },
    401: errorResponse('No token provided'),
    403: errorResponse('Invalid token'),
    502: errorResponse('Upstream RapidAPI call failed'),
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/train/checkfare',
  summary: 'Check fare for a train between two stations',
  tags: ['Train'],
  security: [{ [tokenAuth.name]: [] }],
  request: { query: checkFareQuerySchema },
  responses: {
    200: {
      description: 'Fare breakdown by class',
      content: { 'application/json': { schema: checkFareResponseSchema } },
    },
    401: errorResponse('No token provided'),
    403: errorResponse('Invalid token'),
    502: errorResponse('Upstream RapidAPI call failed'),
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/train/subscribe-pnr',
  summary: 'Subscribe to PNR status tracking',
  description:
    'Fetches current PNR status, stores it, and emails a confirmation to the signed-in user.',
  tags: ['Train'],
  security: [{ [tokenAuth.name]: [] }],
  request: {
    body: { content: { 'application/json': { schema: subscribePnrRequestSchema } } },
  },
  responses: {
    200: {
      description: 'Subscribed successfully',
      content: { 'application/json': { schema: subscribePnrResponseSchema } },
    },
    400: errorResponse('pnrNumber missing from the request body'),
    401: errorResponse('No token provided'),
    403: errorResponse('Invalid token'),
    502: errorResponse('Upstream RapidAPI call failed'),
  },
});

export { registry };
