import express, { Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import pinoHttp from 'pino-http';
import swaggerUi from 'swagger-ui-express';
import { userRouter } from './routes/user';
import { trainRouter } from './routes/trains';
import { notFound } from './middlewares/notFound';
import { errorHandler } from './middlewares/errorHandler';
import { logger } from './utils/logger';
import { generateOpenApiDocument } from './openapi/document';

const app: Express = express();

app.use(helmet());

// Structured request logging. Skips /health — it's typically polled every
// few seconds by an orchestrator and adds noise rather than value.
app.use(
  pinoHttp({
    logger,
    autoLogging: {
      ignore: (req) => req.url === '/health',
    },
  })
);

// Unauthenticated, dependency-free health check for container/orchestrator
// healthchecks (Docker, load balancers, uptime monitors). Deliberately
// placed before CORS/auth so it's always reachable regardless of origin.
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

// The OpenAPI document is generated from the same zod schemas used for real
// request validation (see src/schemas/), so the two can't drift apart the
// way the old hand-written README endpoint docs once did.
const openApiDocument = generateOpenApiDocument();
app.get('/openapi.json', (_req, res) => {
  res.status(200).json(openApiDocument);
});
app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));

// Set ALLOWED_ORIGINS in .env as a comma-separated list, e.g.
// ALLOWED_ORIGINS=https://onerail.app,http://localhost:5173
// With nothing set, no browser-based origin is allowed — server-to-server
// and tools like curl/Postman (no Origin header) still work either way.
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'token'],
  })
);

app.use(express.json());
app.use('/api/v1/user', userRouter);
app.use('/api/v1/train', trainRouter);

app.use(notFound);
app.use(errorHandler);

export { app };
