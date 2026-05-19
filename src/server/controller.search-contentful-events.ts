import { NoPathParams, RequestOptions } from "../shared/main.service.js";
import { searchContentfulEventsService } from "../shared/service.search-contentful-events.js";
import { ContentfulEventReference, SearchContentfulEventsBody } from "../shared/type.contentful-context.js";
import { AbstractController } from "./main.controller.js";
import { searchContentfulEvents } from "./util.contentful.js";

export class SearchContentfulEventsController extends AbstractController<SearchContentfulEventsBody, NoPathParams, ContentfulEventReference[]> {
  async handler({ bodyParams }: RequestOptions<SearchContentfulEventsBody, NoPathParams>): Promise<ContentfulEventReference[]> {
    return searchContentfulEvents(bodyParams.query);
  }
}

export const searchContentfulEventsController = new SearchContentfulEventsController(searchContentfulEventsService);