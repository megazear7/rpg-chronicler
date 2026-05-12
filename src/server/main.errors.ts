import { NextFunction, Request, Response } from "express";
import { ErrorResponse } from "../shared/type.http.js";

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
});

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction, //eslint-disable-line @typescript-eslint/no-unused-vars
): void => {
  if (err instanceof RouteError) {
    console.error(` -> Route error ${err.statusCode}: ${req.path}`, err.message);
    const responseBody: ErrorResponse = { error: err.message };
    res.status(err.statusCode).json(responseBody);
    return;
  } else {
    console.error(`${req.method} ${req.path}`, err.message);
  }

  console.error(err.stack);
  if (req.path.startsWith("/api")) {
    try {
      const jsonError = JSON.parse(err.message);
      const responseBody: ErrorResponse = {
        error: "There was a parsing error",
        detail: jsonError,
      };
      res.status(500).json(responseBody);
    } catch {
      const responseBody: ErrorResponse = { error: err.message };
      res.status(500).json(responseBody);
    }
  } else {
    res.status(500).send(`<html><body><h1>500 Internal Server Error</h1></body></html>`);
  }
};

/**
 * Custom error class for route-related errors
 */
export class RouteError extends Error {
  /**
   * HTTP status code associated with the error
   */
  public readonly statusCode: number;

  /**
   * Creates a new RouteError instance
   * @param statusCode HTTP status code (e.g., 404, 500)
   * @param message Error message describing what went wrong
   */
  constructor(statusCode: number, message: string) {
    super(message);
    this.name = "RouteError";
    this.statusCode = statusCode;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, RouteError);
    }
  }
}
