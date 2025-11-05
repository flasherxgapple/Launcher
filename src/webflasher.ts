type ManifestDevice = {
  display?: boolean;
  name: string;
  description?: string;
  link?: string;
  family: string;
  id: string;
};

type ManifestData = Record<string, ManifestDevice[]>;

type WebInstallButtonElement = HTMLElement & {
  manifest?: unknown;
};

type SelectionState = {
  releaseValue: string;
  releaseLabel: string;
  vendor: string;
  deviceId: string;
  deviceName: string;
};

const releaseOptions = [
  {
    value: "Release",
    label: "Last Release",
    description: "Stable builds recommended for everyday use."
  },
  {
    value: "Beta",
    label: "Beta Release",
    description: "Early-access updates with the newest features."
  }
] as const;

const ensureSelectionStyles = () => {
  if (document.getElementById("webflasher-selection-style")) {
    return;
  }
  const style = document.createElement("style");
  style.id = "webflasher-selection-style";
  style.textContent = `
    .selection-card {
      border-radius: var(--radius-md);
      border: 1px solid rgba(0, 221, 0, 0.2);
      background: rgba(28, 32, 36, 0.8);
      display: grid;
      gap: 12px;
      padding: 20px;
      text-align: left;
      cursor: pointer;
      transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
    }
    .selection-card--device {
      padding-bottom: 72px;
    }
    .selection-card:hover {
      transform: translateY(-2px);
      border-color: rgba(0, 221, 0, 0.4);
    }
    .selection-card strong {
      font-size: 1.1rem;
    }
    .selection-card[data-selected="true"] {
      border-color: rgba(224, 210, 4, 0.7);
      box-shadow: 0 0 0 2px rgba(224, 210, 4, 0.25);
    }
    .selection-card:focus-visible {
      outline: 2px solid rgba(224, 210, 4, 0.7);
      outline-offset: 3px;
    }
    .selection-card-wrapper {
      position: relative;
      height: 100%;
    }
    .selection-card-wrapper .selection-card {
      width: 100%;
      height: 100%;
    }
    .selection-card__store-link {
      position: absolute;
      right: 20px;
      bottom: 20px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: rgba(20, 24, 28, 0.9);
      box-shadow: 0 8px 18px rgba(0, 0, 0, 0.35);
      color: #facc15;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      text-decoration: none;
      pointer-events: auto;
    }
    .selection-card__store-link:hover,
    .selection-card__store-link:focus-visible {
      transform: translateY(-2px) scale(1.05);
      box-shadow: 0 10px 22px rgba(0, 0, 0, 0.45);
      outline: none;
    }
    .selection-card__store-link svg {
      width: 22px;
      height: 22px;
    }
    .selection-card__badge {
      position: absolute;
      top: 12px;
      right: 12px;
      padding: 4px 10px;
      border-radius: 999px;
      background: rgba(224, 210, 4, 0.92);
      color: #05160d;
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      box-shadow: 0 4px 14px rgba(224, 210, 4, 0.35);
    }
    [data-device-container] {
      grid-auto-rows: 1fr;
    }
    [data-device-container] > .selection-card-wrapper {
      height: 100%;
    }
  `;
  document.head.appendChild(style);
};

const createSelectionCard = (config: {
  title: string;
  subtitle?: string;
  value: string;
}): HTMLButtonElement => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "selection-card";
  button.dataset.value = config.value;
  button.setAttribute("aria-pressed", "false");
  button.innerHTML = `
    <strong>${config.title}</strong>
    ${config.subtitle ? `<p>${config.subtitle}</p>` : ""}
  `;
  return button;
};

