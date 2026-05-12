import z from "zod";

export const ModelOpeningEventName = z.literal("ModelOpening");
export type ModelOpeningEventName = z.infer<typeof ModelOpeningEventName>;

export const ModelOpeningEventDetail = z.object({});
export type ModelOpeningEventDetail = z.infer<typeof ModelOpeningEventDetail>;

export const ModelOpeningEventData = z.object({
  name: ModelOpeningEventName,
  detail: ModelOpeningEventDetail,
});
export type ModelOpeningEventData = z.infer<typeof ModelOpeningEventData>;

export const ModelOpeningEvent = (): ModelOpeningEventData => ({
  name: ModelOpeningEventName.value,
  detail: {},
});
