import app from './app.js';
import { config } from './config/config.js';
import { logger } from './config/logger.js';

app.listen(config.port, () => {
  logger.info(`Server running on port ${config.port}`);
});