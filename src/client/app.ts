import { css, html, LitElement, PropertyValues, TemplateResult } from "lit";
import { customElement, property, query } from "lit/decorators.js";
import { RouteConfig, RouteName } from "../shared/type.routes.js";
import { parseRouteParams } from "../shared/util.route-params.js";
import { routes } from "../shared/service.client.js";
import { RpgChroniclerAbstractProvider } from "./provider.abstract.js";
import { RpgChroniclerToast } from "./component.toast.js";
import { RpgChroniclerSaveIndicator } from "./component.save-indicator.js";
import { SaveEventName } from "./event.save.js";
import { NavigationEventName } from "./event.navigation.js";
import { SuccessEventName } from "./event.success.js";
import { WarningEventName } from "./event.warning.js";
import "./page.home.js";
import "./page.jobs.js";
import "./page.job.js";
import "./page.job-logs.js";
import "./page.example.js";
import "./page.not-found.js";
import "./component.toast.js";
import "./component.save-indicator.js";

@customElement("rpg-chronicler-app")
export class RpgChroniclerApp extends LitElement {
  static override styles = [
    css`
      .app-bar {
        border-top: 3px solid transparent;
        border-image: linear-gradient(to right, var(--color-1) 10%, var(--color-2) 90%) 2;
        position: fixed;
        width: 100vw;
        top: 0;
        left: 0;
        z-index: 999;
      }
    `,
  ];
  routes: RouteConfig[] = routes;

  @property({ type: String })
  currentRoute: RouteConfig | null = this.determineRouteName();

  @property({ type: String }) toastMessage = "";
  @property({ type: String }) toastType: "error" | "warning" | "success" | "info" = "info";
  @property({ type: Boolean }) toastVisible = false;
  @query("rpg-chronicler-toast") toast!: RpgChroniclerToast;
  @query("rpg-chronicler-save-indicator") saveIndicator!: RpgChroniclerSaveIndicator;

  override connectedCallback(): void {
    super.connectedCallback();
    document.addEventListener("click", this.navigate.bind(this));
    document.addEventListener(WarningEventName.value, (event: Event) => {
      const customEvent = event as CustomEvent;
      this.toast.show(customEvent.detail.message, "warning");
    });
    document.addEventListener(SuccessEventName.value, (event: Event) => {
      const customEvent = event as CustomEvent;
      this.toast.show(customEvent.detail.message, "success");
    });
    document.addEventListener(NavigationEventName.value, (event: Event) => {
      const customEvent = event as CustomEvent;
      window.history.pushState({}, "", customEvent.detail.path);
      this.currentRoute = this.determineRouteName();
      this.requestUpdate();
    });

    this.addEventListener(SaveEventName.value, this.handleSaveEvent);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener(SaveEventName.value, this.handleSaveEvent);
  }

  override render(): TemplateResult {
    const pageContent = this.currentRoute
      ? ((): TemplateResult => {
          switch (this.currentRoute!.name) {
            case RouteName.enum.home:
              return html`
                <div class="app-bar"></div>
                <rpg-chronicler-home-page></rpg-chronicler-home-page>
              `;
            case RouteName.enum.jobs:
              return html`
                <div class="app-bar"></div>
                <rpg-chronicler-jobs-page></rpg-chronicler-jobs-page>
              `;
            case RouteName.enum.job:
              return html`
                <div class="app-bar"></div>
                <rpg-chronicler-job-page></rpg-chronicler-job-page>
              `;
            case RouteName.enum.job_logs:
              return html`
                <div class="app-bar"></div>
                <rpg-chronicler-job-logs-page></rpg-chronicler-job-logs-page>
              `;
            case RouteName.enum.example:
              return html`
                <div class="app-bar"></div>
                <rpg-chronicler-example-page></rpg-chronicler-example-page>
              `;
            default:
              return html`
                <div class="app-bar"></div>
                <rpg-chronicler-not-found-page></rpg-chronicler-not-found-page>
              `;
          }
        })()
      : html`
          <rpg-chronicler-not-found-page></rpg-chronicler-not-found-page>
        `;

    return html`
      ${pageContent}
      <rpg-chronicler-toast
        .message="${this.toastMessage}"
        .type="${this.toastType}"
        .visible="${this.toastVisible}"
        @close=${this.handleToastClose}></rpg-chronicler-toast>
      <rpg-chronicler-save-indicator></rpg-chronicler-save-indicator>
      <rpg-chronicler-notification-manager></rpg-chronicler-notification-manager>
    `;
  }

  determineRouteName(): RouteConfig | null {
    const pathname = window.location.pathname;

    for (const route of this.routes) {
      try {
        const params = parseRouteParams(route.path, pathname);
        if (params !== null) {
          return route;
        }
      } catch {
        // Ignore parsing errors and continue to next route
      }
    }

    return null;
  }

  async navigate(event: Event): Promise<void> {
    let target: HTMLAnchorElement | null = null;
    for (const el of event.composedPath()) {
      if (el instanceof HTMLElement && el.tagName === "A") {
        target = el as HTMLAnchorElement;
        break;
      }
    }

    if (
      target &&
      target.href &&
      !target.hasAttribute("download") &&
      target.target !== "_blank" &&
      target.origin === window.location.origin
    ) {
      event.preventDefault();
      sessionStorage.setItem("previousUrl", "");
      const url = new URL(target.href);
      const path = url.pathname;
      window.history.pushState({}, "", path);
      this.currentRoute = this.determineRouteName();
      this.requestUpdate();
    }
  }

  protected override update(changedProperties: PropertyValues): void {
    super.update(changedProperties);
    if (this.currentRoute != null && changedProperties.has("currentRoute")) {
      const tagName = `rpg-chronicler-${this.currentRoute.name.replace(/_/g, "-")}-page`;
      const pageElement = this.shadowRoot?.querySelector(tagName);
      const provider = pageElement as RpgChroniclerAbstractProvider;
      provider.load().then(() => provider.requestUpdate());
    }
  }

  private handleToastClose(): void {
    this.toastVisible = false;
    this.requestUpdate();
  }

  private handleSaveEvent(): void {
    this.saveIndicator.show();
  }
}
