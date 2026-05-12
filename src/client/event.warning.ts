import z from "zod";

export const WarningEventName = z.literal("Warning");

export const WarningEventDetail = z.object({
  message: z.string().describe("The warning message."),
  info: z.string().optional().describe("The full warning message, if different from the main message."),
});
export type WarningEventDetail = z.infer<typeof WarningEventDetail>;

export const WarningEventData = z.object({
  name: WarningEventName,
  detail: WarningEventDetail,
});
export type WarningEventData = z.infer<typeof WarningEventData>;

export const WarningEvent = (message: string, info?: string): WarningEventData => ({
  name: WarningEventName.value,
  detail: { message, info },
});