const WEBFLASHER_THEME_ID = "webflasher-esp-theme";
const ROCKET_STYLE_ID = "rocket-progress-style";
const DEFAULT_ROCKET_RANGE_X = "220px";
const DEFAULT_ROCKET_RANGE_Y = "-90px";
const ROCKET_STYLE = `
    :host([data-webflasher-themed]) {
      display: block;
      color: transparent;
    }
    .rocket-progress {
      position: relative;
      width: min(360px, 82vw);
      padding: 32px 28px 68px;
      display: grid;
      gap: 24px;
      justify-items: center;
      background: linear-gradient(180deg, rgba(0, 221, 0, 0.16) 0%, rgba(0, 0, 0, 0) 65%);
      border-radius: var(--radius-md, 16px);
      border: 1px solid rgba(0, 221, 0, 0.22);
      box-shadow: 0 18px 48px rgba(0, 221, 0, 0.2);
      overflow: hidden;
    }
    .rocket-progress[data-indeterminate="true"] .rocket-progress__rocket {
      animation: rocket-indeterminate 3.4s ease-in-out infinite;
    }
    .rocket-progress__spinner {
      position: absolute !important;
      width: 1px !important;
      height: 1px !important;
      padding: 0 !important;
      border: 0 !important;
      clip: rect(0 0 0 0);
      clip-path: inset(50%);
    }
    .rocket-progress__legacy-counter {
      display: none !important;
    }
    .rocket-progress__scene {
      position: relative;
      width: 100%;
      height: 150px;
      border-radius: var(--radius-md, 16px);
      border: 1px solid rgba(0, 221, 0, 0.15);
      background: radial-gradient(circle at 15% 85%, rgba(0, 221, 0, 0.18), rgba(4, 8, 10, 0.9) 65%), linear-gradient(180deg, rgba(4, 8, 11, 0.85), rgba(4, 8, 11, 0.45));
      box-shadow: inset 0 0 0 1px rgba(224, 210, 4, 0.08);
      overflow: hidden;
    }
    .rocket-progress__scene::after {
      content: "";
      position: absolute;
      inset: 0;
      background-image: radial-gradient(circle at 12% 10%, rgba(224, 210, 4, 0.6) 0, rgba(224, 210, 4, 0.6) 1px, transparent 1px), radial-gradient(circle at 82% 28%, rgba(245, 248, 242, 0.75) 0, rgba(245, 248, 242, 0.75) 1px, transparent 1px), radial-gradient(circle at 44% 42%, rgba(0, 221, 0, 0.4) 0, rgba(0, 221, 0, 0.4) 1px, transparent 1px), radial-gradient(circle at 65% 70%, rgba(245, 248, 242, 0.4) 0, rgba(245, 248, 242, 0.4) 1px, transparent 1px);
      opacity: 0.75;
      mix-blend-mode: screen;
      animation: rocket-stars 6s linear infinite;
    }
    .rocket-progress__earth {
      position: absolute;
      bottom: -36px;
      left: 12px;
      width: 132px;
      height: 132px;
      border-radius: 50%;
      background: radial-gradient(circle at 35% 25%, rgba(0, 221, 0, 0.9), rgba(0, 34, 14, 0.88) 70%);
      box-shadow: 0 -6px 18px rgba(0, 221, 0, 0.36);
    }
    .rocket-progress__moon {
      position: absolute;
      top: 20px;
      right: 18px;
      width: 54px;
      height: 54px;
      border-radius: 50%;
      background: radial-gradient(circle at 35% 35%, rgba(224, 210, 4, 0.95), rgba(88, 80, 0, 0.7) 80%);
      box-shadow: 0 0 24px rgba(224, 210, 4, 0.35);
    }
    .rocket-progress__rocket {
      position: absolute;
      left: 34px;
      bottom: 16px;
      width: 32px;
      height: 80px;
      transform: translate(calc(var(--rocket-progress, 0) * var(--rocket-range-x, 220px)), calc(var(--rocket-progress, 0) * var(--rocket-range-y, -30px))) rotate(calc(var(--rocket-progress, 0) * 90deg));
      transform-origin: center;
      transition: transform 200ms ease;
    }
    .rocket-progress__rocket-body {
      position: relative;
      width: 100%;
      height: 100%;
      border-radius: 50% 50% 28% 28%;
      background: linear-gradient(180deg, rgba(245, 248, 242, 0.92) 0%, rgba(224, 210, 4, 0.82) 78%, rgba(255, 140, 64, 0.75) 100%);
      border: 1px solid rgba(224, 210, 4, 0.55);
      box-shadow: 0 12px 28px rgba(224, 210, 4, 0.24);
    }
    .rocket-progress__rocket-body::before {
      content: "";
      position: absolute;
      top: 18px;
      left: 50%;
      transform: translateX(-50%);
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: radial-gradient(circle at 30% 30%, rgba(0, 221, 0, 0.95), rgba(0, 32, 12, 0.85));
      box-shadow: 0 0 10px rgba(0, 221, 0, 0.45);
    }
    .rocket-progress__rocket-body::after {
      content: "";
      position: absolute;
      bottom: -16px;
      left: 50%;
      transform: translate(-50%, 4px) scale(0.9, 1.2);
      width: 22px;
      height: 26px;
      border-radius: 50% 50% 50% 50%;
      background: radial-gradient(circle at 50% 20%, rgba(255, 184, 96, 0.95), rgba(255, 94, 0, 0.8));
      filter: blur(0.4px);
      animation: rocket-flame 280ms ease-in-out infinite alternate;
    }
    .rocket-progress__rocket::before,
    .rocket-progress__rocket::after {
      content: "";
      position: absolute;
      bottom: 28px;
      width: 24px;
      height: 22px;
      border-radius: 40% 20% 10% 10%;
      background: linear-gradient(180deg, rgba(0, 221, 0, 0.7), rgba(6, 18, 10, 0.9));
      transition: inherit;
    }
    .rocket-progress__rocket::before {
      left: -18px;
      transform: skewY(-16deg);
    }
    .rocket-progress__rocket::after {
      right: -18px;
      transform: scaleX(-1) skewY(-16deg);
    }
    .rocket-progress__trail {
      position: absolute;
      inset: auto 50% 0 50%;
      width: 2px;
      height: 100%;
      background: linear-gradient(180deg, rgba(224, 210, 4, 0.15), rgba(0, 221, 0, 0));
      transform-origin: top;
      transform: translateX(-50%) scaleY(calc(var(--rocket-progress, 0) * 0.8 + 0.2));
      transition: transform 220ms ease;
      mix-blend-mode: screen;
    }
    .rocket-progress__counter {
      font-size: clamp(1.5rem, 2vw + 1rem, 2rem);
      font-weight: 700;
      letter-spacing: 0.08em;
      color: var(--accent);
      text-shadow: 0 0 18px rgba(224, 210, 4, 0.45);
    }
    .rocket-progress__label {
      margin: 0;
      font-size: 1rem;
      color: var(--text, #f5f8f2);
      text-align: center;
      text-shadow: 0 0 18px rgba(0, 221, 0, 0.25);
    }
    @keyframes rocket-flame {
      from {
        transform: translate(-50%, 6px) scale(0.85, 0.9);
        opacity: 0.75;
      }
      to {
        transform: translate(-50%, 0) scale(1.05, 1.2);
        opacity: 1;
      }
    }
    @keyframes rocket-indeterminate {
      0% {
        transform: translate(0, 0) rotate(-6deg);
      }
      30% {
        transform: translate(70px, -40px) rotate(-12deg);
      }
      60% {
        transform: translate(140px, -66px) rotate(-10deg);
      }
      100% {
        transform: translate(0, 0) rotate(-6deg);
      }
    }
    @keyframes rocket-stars {
      0% {
        transform: translateY(0);
      }
      100% {
        transform: translateY(20px);
      }
    }
  `;
