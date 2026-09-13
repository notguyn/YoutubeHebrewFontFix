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

  let settings = { enabled: true, font: "arial" };
  const markedElements = new Set();
  const observedRoots = new WeakSet();

  function hasDirectHebrewText(element) {
    for (const child of element.childNodes) {
      if (child.nodeType === Node.TEXT_NODE && HEBREW_RE.test(child.data)) {
        return true;
      }
    }
    return false;
  }

  function mark(element) {
    if (!(element instanceof HTMLElement) && !(element instanceof SVGElement)) {
      return;
    }

    if (!settings.enabled || !hasDirectHebrewText(element)) {
      unmark(element);
      return;
    }

    if (!element.classList.contains(MARKER_CLASS)) {
      const originalFont = getComputedStyle(element).fontFamily || "sans-serif";
      element.style.setProperty(ORIGINAL_FONT_PROPERTY, originalFont);
      element.classList.add(MARKER_CLASS);
      markedElements.add(element);
    }

    element.style.setProperty(
      FIX_FONT_PROPERTY,
      FONT_FAMILIES[settings.font] || FONT_FAMILIES.arial
    );
  }

  function unmark(element) {
    if (!element?.classList?.contains(MARKER_CLASS)) {
      return;
    }

    element.classList.remove(MARKER_CLASS);
    element.style.removeProperty(ORIGINAL_FONT_PROPERTY);
    element.style.removeProperty(FIX_FONT_PROPERTY);
    markedElements.delete(element);
  }

  function releaseDisconnectedElements() {
    for (const element of [...markedElements]) {
      if (!element.isConnected) {
        unmark(element);
      }
    }
  }

  function scan(root) {
    if (root.nodeType === Node.TEXT_NODE) {
      mark(root.parentElement);
      return;
    }

    if (!(root instanceof Element) && !(root instanceof DocumentFragment)) {
      return;
    }

    if (root instanceof Element) {
      mark(root);
      if (root.shadowRoot) {
        observeRoot(root.shadowRoot);
      }
    }

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (node.nodeType === Node.TEXT_NODE) {
        if (HEBREW_RE.test(node.data)) {
          mark(node.parentElement);
        }
      } else if (node.shadowRoot) {
        observeRoot(node.shadowRoot);
      }
    }
  }

  function addStyleToShadowRoot(root) {
    if (root.querySelector("style[data-ythff]")) {
      return;
    }

    const style = document.createElement("style");
    style.dataset.ythff = "";
    style.textContent = `
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
      .${MARKER_CLASS} {
        font-family: var(${FIX_FONT_PROPERTY}), var(${ORIGINAL_FONT_PROPERTY}) !important;
      }
    `;
    root.prepend(style);
  }

  function observeRoot(root) {
    if (observedRoots.has(root)) {
      return;
    }
    observedRoots.add(root);

    if (root instanceof ShadowRoot) {
      addStyleToShadowRoot(root);
    }

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData") {
          mark(mutation.target.parentElement);
          continue;
        }

        mark(mutation.target);
        for (const node of mutation.addedNodes) {
          scan(node);
        }
      }

      // YouTube frequently replaces whole result lists during navigation.
      // Do not retain references to elements that the page has discarded.
      releaseDisconnectedElements();
    });

    observer.observe(root, {
      childList: true,
      characterData: true,
      subtree: true
    });
    scan(root);
  }

  function applySettings(nextSettings) {
    settings = { ...settings, ...nextSettings };

    if (!settings.enabled) {
      for (const element of [...markedElements]) {
        unmark(element);
      }
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

  chrome.storage.sync.get({ enabled: true, font: "arial" }, applySettings);

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "sync") {
      return;
    }

    const nextSettings = {};
    if (changes.enabled) nextSettings.enabled = changes.enabled.newValue;
    if (changes.font) nextSettings.font = changes.font.newValue;
    applySettings(nextSettings);
  });

  if (document.documentElement) {
    observeRoot(document);
  } else {
    document.addEventListener("readystatechange", () => observeRoot(document), { once: true });
  }
})();
