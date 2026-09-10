import type { Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';

// Everything in a .ts file with at least one import or export is considered a module. 
// This means that the global namespace is not automatically included in the file, 
// so we need to explicitly declare it if we want to extend it.
declare global { // Everything in this scope is considered to be in the global namespace.
  // Required to merge into Express's own ambient Request type, not a style choice here.
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express { // In the Express namespace, we can extend the Request interface to include our custom properties.
    interface Request { // Redifine the Request interface is not an error, it is a declaration merging. We are adding a new property to the existing interface.
      id: string;
    }
  }
}

export const requestId = (req: Request, res: Response, next: NextFunction) => {
  req.id = crypto.randomUUID();
  res.setHeader('X-Request-Id', req.id);
  next();
};