const ROCKET_SCENE_TEMPLATE = `
      <div class="rocket-progress__earth"></div>
      <div class="rocket-progress__moon"></div>
      <div class="rocket-progress__rocket">
        <div class="rocket-progress__rocket-body"></div>
        <div class="rocket-progress__trail"></div>
      </div>
    `;

const ensureEspBaseStyles = () => {
  if (document.getElementById(WEBFLASHER_THEME_ID)) {
    return;
  }

  const themeStyle = document.createElement("style");
  themeStyle.id = WEBFLASHER_THEME_ID;
  themeStyle.textContent = `
    .page-webflasher esp-web-install-button {
      --esp-tools-button-text-color: #05160d;
      --esp-tools-button-color: var(--primary);
      --esp-tools-button-border-radius: var(--radius-lg);
    }
    .page-webflasher ewt-install-dialog {
      --text-color: var(--text);
      --danger-color: #ff6f6f;
      --md-sys-color-primary: var(--primary);
      --md-sys-color-on-primary: #021408;
      --md-sys-color-on-secondary-container: var(--text);
      --md-sys-color-secondary: var(--accent);
      --md-sys-color-surface: rgba(12, 18, 21, 0.98);
      --md-sys-color-surface-container: rgba(16, 22, 25, 0.94);
      --md-sys-color-surface-container-high: rgba(20, 26, 30, 0.96);
      --md-sys-color-surface-container-highest: rgba(24, 30, 34, 0.98);
      --md-sys-color-secondary-container: rgba(0, 221, 0, 0.12);
      --md-sys-color-outline: rgba(0, 221, 0, 0.32);
      --md-sys-color-on-surface: var(--text);
      --md-sys-color-on-surface-variant: var(--text-subtle);
      --md-sys-color-on-background: var(--text);
      --mdc-theme-primary: var(--primary);
      --mdc-theme-on-primary: #021408;
      --mdc-theme-surface: rgba(12, 18, 21, 0.96);
      --mdc-theme-on-surface: var(--text);
      --mdc-theme-text-primary-on-background: var(--text);
      --mdc-theme-on-secondary: #021408;
      --mdc-theme-secondary: var(--accent);
      --mdc-theme-error: #ff6f6f;
      --md-list-item-label-text-color: var(--text);
      --md-list-item-supporting-text-color: var(--text-subtle);
      --md-checkbox-label-color: var(--text);
      --md-checkbox-unselected-icon-color: rgba(245, 248, 242, 0.65);
      --md-checkbox-selected-icon-color: #021408;
      --md-filled-button-label-text-color: #021408;
      --md-filled-button-container-color: var(--primary);
      --md-text-button-label-text-color: var(--accent);
    }
  `;
  document.head.appendChild(themeStyle);
};

type InstallButtonWithPatch = WebInstallButtonElement & {
  shadowRoot: ShadowRoot | null;
  __webflasherStyled?: boolean;
  __webflasherPatched?: boolean;
};

