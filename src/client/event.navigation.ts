import z from "zod";

export const NavigationEventName = z.literal("Navigation");
export type NavigationEventName = z.infer<typeof NavigationEventName>;

export const NavigationEventDetail = z.object({
  path: z.string().describe("The path to navigate to."),
});
export type NavigationEventDetail = z.infer<typeof NavigationEventDetail>;

export const NavigationEventData = z.object({
  name: NavigationEventName,
  detail: NavigationEventDetail,
});
export type NavigationEventData = z.infer<typeof NavigationEventData>;

export const NavigationEvent = (detail: NavigationEventDetail): NavigationEventData => ({
  name: NavigationEventName.value,
  detail,
});
