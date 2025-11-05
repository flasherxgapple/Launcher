type FirmwareVersion = {
  version: string;
  file: string;
  published_at?: string;
  change_log?: string;
  published?: boolean;
};

type FirmwareEntry = {
  name: string;
  author: string;
  category: string;
  description: string;
  cover: string;
  download: number;
  versions: FirmwareVersion[];
};

const getPublishedTimestamp = (value: string | undefined) => {
  if (!value) {
    return Number.NEGATIVE_INFINITY;
  }
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? Number.NEGATIVE_INFINITY : timestamp;
};

const sortVersionsByPublishedDate = (versions: FirmwareVersion[]) => {
  return [...versions].sort((a, b) => {
    const aTime = getPublishedTimestamp(a.published_at);
    const bTime = getPublishedTimestamp(b.published_at);
    if (aTime !== bTime) {
      return bTime - aTime;
    }
    return 0;
  });
};

const API_URL = "https://api.launcherhub.net/giveMeTheList";
const CDN_COVER = "https://m5burner-cdn.m5stack.com/cover/";
const CDN_FIRMWARE = "https://m5burner-cdn.m5stack.com/firmware/";

const SAMPLE_CARDPUTER_COVER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='200'%3E%3Crect width='320' height='200' fill='%2300dd00'/%3E%3Ctext x='160' y='110' font-family='Inter,Arial,sans-serif' font-size='32' fill='%2301110b' text-anchor='middle'%3ENo Image%3C/text%3E%3C/svg%3E";
const SAMPLE_TDISPLAY_COVER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='200'%3E%3Crect width='320' height='200' fill='%23202124'/%3E%3Crect x='48' y='40' width='224' height='120' rx='16' fill='%2300dd00' opacity='0.9'/%3E%3Ctext x='160' y='112' font-family='Inter,Arial,sans-serif' font-size='28' fill='%2301110b' text-anchor='middle'%3ET-Display%3C/text%3E%3C/svg%3E";

const SAMPLE_FIRMWARE: FirmwareEntry[] = [
  {
    name: "Launcher Cardputer",
    author: "Launcher Team",
    category: "cardputer",
    description:
      "Curated Launcher experience tailored for the M5Stack Cardputer with quick navigation presets.",
    cover: SAMPLE_CARDPUTER_COVER,
    download: 1200,
    versions: [
      { version: "v1.0.0", file: "cardputer_v1.bin", published: true },
      { version: "v0.9.0", file: "cardputer_v0_9.bin", published: true }
    ]
  },
  {
    name: "Launcher LilyGO T-Display",
    author: "Launcher Team",
    category: "tdisplay",
    description:
      "Optimized visuals for compact screens plus Wi-Fi provisioning shortcuts for workshops.",
    cover: SAMPLE_TDISPLAY_COVER,
    download: 980,
    versions: [{ version: "v1.1.0", file: "tdisplay_v1_1.bin", published: true }]
  }
];

const resolveCover = (cover: string | undefined) => {
  const value = cover ?? "";
  if (value.length === 0) {
    return SAMPLE_CARDPUTER_COVER;
  }
  if (value.startsWith("data:") || value.startsWith("./")) {
    return value;
  }
  if (/^(https?:|\/)/.test(value)) {
    return value;
  }
  return `${CDN_COVER}${value}`;
};

const resolveFirmwareUrl = (file: string | undefined) => {
  const value = file ?? "";
  if (value.length === 0) {
    return "";
  }
  if (/^https?:\/\//i.test(value)) {
    return value;
  }
  return `${CDN_FIRMWARE}${value}`;
};

const DESCRIPTION_COLLAPSED_HEIGHT = 160;
const TRANSPARENT_PIXEL =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

const makeDownloadName = (entry: FirmwareEntry, versionLabel: string) => {
  const normalize = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase();

  const parts = [entry.name, entry.author, versionLabel]
    .filter(Boolean)
    .map((part) => normalize(part ?? ""));

  const base = parts.filter((part) => part.length > 0).join("-");
  return `${base || "launcher-firmware"}.bin`;
};

