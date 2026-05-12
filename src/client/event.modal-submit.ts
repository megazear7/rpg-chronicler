import z from "zod";

export const ModelSubmitEventName = z.literal("ModelSubmit");
export type ModelSubmitEventName = z.infer<typeof ModelSubmitEventName>;

export const ModelSubmitEventDetail = z.object({});
export type ModelSubmitEventDetail = z.infer<typeof ModelSubmitEventDetail>;

export const ModelSubmitEventData = z.object({
  name: ModelSubmitEventName,
  detail: ModelSubmitEventDetail,
});
export type ModelSubmitEventData = z.infer<typeof ModelSubmitEventData>;

export const ModelSubmitEvent = (): ModelSubmitEventData => ({
  name: ModelSubmitEventName.value,
  detail: {},
});
