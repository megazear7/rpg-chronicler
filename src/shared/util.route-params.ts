import z from "zod";
import { RouteParams } from "./type.route-params.js";

/**
 * Parses route parameters from a pathname based on a route pattern
 * @param pattern The route pattern like "/book/:bookId/chapter/:chapterId"
 * @param pathname The actual pathname like "/book/123/chapter/456"
 * @returns The parsed parameters or null if the pattern doesn't match
 *
 * Example usage:
 *
 * const params = parseRouteParams("/book/:bookId/chapter/:chapterId", "/book/123/chapter/456");
 * // params will be: { bookId: "123", chapterId: "456" } or null if no match
 *
 * // TypeScript will infer the correct type:
 * // params.bookId // string
 * // params.chapterId // string
 */
export function parseRouteParams<T extends string>(pattern: T, pathname: string, fuzzyMatch = false): RouteParams<T> {
  if (pattern.includes("{")) {
    return {} as RouteParams<T>;
  }
  const patternParts = pattern.split("/").filter(Boolean);
  const pathParts = pathname.split("/").filter(Boolean);

  if (patternParts.length !== pathParts.length && !fuzzyMatch) {
    throw new Error("Path does not match the pattern");
  }

  const params: Record<string, string> = {};

  for (let i = 0; i < patternParts.length; i++) {
    const patternPart = patternParts[i];
    const pathPart = pathParts[i];

    if (patternPart.startsWith(":")) {
      // This is a parameter
      const paramName = patternPart.slice(1);
      params[paramName] = pathPart;
    } else if (patternPart !== pathPart) {
      // Static parts must match exactly
      throw new Error("Path does not match the pattern");
    }
  }

  return params as RouteParams<T>;
}

/**
 * Renders a pathname from route parameters
 * @param pattern The route pattern like "/book/:bookId/chapter/:chapterId"
 * @param params The route parameters to render
 * @returns The rendered pathname or null if the pattern doesn't match
 *
 * Example usage:
 *
 * const params = renderPathname("/book/:bookId/chapter/:chapterId", { bookId: "123", chapterId: "456" });
 * // params will be: "/book/123/chapter/456"
 *
 * // TypeScript will infer the correct type:
 * // params.bookId // string
 * // params.chapterId // string
 */
export function renderPathname(
  pattern: string,
  params: Record<string, any>, // eslint-disable-line @typescript-eslint/no-explicit-any
): string {
  let pathname = pattern;
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string" || typeof value === "number") {
      const str = z.string().parse(value);
      pathname = pathname.replace(`:${key}`, str);
    } else {
      throw new Error(`Invalid parameter value for ${key}: ${value}`);
    }
  }
  return pathname;
}
