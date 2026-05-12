import { NoBodyParams, NoPathParams } from "../shared/main.service.js";
import { clientService } from "../shared/service.client.js";
import { AbstractController } from "./main.controller.js";
import { page } from "./main.page.js";

export class ClientController extends AbstractController<NoBodyParams, NoPathParams, string> {
  async handler(): Promise<string> {
    return page();
  }
}

export const clientController = new ClientController(clientService);
