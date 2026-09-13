const enabledInput = document.querySelector("#enabled");
const fontSelect = document.querySelector("#font");
const status = document.querySelector("#status");
let statusTimer;

function showSaved() {
  status.textContent = "Saved — refresh YouTube if needed";
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => {
    status.textContent = "";
  }, 1800);
}

chrome.storage.sync.get({ enabled: true, font: "arial" }, (settings) => {
  enabledInput.checked = settings.enabled;
  fontSelect.value = settings.font;
  fontSelect.disabled = !settings.enabled;
});

enabledInput.addEventListener("change", () => {
  fontSelect.disabled = !enabledInput.checked;
  chrome.storage.sync.set({ enabled: enabledInput.checked }, showSaved);
});

fontSelect.addEventListener("change", () => {
  chrome.storage.sync.set({ font: fontSelect.value }, showSaved);
});
