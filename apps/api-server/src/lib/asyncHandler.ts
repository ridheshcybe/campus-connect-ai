import { Request, Response, NextFunction } from "express";

/**
 * Wraps asynchronous Express handlers to ensure any errors are caught
 * and forwarded to the global next() error handler in Express 4.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
