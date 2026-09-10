import pino from 'pino';
import { config } from './config.js';

export const logger = pino({
  level: 'debug',
  ...(config.nodeEnv === 'development'
    ? { transport: { target: 'pino-pretty', options: { colorize: true } } }
    : {}),
});
