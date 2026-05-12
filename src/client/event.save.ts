import z from "zod";

export const SaveEventName = z.literal("Save");
export type SaveEventName = z.infer<typeof SaveEventName>;

export const SaveEventDetail = z.object({});
export type SaveEventDetail = z.infer<typeof SaveEventDetail>;

export const SaveEventData = z.object({
  name: SaveEventName,
  detail: SaveEventDetail,
});
export type SaveEventData = z.infer<typeof SaveEventData>;

export const SaveEvent = (): SaveEventData => ({
  name: SaveEventName.value,
  detail: {},
});
