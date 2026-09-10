import express, { Router } from 'express';
import ticketRoutes from './routes/ticketRoutes.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { requestId } from './middlewares/requestId.js';
import { logger } from './config/logger.js'
import { pinoHttp } from 'pino-http';

const app = express();

// Must run before everything else, so even a request that fails during
// body parsing (before it reaches any route) still gets an id.
app.use(requestId);

app.use(pinoHttp({ logger })); // Must be after our requestId middleware because pino create its own requestId if no other is there.

app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.send('Welcome to the Ticket API');
});

const apiRouter = Router();
apiRouter.use('/tickets', ticketRoutes);

app.use('/api/rest', apiRouter);

// Global error handler (should be after routes)
app.use(errorHandler);

export default app;