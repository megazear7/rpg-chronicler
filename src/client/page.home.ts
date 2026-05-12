import { css, html, TemplateResult } from "lit";
import { customElement } from "lit/decorators.js";
import { globalStyles } from "./styles.global.js";
import { RpgChroniclerAppProvider } from "./provider.app.js";

@customElement("rpg-chronicler-home-page")
export class RpgChroniclerHomePage extends RpgChroniclerAppProvider {
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
        <img src="/logo/logo-512x512.png" alt="Zelt Stack Logo" width="200" />
        <h1>Welcome to the Zelt Stack Template!</h1>
        <p>This is a template project to help you get started with Zelt Stack.</p>
        <p><a href="/example/123" class="standalone">Go to Example Page</a></p>
        <p><a href="https://zelt.alexlockhart.me" class="standalone">Read more in the documentation</a></p>
      </main>
    `;
  }
}