const styleInstallButton = (element: InstallButtonWithPatch) => {
  if (!element || element.__webflasherStyled) {
    return;
  }

  const shadow = element.shadowRoot;
  if (!shadow) {
    return;
  }

  if (!shadow.getElementById("webflasher-install-style")) {
    const style = document.createElement("style");
    style.id = "webflasher-install-style";
    style.textContent = `
      :host {
        --esp-tools-button-color: transparent;
      }
      button.webflasher-connect {
        position: relative;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
        padding: 14px 38px;
        border-radius: var(--radius-lg, 24px);
        border: 1px solid rgba(224, 210, 4, 0.3);
        background: linear-gradient(135deg, rgba(0, 221, 0, 0.92) 0%, rgba(224, 210, 4, 0.88) 100%);
        color: #05160d;
        font-size: 0.95rem;
        font-weight: 600;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        box-shadow: 0 18px 38px rgba(0, 221, 0, 0.24), 0 0 0 1px rgba(0, 221, 0, 0.3);
        transition: transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease;
      }
      button.webflasher-connect::before {
        content: "";
        position: absolute;
        inset: 3px;
        border-radius: inherit;
        background: linear-gradient(135deg, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0));
        opacity: 0.7;
        transition: opacity 0.2s ease;
      }
      button.webflasher-connect::after {
        content: "";
        position: absolute;
        inset: -18px;
        border-radius: inherit;
        background: radial-gradient(circle, rgba(0, 221, 0, 0.28), transparent 65%);
        filter: blur(18px);
        opacity: 0.9;
        pointer-events: none;
        transition: opacity 0.2s ease;
      }
      button.webflasher-connect:hover,
      button.webflasher-connect:focus-visible {
        transform: translateY(-1px) scale(1.01);
        box-shadow: 0 22px 48px rgba(0, 221, 0, 0.35), 0 0 0 1px rgba(224, 210, 4, 0.45);
      }
      button.webflasher-connect:hover::before {
        opacity: 1;
      }
      button.webflasher-connect:focus-visible {
        outline: 2px solid rgba(224, 210, 4, 0.8);
        outline-offset: 3px;
      }
      :host([active]) button.webflasher-connect {
        opacity: 0.78;
        transform: none;
        box-shadow: none;
      }
    `;
    shadow.appendChild(style);
  }

  const button = shadow.querySelector("button");
  if (button) {
    button.classList.add("webflasher-connect");
  }

  element.__webflasherStyled = true;
};

const registerInstallButtonPatch = () => {
  const ctor = customElements.get("esp-web-install-button") as (CustomElementConstructor & {
    prototype: InstallButtonWithPatch & {
      connectedCallback?: (...args: unknown[]) => void;
    };
  }) | undefined;

  if (!ctor) {
    customElements.whenDefined("esp-web-install-button").then(registerInstallButtonPatch);
    return;
  }

  if (!ctor.prototype.__webflasherPatched) {
    const originalConnected = ctor.prototype.connectedCallback;
    ctor.prototype.connectedCallback = function connectedCallbackPatched(this: InstallButtonWithPatch, ...args: unknown[]) {
      if (typeof originalConnected === "function") {
        originalConnected.apply(this, args);
      }

      const applyStyles = () => styleInstallButton(this);
      if (this.shadowRoot) {
        requestAnimationFrame(applyStyles);
      } else {
        setTimeout(applyStyles, 0);
      }
    };
    ctor.prototype.__webflasherPatched = true;
  }

  document.querySelectorAll<InstallButtonWithPatch>("esp-web-install-button").forEach((button) => {
    if (!button.shadowRoot) {
      button.addEventListener("rendered", () => styleInstallButton(button), { once: true });
    }
    styleInstallButton(button);
  });
};

type InstallDialogElement = HTMLElement & {
  __webflasherThemed?: boolean;
  shadowRoot: ShadowRoot | null;
  __webflasherPatched?: boolean;
};

const themeInstallDialog = (dialog: InstallDialogElement) => {
  if (!(dialog instanceof HTMLElement) || dialog.__webflasherThemed) {
    return;
  }

  dialog.__webflasherThemed = true;
  const shadow = dialog.shadowRoot;
  if (shadow && !shadow.getElementById("webflasher-install-dialog-style")) {
    const style = document.createElement("style");
    style.id = "webflasher-install-dialog-style";
    style.textContent = `
      :host {
        color: var(--text);
        font-family: "Inter", "Segoe UI", system-ui, -apple-system, sans-serif;
      }
      .dialog-nav,
      .dialog-nav *,
      .content,
      .content *,
      .actions,
      .actions * {
        color: var(--text);
      }
      .dialog-nav svg {
        color: var(--primary);
      }
      .dialog-nav button,
      .actions button {
        color: var(--accent);
      }
      .actions button[variant="filled"],
      .actions md-filled-button {
        color: #021408;
      }
      ew-list-item {
        color: var(--text);
      }
      .danger {
        --mdc-theme-primary: #ff6f6f;
        --md-sys-color-primary: #ff6f6f;
      }
    `;
    shadow.appendChild(style);
  }
};

const registerInstallDialogPatch = () => {
  const ctor = customElements.get("ewt-install-dialog") as (CustomElementConstructor & {
    prototype: InstallDialogElement & {
      connectedCallback?: (...args: unknown[]) => void;
      updated?: (...args: unknown[]) => void;
    };
  }) | undefined;

  if (!ctor) {
    customElements.whenDefined("ewt-install-dialog").then(registerInstallDialogPatch);
    return;
  }

  if (!ctor.prototype.__webflasherPatched) {
    const originalConnected = ctor.prototype.connectedCallback;
    ctor.prototype.connectedCallback = function connectedCallbackPatched(this: InstallDialogElement, ...args: unknown[]) {
      if (typeof originalConnected === "function") {
        originalConnected.apply(this, args);
      }
      themeInstallDialog(this);
    };

    const originalUpdated = ctor.prototype.updated;
    ctor.prototype.updated = function updatedPatched(this: InstallDialogElement, ...args: unknown[]) {
      if (typeof originalUpdated === "function") {
        originalUpdated.apply(this, args);
      }
      themeInstallDialog(this);
    };

    ctor.prototype.__webflasherPatched = true;
  }

  document.querySelectorAll<InstallDialogElement>("ewt-install-dialog").forEach((dialog) => themeInstallDialog(dialog));
};

