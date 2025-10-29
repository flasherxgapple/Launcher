"use strict";
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
];
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
    [data-device-container] {
      grid-auto-rows: 1fr;
    }
    [data-device-container] > .selection-card-wrapper {
      height: 100%;
    }
  `;
    document.head.appendChild(style);
};
const createSelectionCard = (config) => {
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
document.addEventListener("DOMContentLoaded", () => {
    ensureSelectionStyles();
    const releaseContainer = document.querySelector("[data-release-container]");
    const vendorContainer = document.querySelector("[data-vendor-container]");
    const vendorPlaceholder = document.querySelector("[data-vendor-empty]");
    const deviceContainer = document.querySelector("[data-device-container]");
    const descriptionTarget = document.querySelector("[data-device-description]");
    const vendorSection = document.querySelector("[data-vendor-section]");
    const deviceSection = document.querySelector("[data-device-section]");
    const installSection = document.querySelector("[data-install-section]");
    const installButton = document.querySelector("esp-web-install-button");
    const manifestSummary = document.querySelector("[data-manifest-summary]");
    if (!releaseContainer ||
        !vendorContainer ||
        !deviceContainer ||
        !installButton ||
        !manifestSummary) {
        return;
    }
    const vendorMap = new Map();
    const vendorDevices = new Map();
    const summaryFallback = "Selection pending...";
    const state = {
        releaseValue: releaseOptions[0]?.value ?? "Release",
        releaseLabel: releaseOptions[0]?.label ?? "Release",
        vendor: "",
        deviceId: "",
        deviceName: ""
    };
    let releaseCards = [];
    let vendorCards = [];
    let deviceCards = [];
    let currentManifestUrl = null;
    const revokeManifestUrl = () => {
        if (currentManifestUrl) {
            URL.revokeObjectURL(currentManifestUrl);
            currentManifestUrl = null;
        }
    };
    const scrollToSection = (section) => {
        if (!section) {
            return;
        }
        section.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    const setSummary = () => {
        const parts = [];
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
    const resetDeviceDetails = (message) => {
        if (descriptionTarget) {
            if (message) {
                descriptionTarget.hidden = false;
                descriptionTarget.textContent = message;
            }
            else {
                descriptionTarget.hidden = true;
                descriptionTarget.textContent = "";
            }
        }
    };
    const highlightCards = (cards, selected) => {
        cards.forEach((card) => {
            const isSelected = card.dataset.value === selected;
            if (isSelected) {
                card.dataset.selected = "true";
            }
            else {
                delete card.dataset.selected;
            }
            card.setAttribute("aria-pressed", isSelected.toString());
        });
    };
    const applySelection = () => {
        if (!state.vendor || !state.deviceId) {
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
            }
            else {
                descriptionTarget.hidden = true;
                descriptionTarget.textContent = "";
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
                            path: `bins${state.releaseValue}/Launcher-${device.id}.bin`,
                            offset: 0
                        }
                    ]
                }
            ]
        };
        revokeManifestUrl();
        currentManifestUrl = URL.createObjectURL(new Blob([JSON.stringify(manifest)], { type: "application/json" }));
        installButton.setAttribute("manifest", currentManifestUrl);
        installButton.removeAttribute("hidden");
    };
    const renderDeviceCards = (devices) => {
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
            const card = createSelectionCard({
                title: device.name,
                subtitle: device.description ?? "Manifest generated automatically.",
                value: device.id
            });
            card.classList.add("selection-card--device");
            const wrapper = document.createElement("div");
            wrapper.className = "selection-card-wrapper";
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
        const sortedVendors = Array.from(vendorMap.entries()).sort(([a], [b]) => a.localeCompare(b));
        sortedVendors.forEach(([vendorName, devices]) => {
            const visibleDevices = devices.filter((device) => device.display !== false);
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
        return response.json();
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
