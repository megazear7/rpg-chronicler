import z from "zod";

export const ModelClosingEventName = z.literal("ModelClosing");
export type ModelClosingEventName = z.infer<typeof ModelClosingEventName>;

export const ModelClosingEventDetail = z.object({});
export type ModelClosingEventDetail = z.infer<typeof ModelClosingEventDetail>;

export const ModelClosingEventData = z.object({
  name: ModelClosingEventName,
  detail: ModelClosingEventDetail,
});
export type ModelClosingEventData = z.infer<typeof ModelClosingEventData>;

export const ModelClosingEvent = (): ModelClosingEventData => ({
  name: ModelClosingEventName.value,
  detail: {},
});