type EwDialogElement = HTMLElement & {
  __webflasherPatched?: boolean;
  shadowRoot: ShadowRoot | null;
  firstUpdated?: (...args: unknown[]) => void;
  updated?: (...args: unknown[]) => void;
};

const injectDialogSurfaceStyles = (dialog: EwDialogElement) => {
  if (!dialog) {
    return;
  }

  const shadow = dialog.shadowRoot;
  if (!shadow || shadow.getElementById("webflasher-ew-dialog-style")) {
    return;
  }

  const style = document.createElement("style");
  style.id = "webflasher-ew-dialog-style";
  style.textContent = `
    dialog {
      background: transparent;
      border: none;
      padding: 0;
    }
    .container {
      box-sizing: border-box;
      background: rgba(12, 18, 21, 0.96);
      border-radius: var(--radius-lg, 24px);
      border: 1px solid var(--primary, #00dd00);
      box-shadow: 0 34px 120px rgba(0, 221, 0, 0.25);
      backdrop-filter: blur(24px);
      color: var(--text);
    }
    .container::before {
      background: rgba(12, 18, 21, 0.96);
      border-radius: inherit;
    }
    dialog::backdrop {
      background: rgba(6, 10, 12, 0.7);
    }
    .headline,
    .content,
    .actions {
      font-family: "Inter", "Segoe UI", system-ui, -apple-system, sans-serif;
      color: inherit;
    }
    .headline,
    .headline * {
      color: var(--accent);
    }
    .content,
    .content * {
      color: var(--text);
    }
    .actions {
      border-top: 1px solid rgba(0, 221, 0, 0.18);
      margin-top: 18px;
      padding-top: 18px;
      gap: 12px;
    }
    .actions button {
      color: var(--accent);
    }
    .actions button[variant="filled"],
    .actions md-filled-button {
      color: #021408;
    }
    button {
      font-family: inherit;
    }
  `;
  shadow.appendChild(style);
};

const registerEwDialogPatch = () => {
  const ctor = customElements.get("ew-dialog") as (CustomElementConstructor & {
    prototype: EwDialogElement;
  }) | undefined;

  if (!ctor) {
    customElements.whenDefined("ew-dialog").then(registerEwDialogPatch);
    return;
  }

  if (!ctor.prototype.__webflasherPatched) {
    const originalFirstUpdated = ctor.prototype.firstUpdated;
    ctor.prototype.firstUpdated = function firstUpdatedPatched(this: EwDialogElement, ...args: unknown[]) {
      if (typeof originalFirstUpdated === "function") {
        originalFirstUpdated.apply(this, args);
      }
      injectDialogSurfaceStyles(this);
    };

    const originalUpdated = ctor.prototype.updated;
    ctor.prototype.updated = function updatedPatched(this: EwDialogElement, ...args: unknown[]) {
      if (typeof originalUpdated === "function") {
        originalUpdated.apply(this, args);
      }
      injectDialogSurfaceStyles(this);
    };

    ctor.prototype.__webflasherPatched = true;
  }

  document.querySelectorAll<EwDialogElement>("ew-dialog").forEach((dialog) => injectDialogSurfaceStyles(dialog));
};

type PageProgressElement = HTMLElement & {
  __webflasherPatched?: boolean;
  renderRoot?: ShadowRoot;
  shadowRoot: ShadowRoot | null;
  progress?: number;
  label?: string;
  __webflasherLabelText?: string;
  firstUpdated?: (...args: unknown[]) => void;
  updated?: (...args: unknown[]) => void;
};

const ensureProgressScene = (progressEl: PageProgressElement) => {
  if (!progressEl) {
    return;
  }

  const root = (progressEl as { renderRoot?: ShadowRoot }).renderRoot ?? progressEl.shadowRoot;
  if (!root) {
    return;
  }

  const wrapper = root.querySelector("div") as HTMLElement | null;
  if (!wrapper) {
    return;
  }

  if (!root.getElementById(ROCKET_STYLE_ID)) {
    const style = document.createElement("style");
    style.id = ROCKET_STYLE_ID;
    style.textContent = ROCKET_STYLE;
    root.appendChild(style);
  }

  progressEl.setAttribute("data-webflasher-themed", "true");
  wrapper.classList.add("rocket-progress");
  (wrapper as HTMLElement).style.setProperty("--rocket-range-x", DEFAULT_ROCKET_RANGE_X);
  (wrapper as HTMLElement).style.setProperty("--rocket-range-y", DEFAULT_ROCKET_RANGE_Y);

  const spinner = wrapper.querySelector("ew-circular-progress");
  if (spinner instanceof HTMLElement) {
    spinner.classList.add("rocket-progress__spinner");
  }

  Array.from(wrapper.children).forEach((child) => {
    if (!(child instanceof HTMLElement)) {
      return;
    }
    if (
      !child.classList.contains("rocket-progress__scene") &&
      !child.classList.contains("rocket-progress__counter") &&
      child !== spinner
    ) {
      child.classList.add("rocket-progress__legacy-counter");
    }
  });

  let scene = wrapper.querySelector(".rocket-progress__scene");
  if (!scene) {
    scene = document.createElement("div");
    scene.className = "rocket-progress__scene";
    scene.innerHTML = ROCKET_SCENE_TEMPLATE;
    wrapper.appendChild(scene);
  }

  let counter = wrapper.querySelector(".rocket-progress__counter");
  if (!counter) {
    counter = document.createElement("div");
    counter.className = "rocket-progress__counter";
    wrapper.appendChild(counter);
  }

  let labelEl = root.querySelector(".rocket-progress__label");
  if (!labelEl) {
    labelEl = document.createElement("p");
    labelEl.className = "rocket-progress__label";
    root.appendChild(labelEl);
  }
};

