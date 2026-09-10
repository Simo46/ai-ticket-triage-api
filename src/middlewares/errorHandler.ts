import type { Request, Response, NextFunction } from 'express';
import { MulterError } from 'multer';
import { CsvError } from 'csv-parse';
import { AppError } from '../errors/AppError.js';
import { BadRequestError, ServiceUnavailableError } from '../errors/httpErrors.js';

const MULTER_ERROR_STATUS: Partial<Record<MulterError['code'], number>> = {
  LIMIT_FILE_SIZE: 413,
  LIMIT_UNEXPECTED_FILE: 400,
};

// Errors raised by the Postgres *server* (SQLSTATE, 5 chars) as opposed to the
// network errors of the driver handled further down. Deliberately small: only
// the codes this app can realistically produce. Each one carries its own fixed
// message because err.message/err.detail from pg name tables, columns and even
// the offending values — none of that may reach the client.
const PG_ERROR_RESPONSE: Record<string, { status: number; message: string }> = {
  '22P02': { status: 400, message: 'Invalid value for one of the fields' }, // invalid_text_representation
  '22007': { status: 400, message: 'Invalid date format' }, // invalid_datetime_format
  '23502': { status: 400, message: 'A required field is missing' }, // not_null_violation
  '23505': { status: 409, message: 'Resource already exists' }, // unique_violation
};

const NETWORK_ERROR_CODES = ['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT'];

// Node attaches `code` to system errors, and `pg` reuses the same property for
// SQLSTATE. One guard serves both branches below.
function hasErrorCode(err: unknown): err is Error & { code: string } {
  return err instanceof Error && 'code' in err && typeof err.code === 'string';
}

// Express only recognizes this as error-handling middleware if it has
// exactly 4 params — `_next` stays unused but must stay in the signature.
export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  req.log.error(err);

  if (err instanceof MulterError) {
    const status = MULTER_ERROR_STATUS[err.code] ?? 400;
    res.status(status).json({ message: err.message, requestId: req.id });
    return;
  }

  if (err instanceof CsvError) {
    const csvError = new BadRequestError(err.message);
    res.status(csvError.statusCode).json({ message: csvError.message, requestId: req.id });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({ message: err.message, requestId: req.id });
    return;
  }

  if (hasErrorCode(err)) {
    const pgResponse = PG_ERROR_RESPONSE[err.code];
    if (pgResponse) {
      res.status(pgResponse.status).json({ message: pgResponse.message, requestId: req.id });
      return;
    }

    if (NETWORK_ERROR_CODES.includes(err.code)) {
      const connectionError = new ServiceUnavailableError('Service temporarily unavailable');
      res.status(connectionError.statusCode).json({ message: connectionError.message, requestId: req.id });
      return;
    }
  }

  res.status(500).json({ message: 'Internal Server Error', requestId: req.id });
};
