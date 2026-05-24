const SCHEME_STORAGE_KEY = "custom1-forced-scheme";
const TOGGLE_BUTTON_ID = "custom1-scheme-toggle";
const HTML_LIGHT_CLASS = "custom1-force-light";
const HTML_DARK_CLASS = "custom1-force-dark";
const COLOR_FUNCTION_PATTERN =
  /(?:rgb|hsl|hwb|lab|lch|oklab|oklch)a?\([^)]*\)|color\([^)]*\)/i;
const HEX_COLOR_PATTERN = /#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})\b/i;
const EMOJI_PATTERN =
  /(?:\p{Regional_Indicator}{2}|[#*0-9]\uFE0F?\u20E3|\p{Extended_Pictographic}(?:\p{Emoji_Modifier})?(?:\uFE0F|\uFE0E)?(?:\u200D\p{Extended_Pictographic}(?:\p{Emoji_Modifier})?(?:\uFE0F|\uFE0E)?)*)/gu;
const EMOJI_FIX_CLASS = "spicetify-emoji-hue-fix";

if (document.readyState === "complete") {
  initOnFirstLoad();
} else {
  window.addEventListener("load", initOnFirstLoad, { once: false });
}

const bgObserver = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    if (mutation.type === "childList") {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          markElementIfNeeded(node);
          node.querySelectorAll("*").forEach((el) => {
            markElementIfNeeded(el);
          });
          wrapEmojisInNode(node);
        }

        if (node.nodeType === Node.TEXT_NODE) {
          wrapEmojiTextNode(node);
        }
      });
    } else if (
      mutation.type === "attributes" &&
      (mutation.attributeName === "class" || mutation.attributeName === "style")
    ) {
      markElementIfNeeded(mutation.target);
    } else if (mutation.type === "characterData") {
      wrapEmojiTextNode(mutation.target);
    }
  }
});

function initOnFirstLoad() {
  markBgElements();
  wrapEmojisInNode(document.body);
  initSchemeToggle();
  bgObserver.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    characterData: true,
    attributeFilter: ["class", "style"],
  });
}

function wrapEmojisInNode(rootNode) {
  if (!(rootNode instanceof Node)) {
    return;
  }

  if (rootNode.nodeType === Node.TEXT_NODE) {
    wrapEmojiTextNode(rootNode);
    return;
  }

  if (rootNode.nodeType !== Node.ELEMENT_NODE) {
    return;
  }

  const walker = document.createTreeWalker(rootNode, NodeFilter.SHOW_TEXT);
  const textNodes = [];

  while (walker.nextNode()) {
    textNodes.push(walker.currentNode);
  }

  textNodes.forEach((textNode) => {
    wrapEmojiTextNode(textNode);
  });
}

function wrapEmojiTextNode(textNode) {
  if (!(textNode instanceof Text) || !textNode.parentElement) {
    return;
  }

  if (shouldSkipEmojiWrapping(textNode.parentElement)) {
    return;
  }

  const text = textNode.nodeValue;
  EMOJI_PATTERN.lastIndex = 0;
  if (!text || !EMOJI_PATTERN.test(text)) {
    return;
  }

  EMOJI_PATTERN.lastIndex = 0;
  const fragment = document.createDocumentFragment();
  let cursor = 0;

  for (const match of text.matchAll(EMOJI_PATTERN)) {
    const matchIndex = match.index ?? 0;
    if (matchIndex > cursor) {
      fragment.appendChild(
        document.createTextNode(text.slice(cursor, matchIndex)),
      );
    }

    const emojiSpan = document.createElement("span");
    emojiSpan.className = EMOJI_FIX_CLASS;
    emojiSpan.textContent = match[0];
    fragment.appendChild(emojiSpan);

    cursor = matchIndex + match[0].length;
  }

  if (cursor < text.length) {
    fragment.appendChild(document.createTextNode(text.slice(cursor)));
  }

  textNode.replaceWith(fragment);
}