const updateProgressScene = (progressEl: PageProgressElement) => {
  if (!progressEl) {
    return;
  }

  const root = (progressEl as { renderRoot?: ShadowRoot }).renderRoot ?? progressEl.shadowRoot;
  if (!root) {
    return;
  }

  const wrapper = root.querySelector(".rocket-progress") as HTMLElement | null;
  if (!wrapper) {
    return;
  }

  const hasValue = typeof progressEl.progress === "number" && !Number.isNaN(progressEl.progress);
  const clampedValue = hasValue ? Math.min(100, Math.max(0, progressEl.progress ?? 0)) : 0;
  wrapper.style.setProperty("--rocket-progress", (clampedValue / 100).toFixed(4));

  const counter = wrapper.querySelector(".rocket-progress__counter");
  if (counter) {
    counter.textContent = `${clampedValue.toFixed(0)}%`;
  }

  const labelValue = typeof progressEl.label === "string" ? progressEl.label : "";
  progressEl.__webflasherLabelText = labelValue;
  const labelEl = root.querySelector(".rocket-progress__label");
  if (labelEl) {
    labelEl.textContent = labelValue;
  }

  if (hasValue) {
    wrapper.removeAttribute("data-indeterminate");
  } else {
    wrapper.setAttribute("data-indeterminate", "true");
  }
};

const registerProgressPatch = () => {
  const ctor = customElements.get("ewt-page-progress") as (CustomElementConstructor & {
    prototype: PageProgressElement;
  }) | undefined;

  if (!ctor) {
    customElements.whenDefined("ewt-page-progress").then(registerProgressPatch);
    return;
  }

  if (!ctor.prototype.__webflasherPatched) {
    const originalFirstUpdated = ctor.prototype.firstUpdated;
    ctor.prototype.firstUpdated = function firstUpdatedPatched(this: PageProgressElement, ...args: unknown[]) {
      if (typeof originalFirstUpdated === "function") {
        originalFirstUpdated.apply(this, args);
      }
      ensureProgressScene(this);
      updateProgressScene(this);
    };

    const originalUpdated = ctor.prototype.updated;
    ctor.prototype.updated = function updatedPatched(this: PageProgressElement, ...args: unknown[]) {
      if (typeof originalUpdated === "function") {
        originalUpdated.apply(this, args);
      }
      if (!((this as { renderRoot?: ShadowRoot }).renderRoot?.querySelector(".rocket-progress") ?? this.shadowRoot?.querySelector(".rocket-progress"))) {
        ensureProgressScene(this);
      }
      updateProgressScene(this);
    };

    ctor.prototype.__webflasherPatched = true;
  }

  document.querySelectorAll<PageProgressElement>("ewt-page-progress").forEach((progressEl) => {
    ensureProgressScene(progressEl);
    updateProgressScene(progressEl);
  });
};

let hasInitializedEspTheme = false;

const applyEspWebToolTheme = () => {
  if (hasInitializedEspTheme) {
    return;
  }
  hasInitializedEspTheme = true;

  ensureEspBaseStyles();
  registerInstallButtonPatch();
  registerInstallDialogPatch();
  registerEwDialogPatch();
  registerProgressPatch();
};

