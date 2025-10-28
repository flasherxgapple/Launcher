"use strict";
const ready = (callback) => {
    if (document.readyState === "complete" || document.readyState === "interactive") {
        callback();
    }
    else {
        document.addEventListener("DOMContentLoaded", callback, { once: true });
    }
};
ready(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const yearTarget = document.querySelector("[data-year]");
    if (yearTarget) {
        yearTarget.textContent = new Date().getFullYear().toString();
    }
    const navToggle = document.querySelector("[data-nav-toggle]");
    const navPanel = document.querySelector("[data-nav]");
    if (navToggle && navPanel) {
        const toggleNav = () => {
            const isOpen = navPanel.classList.toggle("is-open");
            navToggle.setAttribute("aria-expanded", isOpen.toString());
            if (isOpen) {
                navPanel.focus();
            }
        };
        navToggle.addEventListener("click", toggleNav);
        navPanel.addEventListener("keydown", (event) => {
            if (event.key === "Escape") {
                navPanel.classList.remove("is-open");
                navToggle.setAttribute("aria-expanded", "false");
                navToggle.focus();
            }
        });
    }
    const navLinks = Array.from(document.querySelectorAll("[data-scroll]"));
    if (navLinks.length > 0) {
        navLinks.forEach((link) => {
            link.addEventListener("click", (event) => {
                const targetId = link.getAttribute("href");
                if (targetId && targetId.startsWith("#")) {
                    const section = document.querySelector(targetId);
                    if (section) {
                        event.preventDefault();
                        if (navPanel) {
                            navPanel.classList.remove("is-open");
                            navToggle?.setAttribute("aria-expanded", "false");
                        }
                        section.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth" });
                        section.focus({ preventScroll: true });
                    }
                }
            });
        });
    }
    const revealElements = Array.from(document.querySelectorAll(".reveal-on-scroll"));
    if (revealElements.length > 0 && "IntersectionObserver" in window) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("is-visible");
                }
            });
        }, { threshold: 0.1 });
        revealElements.forEach((element) => observer.observe(element));
    }
    else {
        revealElements.forEach((element) => element.classList.add("is-visible"));
    }
    const filterInput = document.querySelector("[data-filter-input]");
    const firmwareItems = Array.from(document.querySelectorAll("[data-filter-item]"));
    const emptyState = document.querySelector("[data-filter-empty]");
    if (filterInput && firmwareItems.length > 0) {
        const normalize = (value) => value.trim().toLowerCase();
        const applyFilter = () => {
            const term = normalize(filterInput.value);
            let visibleCount = 0;
            firmwareItems.forEach((item) => {
                const haystack = normalize(item.dataset.filterValue ?? item.textContent ?? "");
                const matches = haystack.includes(term);
                item.toggleAttribute("hidden", !matches);
                if (matches) {
                    visibleCount += 1;
                }
            });
            if (emptyState) {
                emptyState.toggleAttribute("hidden", visibleCount !== 0);
            }
        };
        filterInput.addEventListener("input", applyFilter);
        applyFilter();
    }
});
