import express, { Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { userRouter } from './routes/user';
import { trainRouter } from './routes/trains';
import { notFound } from './middlewares/notFound';
import { errorHandler } from './middlewares/errorHandler';

const app: Express = express();

app.use(helmet());

// Unauthenticated, dependency-free health check for container/orchestrator
// healthchecks (Docker, load balancers, uptime monitors). Deliberately
// placed before CORS/auth so it's always reachable regardless of origin.
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

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
