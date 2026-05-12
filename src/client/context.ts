import { createContext } from "@lit/context";
import z from "zod";
import { LoadingStatus } from "../shared/type.loading.js";
import { AppConfig } from "../shared/type.app.js";

export const AppContext = z.object({
  app: AppConfig.optional(),
  status: LoadingStatus,
  error: z.string().optional(),
});
export type AppContext = z.infer<typeof AppContext>;
export const appContext = createContext<AppContext>("app");
