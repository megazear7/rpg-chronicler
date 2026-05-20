import { NoBodyParams, NoPathParams } from "../shared/main.service.js";
import { getContentfulCatalogService } from "../shared/service.get-contentful-catalog.js";
import { ContentfulCatalog } from "../shared/type.contentful-context.js";
import { AbstractController } from "./main.controller.js";
import { listContentfulCatalog } from "./util.contentful.js";

export class GetContentfulCatalogController extends AbstractController<NoBodyParams, NoPathParams, ContentfulCatalog> {
  async handler(): Promise<ContentfulCatalog> {
    return listContentfulCatalog();
  }
}

export const getContentfulCatalogController = new GetContentfulCatalogController(getContentfulCatalogService);
