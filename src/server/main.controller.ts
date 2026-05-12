import { Request, Response, NextFunction, Router } from "express";
import { parseRouteParams } from "../shared/util.route-params.js";
import { RequestOptions, Service } from "../shared/main.service.js";

export interface Controller<
  RequestBodyType extends Record<string, any>, // eslint-disable-line @typescript-eslint/no-explicit-any
  PathParams extends Record<string, string>,
  ResponseContent,
> {
  handler(options: RequestOptions<RequestBodyType, PathParams>): Promise<ResponseContent>;
  wrapper(
    Controller: Function, // eslint-disable-line @typescript-eslint/no-unsafe-function-type
  ): (req: Request, res: Response, next: NextFunction) => Promise<void>;
  register(router: Router): void;
}

export abstract class AbstractController<
  RequestBodyType extends Record<string, any>, // eslint-disable-line @typescript-eslint/no-explicit-any
  PathParams extends Record<string, string>,
  ResponseContent,
> implements Controller<RequestBodyType, PathParams, ResponseContent> {
  abstract handler(options: RequestOptions<RequestBodyType, PathParams>): Promise<ResponseContent>;

  private readonly service: Service<RequestBodyType, PathParams, ResponseContent>;

  constructor(service: Service<RequestBodyType, PathParams, ResponseContent>) {
    this.service = service;
  }

  wrapper(): (req: Request, res: Response, next: NextFunction) => Promise<void> {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        if (req.path.startsWith("/api/")) {
          if (Array.isArray(this.service.path)) {
            throw new Error("Cannot handle multiple paths in a single api controller.");
          }
          const pathParams = parseRouteParams(this.service.path, req.path);
          const body = this.service.RequestBodyType.parse(req.body ? req.body : {});
          const options: RequestOptions<RequestBodyType, PathParams> = {
            bodyParams: body,
            pathParams: this.service.PathParams.parse(pathParams),
          };
          res.json(await this.handler(options));
        } else {
          console.log(`Page Request: ${req.method} ${req.path}`);
          res.send(await this.handler({} as RequestOptions<RequestBodyType, PathParams>));
        }
      } catch (error) {
        next(error);
      }
    };
  }

  async register(router: Router): Promise<void> {
    if (Array.isArray(this.service.path)) {
      for (const path of this.service.path) {
        await this.registerSinglePath(router, path);
      }
    } else {
      await this.registerSinglePath(router, this.service.path);
    }
  }

  private async registerSinglePath(router: Router, path: string): Promise<void> {
    console.log(`Registering route: ${this.service.method} ${path}`);
    router[this.service.method](path, this.wrapper());
  }
}