document.addEventListener("DOMContentLoaded", () => {
  ensureSelectionStyles();
  applyEspWebToolTheme();

  const releaseContainer = document.querySelector<HTMLElement>("[data-release-container]");
  const vendorContainer = document.querySelector<HTMLElement>("[data-vendor-container]");
  const vendorPlaceholder = document.querySelector<HTMLElement>("[data-vendor-empty]");
  const deviceContainer = document.querySelector<HTMLElement>("[data-device-container]");
  const descriptionTarget = document.querySelector<HTMLElement>("[data-device-description]");
  const vendorSection = document.querySelector<HTMLElement>("[data-vendor-section]");
  const deviceSection = document.querySelector<HTMLElement>("[data-device-section]");
  const installSection = document.querySelector<HTMLElement>("[data-install-section]");
  const installButton = document.querySelector<WebInstallButtonElement>("esp-web-install-button");
  const manifestSummary = document.querySelector<HTMLElement>("[data-manifest-summary]");

  if (
    !releaseContainer ||
    !vendorContainer ||
    !deviceContainer ||
    !installButton ||
    !manifestSummary
  ) {
    return;
  }

  const vendorMap = new Map<string, ManifestDevice[]>();
  const vendorDevices = new Map<string, ManifestDevice[]>();
  const summaryFallback = "Selection pending...";
  const state: SelectionState = {
    releaseValue: releaseOptions[0]?.value ?? "Release",
    releaseLabel: releaseOptions[0]?.label ?? "Release",
    vendor: "",
    deviceId: "",
    deviceName: ""
  };

  let releaseCards: HTMLButtonElement[] = [];
  let vendorCards: HTMLButtonElement[] = [];
  let deviceCards: HTMLButtonElement[] = [];
  let currentManifestUrl: string | null = null;
  const manifestBaseUrl: URL | null = (() => {
    try {
      const manifestUrl = new URL("manifest.json", window.location.href);
      return new URL(".", manifestUrl);
    } catch {
      try {
        return new URL(".", window.location.href);
      } catch {
        return null;
      }
    }
  })();

  const revokeManifestUrl = () => {
    if (currentManifestUrl) {
      URL.revokeObjectURL(currentManifestUrl);
      currentManifestUrl = null;
    }
  };

  const scrollToSection = (section: HTMLElement | null | undefined) => {
    if (!section) {
      return;
    }
    const header = document.querySelector<HTMLElement>("header");
    const headerHeight = header ? header.getBoundingClientRect().height : 0;
    const sectionTop = section.getBoundingClientRect().top + window.scrollY;
    const offset = Math.max(sectionTop - headerHeight - 16, 0);
    window.scrollTo({ top: offset, behavior: "smooth" });
  };

  const setSummary = () => {
    const parts: string[] = [];
    if (state.releaseLabel) {
      parts.push(state.releaseLabel);
    }
    if (state.vendor) {
      parts.push(state.vendor);
    }
    if (state.deviceName) {
      parts.push(state.deviceName);
    }
    manifestSummary.textContent = parts.length > 0 ? parts.join(" -> ") : summaryFallback;
  };

  const hideInstallButton = () => {
    revokeManifestUrl();
    installButton.setAttribute("hidden", "");
    installButton.removeAttribute("manifest");
  };

  const resetDeviceDetails = (message?: string) => {
    if (descriptionTarget) {
      if (message) {
        descriptionTarget.hidden = false;
        descriptionTarget.textContent = message;
      } else {
        descriptionTarget.hidden = true;
        descriptionTarget.textContent = "";
      }
    }
  };

  const highlightCards = (cards: HTMLButtonElement[], selected: string) => {
    cards.forEach((card) => {
      const isSelected = card.dataset.value === selected;
      if (isSelected) {
        card.dataset.selected = "true";
      } else {
        delete card.dataset.selected;
      }
      card.setAttribute("aria-pressed", isSelected.toString());
    });
  };

  const shouldDisplayDevice = (device: ManifestDevice) => {
    if (state.releaseValue === "Beta") {
      return true;
    }
    return device.display !== false;
  };

  const applySelection = () => {
    if (!state.vendor || !state.deviceId || !state.releaseValue) {
      state.deviceName = "";
      setSummary();
      hideInstallButton();
      resetDeviceDetails();
      return;
    }

    const devices = vendorDevices.get(state.vendor) ?? [];
    const device = devices.find((entry) => entry.id === state.deviceId);
    if (!device) {
      state.deviceName = "";
      setSummary();
      hideInstallButton();
      resetDeviceDetails("Device not found in manifest.");
      return;
    }

    state.deviceName = device.name;
    setSummary();

    if (descriptionTarget) {
      if (device.description) {
        descriptionTarget.hidden = false;
        descriptionTarget.textContent = device.description;
      } else {
        descriptionTarget.hidden = true;
        descriptionTarget.textContent = "";
      }
    }

    const binRelativePath = `bins${state.releaseValue}/Launcher-${device.id}.bin`;
    let binAbsolutePath = binRelativePath;

    if (manifestBaseUrl) {
      try {
        binAbsolutePath = new URL(binRelativePath, manifestBaseUrl).toString();
      } catch (error) {
        console.warn("Unable to resolve firmware from manifest base path.", error);
      }
    }

    const manifest = {
      name: device.name,
      new_install_prompt_erase: true,
      builds: [
        {
          chipFamily: device.family,
          improv: false,
          parts: [
            {
              path: binAbsolutePath,
              offset: 0
            }
          ]
        }
      ]
    };

    revokeManifestUrl();
    currentManifestUrl = URL.createObjectURL(
      new Blob([JSON.stringify(manifest)], { type: "application/json" })
    );
    installButton.setAttribute("manifest", currentManifestUrl);
    installButton.removeAttribute("hidden");
  };

  const renderDeviceCards = (devices: ManifestDevice[]) => {
    deviceContainer.innerHTML = "";
    deviceCards = [];

    if (devices.length === 0) {
      const tile = document.createElement("div");
      tile.className = "tile";
      tile.textContent = "No devices available for this vendor.";
      deviceContainer.appendChild(tile);
      return;
    }

    devices.forEach((device) => {
      const isWip = state.releaseValue === "Beta" && device.display === false;
      const card = createSelectionCard({
        title: device.name,
        subtitle: device.description ?? "Manifest generated automatically.",
        value: device.id
      });
      card.classList.add("selection-card--device");

      const wrapper = document.createElement("div");
      wrapper.className = "selection-card-wrapper";
      if (isWip) {
        card.dataset.wip = "true";
        const badge = document.createElement("span");
        badge.className = "selection-card__badge selection-card__badge--wip";
        badge.textContent = "WIP";
        wrapper.appendChild(badge);
      }
      wrapper.appendChild(card);

      card.addEventListener("click", () => {
        state.deviceId = device.id;
        highlightCards(deviceCards, state.deviceId);
        applySelection();
        scrollToSection(installSection);
      });

      if (device.link) {
        const link = document.createElement("a");
        link.className = "selection-card__store-link";
        link.href = device.link;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.setAttribute("aria-label", `Open ${device.name} device link in a new tab`);
        link.title = `Open ${device.name} link`;
        link.innerHTML = `
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path
              fill="currentColor"
              d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zm10
              0c-1.1 0-1.99.9-1.99 2S15.9 22 17 22s2-.9 2-2-.9-2-2-2zm-.73-3.73L18.6
              6H5.21l-.94-2H1v2h2l3.6 7.59-1.35
              2.45C4.52 16.37 5.48 18 7 18h12v-2H7l1.1-2h7.45c.75 0 1.41-.41 1.75-1.03z"
            ></path>
          </svg>
        `;
        wrapper.appendChild(link);
      }

      deviceCards.push(card);
      deviceContainer.appendChild(wrapper);
    });

    highlightCards(deviceCards, state.deviceId);
  };

  const renderVendorCards = () => {
    vendorContainer.innerHTML = "";
    vendorCards = [];
    vendorDevices.clear();

    if (vendorPlaceholder && vendorPlaceholder.isConnected) {
      vendorPlaceholder.remove();
    }

    if (vendorMap.size === 0) {
      const tile = document.createElement("div");
      tile.className = "tile";
      tile.textContent = "Manifest does not list any vendors.";
      vendorContainer.appendChild(tile);
      return;
    }

    const sortedVendors = Array.from(vendorMap.entries()).sort(([a], [b]) =>
      a.localeCompare(b)
    );

    sortedVendors.forEach(([vendorName, devices]) => {
      const visibleDevices = devices.filter((device) => shouldDisplayDevice(device));
      if (visibleDevices.length === 0) {
        return;
      }

      vendorDevices.set(vendorName, visibleDevices);

      const card = createSelectionCard({
        title: vendorName,
        subtitle: `${visibleDevices.length} device(s) available`,
        value: vendorName
      });

      card.addEventListener("click", () => {
        state.vendor = vendorName;
        state.deviceId = "";
        state.deviceName = "";
        highlightCards(vendorCards, state.vendor);
        renderDeviceCards(visibleDevices);
        setSummary();
        hideInstallButton();
        resetDeviceDetails("Select a device to continue.");
        scrollToSection(deviceSection);
      });

      vendorCards.push(card);
      vendorContainer.appendChild(card);
    });

    if (vendorCards.length === 0) {
      const tile = document.createElement("div");
      tile.className = "tile";
      tile.textContent = "No vendors with visible devices.";
      vendorContainer.appendChild(tile);
      return;
    }

    if (state.vendor && !vendorDevices.has(state.vendor)) {
      state.vendor = "";
      state.deviceId = "";
      state.deviceName = "";
    }

    highlightCards(vendorCards, state.vendor);

    if (state.vendor) {
      const devices = vendorDevices.get(state.vendor) ?? [];
      renderDeviceCards(devices);
    }
  };

  const renderReleaseCards = () => {
    releaseContainer.innerHTML = "";
    releaseCards = [];

    releaseOptions.forEach((option) => {
      const card = createSelectionCard({
        title: option.label,
        subtitle: option.description,
        value: option.value
      });

      card.addEventListener("click", () => {
        state.releaseValue = option.value;
        state.releaseLabel = option.label;
        highlightCards(releaseCards, state.releaseValue);
        setSummary();
        renderVendorCards();
        applySelection();
        scrollToSection(vendorSection);
      });

      releaseCards.push(card);
      releaseContainer.appendChild(card);
    });

    highlightCards(releaseCards, state.releaseValue);
  };

  setSummary();
  hideInstallButton();
  resetDeviceDetails("Select a vendor to see the devices.");

  renderReleaseCards();

  fetch("manifest.json")
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to load manifest: ${response.status}`);
      }
      return response.json() as Promise<ManifestData>;
    })
    .then((manifest) => {
      vendorMap.clear();
      Object.entries(manifest).forEach(([vendorName, devices]) => {
        vendorMap.set(vendorName, devices);
      });
      renderVendorCards();
    })
    .catch(() => {
      manifestSummary.textContent = "Manifest load failed.";
      hideInstallButton();
      vendorContainer.innerHTML = "";
      deviceContainer.innerHTML = "";

      const vendorTile = document.createElement("div");
      vendorTile.className = "tile";
      vendorTile.textContent = "Unable to load the manifest.";
      vendorContainer.appendChild(vendorTile);

      const deviceTile = document.createElement("div");
      deviceTile.className = "tile";
      deviceTile.textContent = "Manifest unavailable.";
      deviceContainer.appendChild(deviceTile);
    });

  window.addEventListener("beforeunload", () => {
    revokeManifestUrl();
  });
});
