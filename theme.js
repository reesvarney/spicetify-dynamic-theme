const SCHEME_STORAGE_KEY = "custom1-forced-scheme";
const TOGGLE_BUTTON_ID = "custom1-scheme-toggle";
const HTML_LIGHT_CLASS = "custom1-force-light";
const HTML_DARK_CLASS = "custom1-force-dark";

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
          if (hasBackgroundImage(node)) {
            node.classList.add("spicetify-bg-fix");
          }
          node.querySelectorAll("*").forEach((el) => {
            if (hasBackgroundImage(el)) {
              el.classList.add("spicetify-bg-fix");
            }
          });
        }
      });
    }
  }
});

function initOnFirstLoad() {
  markBgElements();
  initSchemeToggle();
  bgObserver.observe(document.body, { childList: true, subtree: true });
}

function markBgElements() {
  document.querySelectorAll("*").forEach((el) => {
    if (hasBackgroundImage(el)) {
      el.classList.add("spicetify-bg-fix");
    }
  });
}

function hasBackgroundImage(el) {
  const style = window.getComputedStyle(el);

  return (
    style.backgroundImage &&
    style.backgroundImage !== "none" &&
    style.backgroundImage.includes("url(") &&
    !style.backgroundImage.includes('url("data:image/svg+xml')
  );
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
