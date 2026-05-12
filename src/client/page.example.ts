import { css, html, TemplateResult } from "lit";
import { customElement } from "lit/decorators.js";
import { parseRouteParams } from "../shared/util.route-params.js";
import { RpgChroniclerAppProvider } from "./provider.app.js";
import { globalStyles } from "./styles.global.js";
import { leftArrowIcon } from "./icons.js";

@customElement("rpg-chronicler-example-page")
export class RpgChroniclerExamplePage extends RpgChroniclerAppProvider {
  params = parseRouteParams("/example/:id", window.location.pathname);

  static override styles = [
    globalStyles,
    css`
      main {
        text-align: center;
      }
    `,
  ];

  override render(): TemplateResult {
    return html`
      <main>
        <a href="/" class="standalone">${leftArrowIcon} Home</a>
        <h1>Hello from the Example Page: ${this.params.id}</h1>
      </main>
    `;
  }
}
