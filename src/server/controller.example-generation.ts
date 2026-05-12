import { NoPathParams, RequestOptions } from "../shared/main.service.js";
import {
  ExampleGenerationBodyParameters,
  ExampleGenerationResponse,
  exampleGenerationService,
} from "../shared/service.example-generation.js";
import { AbstractController } from "./main.controller.js";
import { examplePrompt } from "./prompt.example.js";
import { getTextCompletion } from "./util.submit-prompt.js";
import { getAppConfig } from "./util.app.js";

export class ExampleGenerationController extends AbstractController<
  ExampleGenerationBodyParameters,
  NoPathParams,
  ExampleGenerationResponse
> {
  async handler({
    bodyParams,
  }: RequestOptions<ExampleGenerationBodyParameters, NoPathParams>): Promise<ExampleGenerationResponse> {
    const appConfig = await getAppConfig();
    const prompts = await examplePrompt(bodyParams.instructions);
    const result = await getTextCompletion<string>(prompts, appConfig.model);
    return {
      message: result.completion,
    };
  }
}

export const exampleGenerationController = new ExampleGenerationController(exampleGenerationService);
