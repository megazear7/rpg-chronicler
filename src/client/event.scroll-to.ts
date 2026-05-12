import z from "zod";

export const ScrollToEventName = z.literal("ScrollTo");
export type ScrollToEventName = z.infer<typeof ScrollToEventName>;

export const ScrollToEventTarget = z.enum(["book", "chapter", "part"]);
export type ScrollToEventTarget = z.infer<typeof ScrollToEventTarget>;

export const ScrollToEventDetail = z.object({
  target: ScrollToEventTarget,
});
export type ScrollToEventDetail = z.infer<typeof ScrollToEventDetail>;

export const ScrollToEventData = z.object({
  name: ScrollToEventName,
  detail: ScrollToEventDetail,
});
export type ScrollToEventData = z.infer<typeof ScrollToEventData>;

export const ScrollToEvent = (detail: ScrollToEventDetail): ScrollToEventData => ({
  name: ScrollToEventName.value,
  detail,
});
