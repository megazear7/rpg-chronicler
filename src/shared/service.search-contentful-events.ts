import z from "zod";
import { AbstractService, NoPathParams, ServiceType } from "./main.service.js";
import { HttpMethod } from "./type.http.js";
import { ContentfulEventReference, SearchContentfulEventsBody } from "./type.contentful-context.js";

export class SearchContentfulEventsService extends AbstractService<
  z.infer<typeof SearchContentfulEventsBody>,
  NoPathParams,
  z.infer<typeof ContentfulEventReference>[]
> {
  readonly type = ServiceType.enum.json;
  readonly method = HttpMethod.enum.post;
  readonly path = "/api/contentful/events/search";
}

export const searchContentfulEventsService = new SearchContentfulEventsService(
  SearchContentfulEventsBody,
  NoPathParams,
  z.array(ContentfulEventReference),
);