document.addEventListener("DOMContentLoaded", () => {
  const list = document.querySelector<HTMLElement>("[data-catalog-list]");
  const emptyState = document.querySelector<HTMLElement>("[data-catalog-empty]");
  const searchInput = document.querySelector<HTMLInputElement>("[data-catalog-search]");
  const categorySelect = document.querySelector<HTMLSelectElement>("[data-catalog-category]");
  const orderSelect = document.querySelector<HTMLSelectElement>("[data-catalog-order]");
  const counter = document.querySelector<HTMLElement>("[data-catalog-count]");
  const status = document.querySelector<HTMLElement>("[data-catalog-status]");
  let currentOrder: "downloads" | "name" = "downloads";

  if (!list || !emptyState || !searchInput || !categorySelect || !counter || !status) {
    return;
  }
  if (!orderSelect) {
    return;
  }
  currentOrder = orderSelect.value === "name" ? "name" : "downloads";

  const offlineMode = new URLSearchParams(window.location.search).has("offline");

  let firmware: FirmwareEntry[] = [];
  let filtered: FirmwareEntry[] = [];
  const pendingImages = new Set<HTMLImageElement>();
  let imageObserver: IntersectionObserver | null = null;

  const loadImage = (image: HTMLImageElement) => {
    const src = image.dataset.src;
    if (!src) {
      return;
    }
    image.src = src;
    image.removeAttribute("data-src");
    pendingImages.delete(image);
  };

  const ensureImageObserver = () => {
    if (imageObserver || !("IntersectionObserver" in window)) {
      return;
    }
    imageObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const target = entry.target as HTMLImageElement;
            loadImage(target);
            imageObserver?.unobserve(target);
          }
        });
      },
      { rootMargin: "200px 0px" }
    );
  };

  const registerLazyImage = (image: HTMLImageElement, source: string) => {
    image.dataset.src = source;
    image.src = TRANSPARENT_PIXEL;
    pendingImages.add(image);
    if ("IntersectionObserver" in window) {
      ensureImageObserver();
      imageObserver?.observe(image);
    } else {
      loadImage(image);
    }
  };

  const flushPendingImages = () => {
    if (!("IntersectionObserver" in window)) {
      pendingImages.forEach((image) => loadImage(image));
      return;
    }
    pendingImages.forEach((image) => {
      if (imageObserver) {
        imageObserver.observe(image);
      }
    });
  };

  const renderCounter = () => {
    counter.textContent = `${filtered.length} firmware${filtered.length === 1 ? "" : "s"}`;
  };

  const buildCard = (entry: FirmwareEntry) => {
    const article = document.createElement("article");
    article.className = "card reveal-on-scroll";
    article.classList.add("is-visible");
    article.dataset.filterValue = [entry.name, entry.author, entry.category, entry.description]
      .filter(Boolean)
      .join(" ");
    article.setAttribute("data-filter-item", "");
    article.style.display = "grid";
    article.style.gridTemplateColumns = "minmax(180px, 250px) 1fr";
    article.style.alignItems = "center";
    article.style.gap = "24px";

    const figure = document.createElement("figure");
    figure.style.margin = "0";
    figure.style.display = "flex";
    figure.style.alignItems = "center";
    figure.style.justifyContent = "center";
    figure.style.height = "100%";

    const image = document.createElement("img");
    image.decoding = "async";
    image.loading = "lazy";
    image.alt = `${entry.name} cover`;
    image.style.maxWidth = "250px";
    image.style.width = "100%";
    image.style.height = "auto";
    image.style.maxHeight = "260px";
    image.style.objectFit = "contain";
    image.style.borderRadius = "12px";
    image.style.border = "1px solid rgba(0, 221, 0, 0.2)";
    registerLazyImage(image, resolveCover(entry.cover));
    figure.append(image);

    const body = document.createElement("div");
    body.style.display = "flex";
    body.style.flexDirection = "column";
    body.style.gap = "12px";
    body.style.height = "100%";
    body.style.justifyContent = "flex-start";

    const title = document.createElement("h3");
    title.className = "card__title";
    title.textContent = entry.author ? `${entry.name} (${entry.author})` : entry.name;
    title.style.margin = "0";
    title.style.textAlign = "center";

    const descriptionWrapper = document.createElement("div");
    descriptionWrapper.style.position = "relative";
    descriptionWrapper.style.maxHeight = `${DESCRIPTION_COLLAPSED_HEIGHT}px`;
    descriptionWrapper.style.overflow = "hidden";

    const description = document.createElement("p");
    description.className = "card__description";
    description.textContent = entry.description;
    description.style.margin = "0";
    description.style.textAlign = "justify";
    description.style.flex = "1 1 auto";
    description.style.overflowWrap = "anywhere";
    descriptionWrapper.append(description);

    const readMoreButton = document.createElement("button");
    readMoreButton.type = "button";
    readMoreButton.className = "button button--ghost";
    readMoreButton.textContent = "Read more";
    readMoreButton.style.alignSelf = "center";
    readMoreButton.style.display = "none";
    readMoreButton.style.margin = "0 auto";
    readMoreButton.style.marginTop = "4px";

    const controls = document.createElement("div");
    controls.className = "card__actions";
    controls.style.justifyContent = "center";
    controls.style.flexWrap = "wrap";
    controls.style.marginTop = "auto";

    const select = document.createElement("select");
    select.className = "catalog__search";
    select.style.background = "rgba(0, 221, 0, 0.12)";
    select.style.borderRadius = "12px";
    select.style.fontSize = "0.95rem";
    select.style.border = "1px solid rgba(0, 221, 0, 0.25)";
    select.style.color = "var(--text, #f5f8f2)";
    select.style.minWidth = "220px";

    entry.versions.forEach((version, index) => {
      if (!version.file) {
        return;
      }
      const option = document.createElement("option");
      option.value = resolveFirmwareUrl(version.file);
      option.textContent = version.version || `Build ${index + 1}`;
      option.dataset.published = String(version.published ?? false);
      option.dataset.versionLabel = version.version || `build-${index + 1}`;
      select.append(option);
    });

    if (select.options.length === 0) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "No downloads available";
      option.dataset.versionLabel = "unavailable";
      select.append(option);
      select.disabled = true;
    }

    const downloadButton = document.createElement("a");
    downloadButton.className = "button button--ghost";
    downloadButton.textContent = "Download firmware";
    downloadButton.target = "_blank";
    downloadButton.rel = "noopener";
    downloadButton.href = select.value || "#";
    downloadButton.toggleAttribute("aria-disabled", select.value.length === 0);
    const initialVersionLabel =
      select.selectedOptions[0]?.dataset.versionLabel ?? select.options[0]?.dataset.versionLabel ?? "";
    downloadButton.download = makeDownloadName(entry, initialVersionLabel);

    select.addEventListener("change", () => {
      downloadButton.href = select.value || "#";
      downloadButton.toggleAttribute("aria-disabled", select.value.length === 0);
      const versionLabel = select.selectedOptions[0]?.dataset.versionLabel ?? "";
      downloadButton.download = makeDownloadName(entry, versionLabel);
    });

    controls.append(select, downloadButton);

    let expanded = false;
    const updateReadMoreState = () => {
      const needsToggle = description.scrollHeight > DESCRIPTION_COLLAPSED_HEIGHT + 10;
      if (!needsToggle) {
        descriptionWrapper.style.maxHeight = "";
        descriptionWrapper.style.overflow = "visible";
        readMoreButton.style.display = "none";
        expanded = false;
        return;
      }
      readMoreButton.style.display = "";
      if (expanded) {
        descriptionWrapper.style.maxHeight = "";
        descriptionWrapper.style.overflow = "visible";
        readMoreButton.textContent = "Read less";
      } else {
        descriptionWrapper.style.maxHeight = `${DESCRIPTION_COLLAPSED_HEIGHT}px`;
        descriptionWrapper.style.overflow = "hidden";
        readMoreButton.textContent = "Read more";
      }
    };

    readMoreButton.addEventListener("click", () => {
      expanded = !expanded;
      updateReadMoreState();
    });

    setTimeout(updateReadMoreState, 0);

    body.append(title, descriptionWrapper, readMoreButton, controls);
    article.append(figure, body);
    return article;
  };

  const renderList = () => {
    list.innerHTML = "";
    if (imageObserver) {
      imageObserver.disconnect();
    }
    pendingImages.clear();
    filtered.forEach((entry) => {
      list.append(buildCard(entry));
    });
    flushPendingImages();
    emptyState.toggleAttribute("hidden", filtered.length !== 0);
    renderCounter();
  };

  const sortFiltered = () => {
    if (currentOrder === "name") {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
      return;
    }
    filtered.sort((a, b) => (b.download ?? 0) - (a.download ?? 0));
  };

  const applyFilters = () => {
    const term = searchInput.value.trim().toLowerCase();
    const categoryValue = categorySelect.value;

    filtered = firmware.filter((entry) => {
      const matchesCategory = categoryValue === "all" || entry.category === categoryValue;
      const haystack = `${entry.name} ${entry.author} ${entry.category} ${entry.description}`.toLowerCase();
      const matchesTerm = haystack.includes(term);
      return matchesCategory && matchesTerm;
    });

    sortFiltered();
    renderList();
  };

  const populateCategories = () => {
    const categories = new Set<string>(["all"]);
    firmware.forEach((entry) => {
      if (entry.category) {
        categories.add(entry.category);
      }
    });
    categorySelect.innerHTML = "";
    Array.from(categories).forEach((category) => {
      const option = document.createElement("option");
      option.value = category;
      option.textContent = category === "all" ? "All categories" : category;
      categorySelect.append(option);
    });
  };

  const hydrate = (entries: FirmwareEntry[]) => {
    const sortedEntries = entries.map((item) => ({
      ...item,
      versions: sortVersionsByPublishedDate(item.versions ?? [])
    }));

    firmware = sortedEntries.filter(
      (item) => Array.isArray(item.versions) && item.versions.some((version) => Boolean(version.file))
    );
    filtered = [...firmware];
    populateCategories();
    applyFilters();
  };

  const fetchData = async () => {
    try {
      status.textContent = "Loading firmware list...";
      const response = await fetch(API_URL);
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }
      const payload = (await response.json()) as FirmwareEntry[];
      hydrate(payload);
      status.textContent = "";
    } catch (error) {
      console.error(error);
      status.textContent = "Unable to load live firmware data. Showing sample entries.";
      hydrate(SAMPLE_FIRMWARE);
    }
  };

  searchInput.addEventListener("input", () => {
    applyFilters();
  });

  categorySelect.addEventListener("change", () => {
    applyFilters();
  });

  orderSelect.addEventListener("change", () => {
    const value = orderSelect.value === "name" ? "name" : "downloads";
    currentOrder = value;
    sortFiltered();
    renderList();
  });

  if (offlineMode) {
    status.textContent = "Offline preview mode active. Live data not requested.";
    hydrate(SAMPLE_FIRMWARE);
    return;
  }

  fetchData();
});
