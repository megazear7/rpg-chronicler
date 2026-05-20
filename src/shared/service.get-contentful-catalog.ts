import z from "zod";
import { AbstractService, NoBodyParams, NoPathParams, ServiceType } from "./main.service.js";
import { HttpMethod } from "./type.http.js";
import { ContentfulCatalog } from "./type.contentful-context.js";

export class GetContentfulCatalogService extends AbstractService<NoBodyParams, NoPathParams, ContentfulCatalog> {
  readonly type = ServiceType.enum.json;
  readonly method = HttpMethod.enum.get;
  readonly path = "/api/contentful/catalog";
}

export const getContentfulCatalogService = new GetContentfulCatalogService(
  NoBodyParams,
  NoPathParams,
  ContentfulCatalog,
);

export const GetContentfulCatalogQuery = z.object({});
