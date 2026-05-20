import z from "zod";

export const RoutePath = z.string();
export type RoutePath = z.infer<typeof RoutePath>;

export const RouteName = z.enum([
  "home",
  "adventure_setup",
  "instructions",
  "jobs",
  "job",
  "job_stage",
  "job_logs",
  "example",
  "not_found",
]);
export type RouteName = z.infer<typeof RouteName>;

export const RouteConfig = z.object({
  name: RouteName,
  path: RoutePath,
});
export type RouteConfig = z.infer<typeof RouteConfig>;
