import { ErrorResponse, HttpMethod } from "./type.http.js";
import { renderPathname } from "./util.route-params.js";
import z, { ZodObject, ZodType } from "zod";
import { ONE_DAY_IN_MS } from "./util.time.js";

export const NoBodyParams = z.object({}).strict();
export type NoBodyParams = z.infer<typeof NoBodyParams>;

export const NoPathParams = z.object({}).strict();
export type NoPathParams = z.infer<typeof NoPathParams>;

export const ServiceType = z.enum(["json", "html"]);
export type ServiceType = z.infer<typeof ServiceType>;

export interface RequestOptions<
  RequestBodyType extends Record<string, any>, // eslint-disable-line @typescript-eslint/no-explicit-any
  PathParams extends Record<string, string>,
> {
  bodyParams: RequestBodyType;
  pathParams: PathParams;
}

export interface Service<
  RequestBodyType extends Record<string, any>, // eslint-disable-line @typescript-eslint/no-explicit-any
  PathParams extends Record<string, string>,
  ResponseContent,
> {
  readonly method: HttpMethod;
  readonly path: string | string[];
  readonly RequestBodyType: ZodType<RequestBodyType>;
  readonly PathParams: ZodType<PathParams>;
  readonly ResponseContent: ZodType<ResponseContent>;
}

export abstract class AbstractService<
  RequestBodyType extends Record<string, any>, // eslint-disable-line @typescript-eslint/no-explicit-any
  PathParams extends Record<string, string>,
  ResponseContent,
> implements Service<RequestBodyType, PathParams, ResponseContent> {
  abstract readonly method: HttpMethod;
  abstract readonly path: string | string[];
  abstract readonly type: ServiceType;

  readonly RequestBodyType: ZodType<RequestBodyType>;
  readonly PathParams: ZodType<PathParams>;
  readonly ResponseContent: ZodType<ResponseContent>;

  constructor(
    RequestBodyType: ZodType<RequestBodyType>,
    PathParams: ZodType<PathParams>,
    ResponseContent: ZodType<ResponseContent>,
  ) {
    this.RequestBodyType = RequestBodyType;
    this.PathParams = PathParams;
    this.ResponseContent = ResponseContent;
  }

  async fetch(params?: RequestBodyType | PathParams): Promise<ResponseContent> {
    if (Array.isArray(this.path)) {
      throw new Error("Cannot fetch from multiple paths. Specify a single path.");
    }

    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), ONE_DAY_IN_MS);
    const requestConfig: RequestInit = {
      method: this.method.toUpperCase(),
      signal: controller.signal,
    };
    let path = this.path;
    if (params) {
      const RequestBodyType = this.RequestBodyType as ZodObject;
      if (this.method !== HttpMethod.enum.get) {
        const bodyParams = RequestBodyType.strip().parse(params);
        requestConfig.body = JSON.stringify(bodyParams);
        requestConfig.headers = {
          "Content-Type": "application/json",
        };
      }

      const PathParams = this.PathParams as ZodObject;
      const pathParams = PathParams.strip().parse(params);
      const mappedPathParams: Record<string, string> = {};
      for (const [key, value] of Object.entries(pathParams)) {
        mappedPathParams[key] = String(value);
      }
      path = renderPathname(this.path, mappedPathParams);
    }
    const res = await fetch(path, requestConfig);
    clearTimeout(id);
    if (res.status >= 400) {
      const errorResponse = ErrorResponse.parse(await res.json());
      throw new Error(errorResponse.error);
    } else if (this.type === ServiceType.enum.html) {
      return res.text() as Promise<ResponseContent>;
    } else if (this.type === ServiceType.enum.json) {
      return this.ResponseContent.parse(await res.json());
    } else {
      throw new Error(`Unsupported service type: ${this.type}`);
    }
  }

  renderPath(params: PathParams): string {
    if (Array.isArray(this.path)) {
      throw new Error("Cannot render path from multiple paths. Specify a single path.");
    }
    return renderPathname(this.path, params);
  }
}
