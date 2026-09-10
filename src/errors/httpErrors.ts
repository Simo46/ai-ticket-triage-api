import { AppError } from './AppError.js';

// Worked example: study this pattern, you need it identical for the others.
export class BadRequestError extends AppError {
  readonly statusCode = 400;
}

export class PayloadTooLargeError extends AppError {
  readonly statusCode = 413;
}

export class UnsupportedMediaTypeError extends AppError {
  readonly statusCode = 415;
}

export class UnprocessableEntityError extends AppError {
  readonly statusCode = 422;
}

export class ServiceUnavailableError extends AppError {
  readonly statusCode = 503;
}