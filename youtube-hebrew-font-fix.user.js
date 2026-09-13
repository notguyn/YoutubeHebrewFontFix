// ==UserScript==
// @name         YouTube Hebrew Font Fix
// @namespace    https://github.com/notguyn/YoutubeHebrewFontFix
// @version      1.0.0
// @description  Restores YouTube's Hebrew text to Arial or Tahoma without changing other text.
// @author       notguyn
// @license      GPL-3.0-only
// @match        https://www.youtube.com/*
// @match        https://m.youtube.com/*
// @run-at       document-start
// @downloadURL  https://raw.githubusercontent.com/notguyn/YoutubeHebrewFontFix/main/youtube-hebrew-font-fix.user.js
// @updateURL    https://raw.githubusercontent.com/notguyn/YoutubeHebrewFontFix/main/youtube-hebrew-font-fix.user.js
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        GM.getValue
// @grant        GM.setValue
// @grant        GM.registerMenuCommand
// ==/UserScript==

(() => {
  "use strict";

  const HEBREW_RE = /[\u0590-\u05ff\ufb1d-\ufb4f]/u;
  const MARKER_CLASS = "ythff-hebrew";
  const ORIGINAL_FONT_PROPERTY = "--ythff-original-font";
  const FIX_FONT_PROPERTY = "--ythff-font";
  const FONT_FAMILIES = {
    arial: '"YTHFF Arial"',
    tahoma: '"YTHFF Tahoma"'
  };
  const STYLE = `
    @font-face {
      font-family: "YTHFF Arial";
      src: local("Arial");
      font-style: normal;
      font-weight: 100 599;
      unicode-range: U+0590-05FF, U+FB1D-FB4F;
    }
    @font-face {
      font-family: "YTHFF Arial";
      src: local("Arial Bold"), local("Arial");
      font-style: normal;
      font-weight: 600 900;
      unicode-range: U+0590-05FF, U+FB1D-FB4F;
    }
    @font-face {
      font-family: "YTHFF Arial";
      src: local("Arial Italic"), local("Arial");
      font-style: italic;
      font-weight: 100 599;
      unicode-range: U+0590-05FF, U+FB1D-FB4F;
    }
    @font-face {
      font-family: "YTHFF Arial";
      src: local("Arial Bold Italic"), local("Arial Bold"), local("Arial");
      font-style: italic;
      font-weight: 600 900;
      unicode-range: U+0590-05FF, U+FB1D-FB4F;
    }
    @font-face {
      font-family: "YTHFF Tahoma";
      src: local("Tahoma");
      font-style: normal;
      font-weight: 100 599;
      unicode-range: U+0590-05FF, U+FB1D-FB4F;
    }
    @font-face {
      font-family: "YTHFF Tahoma";
      src: local("Tahoma Bold"), local("Tahoma");
      font-style: normal;
      font-weight: 600 900;
      unicode-range: U+0590-05FF, U+FB1D-FB4F;
    }
    @font-face {
      font-family: "YTHFF Tahoma";
      src: local("Tahoma");
      font-style: italic;
      font-weight: 100 599;
      unicode-range: U+0590-05FF, U+FB1D-FB4F;
    }
    @font-face {
      font-family: "YTHFF Tahoma";
      src: local("Tahoma Bold"), local("Tahoma");
      font-style: italic;
      font-weight: 600 900;
      unicode-range: U+0590-05FF, U+FB1D-FB4F;
    }
    .${MARKER_CLASS} {
      font-family: var(${FIX_FONT_PROPERTY}), var(${ORIGINAL_FONT_PROPERTY}) !important;
    }
  `;

  let settings = { enabled: true, font: "arial" };
  const markedElements = new Set();
  const observedRoots = new WeakSet();

  function getValue(key, fallback) {
    if (typeof GM_getValue === "function") return GM_getValue(key, fallback);
    if (typeof GM !== "undefined" && typeof GM.getValue === "function") {
      return GM.getValue(key, fallback);
    }
    return fallback;
  }

  function setValue(key, value) {
    if (typeof GM_setValue === "function") return GM_setValue(key, value);
    if (typeof GM !== "undefined" && typeof GM.setValue === "function") {
      return GM.setValue(key, value);
    }
  }

  function registerMenuCommand(label, callback) {
    if (typeof GM_registerMenuCommand === "function") {
      GM_registerMenuCommand(label, callback);
    } else if (typeof GM !== "undefined" && typeof GM.registerMenuCommand === "function") {
      GM.registerMenuCommand(label, callback);
    }
  }

  function hasDirectHebrewText(element) {
    for (const child of element.childNodes) {
      if (child.nodeType === Node.TEXT_NODE && HEBREW_RE.test(child.data)) return true;
    }
    return false;
  }

  function mark(element) {
    if (!(element instanceof HTMLElement) && !(element instanceof SVGElement)) return;

    if (!settings.enabled || !hasDirectHebrewText(element)) {
      unmark(element);
      return;
    }

    if (!element.classList.contains(MARKER_CLASS)) {
      element.style.setProperty(
        ORIGINAL_FONT_PROPERTY,
        getComputedStyle(element).fontFamily || "sans-serif"
      );
      element.classList.add(MARKER_CLASS);
      markedElements.add(element);
    }

    element.style.setProperty(
      FIX_FONT_PROPERTY,
      FONT_FAMILIES[settings.font] || FONT_FAMILIES.arial
    );
  }

  function unmark(element) {
    if (!element?.classList?.contains(MARKER_CLASS)) return;
    element.classList.remove(MARKER_CLASS);
    element.style.removeProperty(ORIGINAL_FONT_PROPERTY);
    element.style.removeProperty(FIX_FONT_PROPERTY);
    markedElements.delete(element);
  }

  function releaseDisconnectedElements() {
    for (const element of [...markedElements]) {
      if (!element.isConnected) unmark(element);
    }
  }

  function addStyleToRoot(root) {
    if (root.querySelector("style[data-ythff]")) return true;

    const target = root instanceof Document
      ? root.head || root.documentElement
      : root;
    if (!target) return false;

    const style = document.createElement("style");
    style.dataset.ythff = "";
    style.textContent = STYLE;
    target.prepend(style);
    return true;
  }

  function scan(root) {
    if (root.nodeType === Node.TEXT_NODE) {
      mark(root.parentElement);
      return;
    }

    if (!(root instanceof Element) && !(root instanceof DocumentFragment)) return;

    if (root instanceof Element) {
      mark(root);
      if (root.shadowRoot) observeRoot(root.shadowRoot);
    }

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (node.nodeType === Node.TEXT_NODE) {
        if (HEBREW_RE.test(node.data)) mark(node.parentElement);
      } else if (node.shadowRoot) {
        observeRoot(node.shadowRoot);
      }
    }
  }

  function observeRoot(root) {
    if (observedRoots.has(root)) return;
    observedRoots.add(root);
    addStyleToRoot(root);

    const observer = new MutationObserver((mutations) => {
      addStyleToRoot(root);
      for (const mutation of mutations) {
        if (mutation.type === "characterData") {
          mark(mutation.target.parentElement);
          continue;
        }

        mark(mutation.target);
        for (const node of mutation.addedNodes) scan(node);
      }
      releaseDisconnectedElements();
    });

    observer.observe(root, { childList: true, characterData: true, subtree: true });
    scan(root);
  }

  function applySettings(nextSettings) {
    settings = { ...settings, ...nextSettings };

    if (!settings.enabled) {
      for (const element of [...markedElements]) unmark(element);
      return;
    }

    for (const element of markedElements) {
      element.style.setProperty(
        FIX_FONT_PROPERTY,
        FONT_FAMILIES[settings.font] || FONT_FAMILIES.arial
      );
    }
    scan(document.documentElement || document);
  }

  registerMenuCommand("Toggle Hebrew font fix", () => {
    const enabled = !settings.enabled;
    setValue("enabled", enabled);
    applySettings({ enabled });
  });
  registerMenuCommand("Use Arial for Hebrew", () => {
    setValue("font", "arial");
    applySettings({ font: "arial" });
  });
  registerMenuCommand("Use Tahoma for Hebrew", () => {
    setValue("font", "tahoma");
    applySettings({ font: "tahoma" });
  });

  Promise.all([
    Promise.resolve(getValue("enabled", true)),
    Promise.resolve(getValue("font", "arial"))
  ]).then(([enabled, font]) => {
    applySettings({ enabled: Boolean(enabled), font });
    observeRoot(document);
  });
})();
