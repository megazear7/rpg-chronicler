import { LitElement } from "lit";

export abstract class RpgChroniclerAbstractProvider extends LitElement {
  abstract load(): Promise<void>;
}