function shouldSkipEmojiWrapping(parentElement) {
  if (parentElement.closest(`.${EMOJI_FIX_CLASS}`)) {
    return true;
  }

  const tagName = parentElement.tagName;
  return (
    tagName === "SCRIPT" ||
    tagName === "STYLE" ||
    tagName === "NOSCRIPT" ||
    tagName === "TEXTAREA" ||
    tagName === "INPUT"
  );
}

function markBgElements() {
  document.querySelectorAll("*").forEach((el) => {
    markElementIfNeeded(el);
  });
}

function markElementIfNeeded(el) {
  if (!(el instanceof Element)) {
    return;
  }

  const shouldHaveBgFix = hasBackgroundImageUrl(el);
  const shouldHaveHueFix =
    !shouldHaveBgFix &&
    (hasBackgroundGradient(el) || hasInlineColorOverride(el));

  el.classList.toggle("spicetify-bg-fix", shouldHaveBgFix);
  el.classList.toggle("spicetify-hue-fix", shouldHaveHueFix);
}

function hasBackgroundImageUrl(el) {
  const style = window.getComputedStyle(el);

  return (
    style.backgroundImage &&
    style.backgroundImage !== "none" &&
    style.backgroundImage.includes("url(") &&
    !style.backgroundImage.includes('url("data:image/svg+xml')
  );
}

function hasBackgroundGradient(el) {
  const style = window.getComputedStyle(el);

  return (
    style.backgroundImage &&
    style.backgroundImage !== "none" &&
    !style.backgroundImage.includes("url(")
  );
}

function hasInlineColorOverride(el) {
  if (
    !el.hasAttribute("style") ||
    el.querySelector("img, picture, svg[role='img']")
  ) {
    return false;
  }

  return Array.from(el.style).some((propertyName) => {
    const value = el.style.getPropertyValue(propertyName).trim();

    return HEX_COLOR_PATTERN.test(value) || COLOR_FUNCTION_PATTERN.test(value);
  });
}

function initSchemeToggle() {
  applySchemeOverride(getSavedScheme());
  addToggleButton();
}

function getSavedScheme() {
  const saved = localStorage.getItem(SCHEME_STORAGE_KEY);
  if (saved === "light" || saved === "dark") {
    return saved;
  }
  return null;
}

function applySchemeOverride(scheme) {
  const root = document.documentElement;
  root.classList.remove(HTML_LIGHT_CLASS, HTML_DARK_CLASS);

  if (scheme === "light" || scheme === "dark") {
    root.classList.add(scheme === "light" ? HTML_LIGHT_CLASS : HTML_DARK_CLASS);
  }
}

function getActiveScheme() {
  const root = document.documentElement;
  if (root.classList.contains(HTML_LIGHT_CLASS)) {
    return "light";
  }
  if (root.classList.contains(HTML_DARK_CLASS)) {
    return "dark";
  }
  return getSavedScheme() || "dark";
}

function toggleScheme() {
  console.info("Toggling theme scheme");
  const current = getActiveScheme();

  const next = current === "light" ? "dark" : "light";
  localStorage.setItem(SCHEME_STORAGE_KEY, next);
  applySchemeOverride(next);
  updateToggleButtonLabel(next);
}

function addToggleButton() {
  console.info("Adding theme toggle button to UI");
  const container = document.querySelector(
    ".main-topBar-topbarContentRight>.main-actionButtons",
  );
  if (!container) {
    console.warn("Could not find container for theme toggle button");
    setTimeout(addToggleButton, 1000);
    return;
  }

  if (document.getElementById(TOGGLE_BUTTON_ID)) {
    console.info("Toggle button already exists, skipping creation");
    updateToggleButtonLabel(getActiveScheme());
    return;
  }

  const button = document.createElement("button");
  button.id = TOGGLE_BUTTON_ID;
  button.type = "button";
  button.className = "dark-light-toggle";
  button.addEventListener("click", toggleScheme);

  container.insertBefore(button, container.firstChild);
  updateToggleButtonLabel(getActiveScheme());
}

function updateToggleButtonLabel(activeScheme) {
  const button = document.getElementById(TOGGLE_BUTTON_ID);
  if (!button) {
    return;
  }

  button.textContent = activeScheme === "light" ? "☾" : "☼";
}
