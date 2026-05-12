import { NextFunction, Request, Response } from "express";

export const loggingMiddleware = (req: Request, _res: Response, next: NextFunction): void => {
  if (req.path.startsWith("/api")) console.log(`${req.method} ${req.path}`);
  next();
};
