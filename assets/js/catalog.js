"use strict";
const API_URL = "https://m5burner-api.m5stack.com/api/firmware";
const CDN_COVER = "https://m5burner-cdn.m5stack.com/cover/";
const CDN_FIRMWARE = "https://m5burner-cdn.m5stack.com/firmware/";
const SAMPLE_CARDPUTER_COVER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='200'%3E%3Crect width='320' height='200' fill='%2300dd00'/%3E%3Ctext x='160' y='110' font-family='Inter,Arial,sans-serif' font-size='32' fill='%2301110b' text-anchor='middle'%3ECardputer%3C/text%3E%3C/svg%3E";
const SAMPLE_TDISPLAY_COVER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='200'%3E%3Crect width='320' height='200' fill='%23202124'/%3E%3Crect x='48' y='40' width='224' height='120' rx='16' fill='%2300dd00' opacity='0.9'/%3E%3Ctext x='160' y='112' font-family='Inter,Arial,sans-serif' font-size='28' fill='%2301110b' text-anchor='middle'%3ET-Display%3C/text%3E%3C/svg%3E";
const SAMPLE_FIRMWARE = [
    {
        name: "Launcher Cardputer",
        author: "Launcher Team",
        category: "cardputer",
        description: "Curated Launcher experience tailored for the M5Stack Cardputer with quick navigation presets.",
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
        description: "Optimized visuals for compact screens plus Wi-Fi provisioning shortcuts for workshops.",
        cover: SAMPLE_TDISPLAY_COVER,
        download: 980,
        versions: [
            { version: "v1.1.0", file: "tdisplay_v1_1.bin", published: true }
        ]
    }
];
document.addEventListener("DOMContentLoaded", () => {
    const list = document.querySelector("[data-catalog-list]");
    const emptyState = document.querySelector("[data-catalog-empty]");
    const searchInput = document.querySelector("[data-catalog-search]");
    const categorySelect = document.querySelector("[data-catalog-category]");
    const counter = document.querySelector("[data-catalog-count]");
    const status = document.querySelector("[data-catalog-status]");
    if (!list || !emptyState || !searchInput || !categorySelect || !counter || !status) {
        return;
    }
    const offlineMode = new URLSearchParams(window.location.search).has("offline");
    let firmware = [];
    let filtered = [];
    const renderCounter = () => {
        counter.textContent = `${filtered.length} firmware ${filtered.length === 1 ? "entry" : "entries"}`;
    };
    const buildCard = (entry) => {
        const article = document.createElement("article");
        article.className = "card reveal-on-scroll";
        article.dataset.filterValue = [entry.name, entry.author, entry.category, entry.description].join(" ");
        article.setAttribute("data-filter-item", "");
        const header = document.createElement("div");
        header.style.display = "flex";
        header.style.flexDirection = "row";
        header.style.gap = "18px";
        header.style.flexWrap = "wrap";
        const figure = document.createElement("figure");
        figure.style.margin = "0";
        figure.style.flex = "0 0 180px";
        figure.style.maxWidth = "220px";
        const image = document.createElement("img");
        const isDataUrl = entry.cover.startsWith("data:");
        const isAbsolute = /^(https?:|\/)/.test(entry.cover);
        const imageSource = isDataUrl || isAbsolute || entry.cover.startsWith("./")
            ? entry.cover
            : `${CDN_COVER}${entry.cover}`;
        image.src = imageSource;
        image.alt = `${entry.name} cover`;
        image.loading = "lazy";
        image.style.width = "100%";
        image.style.borderRadius = "12px";
        image.style.border = "1px solid rgba(0, 221, 0, 0.2)";
        figure.append(image);
        const body = document.createElement("div");
        body.style.display = "grid";
        body.style.gap = "12px";
        body.style.flex = "1 1 320px";
        const title = document.createElement("h3");
        title.className = "card__title";
        title.textContent = entry.name;
        const meta = document.createElement("p");
        meta.className = "card__description";
        meta.innerHTML = `<strong>Author:</strong> ${entry.author || "Unknown"} · <strong>Category:</strong> ${entry.category} · <strong>Downloads:</strong> ${entry.download}`;
        const description = document.createElement("p");
        description.className = "card__description";
        description.textContent = entry.description;
        const controls = document.createElement("div");
        controls.className = "card__actions";
        const select = document.createElement("select");
        select.className = "catalog__search";
        select.style.background = "rgba(0, 221, 0, 0.12)";
        select.style.borderRadius = "12px";
        select.style.fontSize = "0.95rem";
        select.style.border = "1px solid rgba(0, 221, 0, 0.25)";
        select.style.color = "var(--text, #f5f8f2)";
        entry.versions.forEach((version, index) => {
            if (!version.file) {
                return;
            }
            const option = document.createElement("option");
            option.value = `${CDN_FIRMWARE}${version.file}`;
            option.textContent = version.version || `Build ${index + 1}`;
            option.dataset.published = String(version.published ?? false);
            select.append(option);
        });
        if (!select.options.length) {
            const option = document.createElement("option");
            option.value = "";
            option.textContent = "No downloads available";
            select.append(option);
        }
        const downloadButton = document.createElement("a");
        downloadButton.className = "button button--ghost";
        downloadButton.textContent = "Download selected build";
        downloadButton.target = "_blank";
        downloadButton.rel = "noopener";
        downloadButton.href = select.value || "#";
        downloadButton.toggleAttribute("aria-disabled", select.value.length === 0);
        select.addEventListener("change", () => {
            downloadButton.href = select.value || "#";
            downloadButton.toggleAttribute("aria-disabled", select.value.length === 0);
        });
        controls.append(select, downloadButton);
        body.append(title, meta, description, controls);
        header.append(figure, body);
        article.append(header);
        return article;
    };
    const renderList = () => {
        list.innerHTML = "";
        filtered.forEach((entry) => {
            list.append(buildCard(entry));
        });
        emptyState.toggleAttribute("hidden", filtered.length !== 0);
        renderCounter();
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
        renderList();
    };
    const populateCategories = () => {
        const categories = new Set(["all"]);
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
    const fetchData = async () => {
        try {
            status.textContent = "Loading firmware list…";
            const response = await fetch(API_URL);
            if (!response.ok) {
                throw new Error(`Request failed with status ${response.status}`);
            }
            const payload = (await response.json());
            firmware = payload.filter((item) => Array.isArray(item.versions) && item.versions.length > 0);
            filtered = [...firmware];
            populateCategories();
            applyFilters();
            status.textContent = "";
        }
        catch (error) {
            console.error(error);
            status.textContent = "Unable to load firmware data right now. Please try again later.";
            list.innerHTML = "";
            emptyState.removeAttribute("hidden");
            emptyState.textContent = "No firmware data available.";
            counter.textContent = "0 firmware entries";
        }
    };
    searchInput.addEventListener("input", () => {
        applyFilters();
    });
    categorySelect.addEventListener("change", () => {
        applyFilters();
    });
    if (offlineMode) {
        firmware = SAMPLE_FIRMWARE;
        filtered = [...firmware];
        populateCategories();
        applyFilters();
        status.textContent = "Offline preview mode active. Live data not requested.";
        return;
    }
    fetchData();
});
