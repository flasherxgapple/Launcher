document.addEventListener("DOMContentLoaded", () => {
  const manifestRadios = Array.from(
    document.querySelectorAll<HTMLInputElement>("[data-manifest-option]")
  );
  const channelRadios = Array.from(
    document.querySelectorAll<HTMLInputElement>("[data-release-channel]")
  );
  const installButton = document.querySelector<HTMLElement>("esp-web-install-button");
  const manifestSummary = document.querySelector<HTMLElement>("[data-manifest-summary]");

  if (
    !installButton ||
    manifestRadios.length === 0 ||
    channelRadios.length === 0 ||
    !manifestSummary
  ) {
    return;
  }

  let currentChannel =
    channelRadios.find((radio) => radio.checked)?.value ?? channelRadios[0]?.value;

  const applyManifest = (radio: HTMLInputElement) => {
    const manifestBase = radio.dataset.manifestBase;
    if (!manifestBase || !currentChannel) {
      return;
    }
    const manifestPath = `${currentChannel}/${manifestBase}`;
    installButton.setAttribute("manifest", manifestPath);
    if (radio.dataset.overrides) {
      const overridesPath = `${currentChannel}/${radio.dataset.overrides}`;
      installButton.setAttribute("overrides", overridesPath);
    } else {
      installButton.removeAttribute("overrides");
    }
    const channelLabel =
      channelRadios.find((radio) => radio.value === currentChannel)?.dataset.label ?? currentChannel;
    const deviceLabel = radio.dataset.label ?? radio.value;
    manifestSummary.textContent = `${channelLabel} • ${deviceLabel}`;
  };

  channelRadios.forEach((radio) => {
    radio.addEventListener("change", () => {
      if (!radio.checked) {
        return;
      }
      currentChannel = radio.value;
      const checkedDevice = manifestRadios.find((option) => option.checked) ?? manifestRadios[0];
      if (checkedDevice) {
        applyManifest(checkedDevice);
      }
    });
  });

  manifestRadios.forEach((radio) => {
    radio.addEventListener("change", () => {
      if (radio.checked) {
        applyManifest(radio);
      }
    });
  });

  const initiallyCheckedChannel = channelRadios.find((radio) => radio.checked) ?? channelRadios[0];
  const initiallyCheckedDevice = manifestRadios.find((radio) => radio.checked) ?? manifestRadios[0];
  if (initiallyCheckedChannel) {
    currentChannel = initiallyCheckedChannel.value;
  }
  if (initiallyCheckedDevice) {
    applyManifest(initiallyCheckedDevice);
  }
});
