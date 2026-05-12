// Utility types for extracting route parameters from route strings

/**
 * Extracts a single parameter name from a string like ":paramName"
 */
type RouteParam<T extends string> = T extends `:${infer P}` ? P : never;

/**
 * Recursively extracts all parameter names from a route string
 */
type ExtractParams<T extends string> = T extends `${infer A}/${infer B}`
  ? RouteParam<A> | ExtractParams<B>
  : RouteParam<T>;

/**
 * Creates a type with properties for each parameter found in the route string
 */
export type RouteParams<T extends string> = {
  [K in ExtractParams<T>]: string;
};

/**
 * Example usage:
 * type BookRouteParams = RouteParams<"/book/:bookId">;
 * // Results in: { bookId: string }
 *
 * type ChapterRouteParams = RouteParams<"/book/:bookId/chapter/:chapterId">;
 * // Results in: { bookId: string; chapterId: string }
 *
 * type PartRouteParams = RouteParams<"/book/:bookId/chapter/:chapterId/part/:partId">;
 * // Results in: { bookId: string; chapterId: string; partId: string }
 */
