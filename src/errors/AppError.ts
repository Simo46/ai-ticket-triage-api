export abstract class AppError extends Error {
  abstract readonly statusCode: number;
  readonly isOperational: boolean;

  constructor(message: string, isOperational = true) {
    super(message);
    this.name = new.target.name;
    this.isOperational = isOperational;
  }
}
