"use strict";

const STORAGE_KEY = "one-line-diary.entries";
const EMPTY_WARNING = "내용을 입력해 주세요.";
const SAVE_FAILED_WARNING = "저장하지 못했습니다. 브라우저 저장소를 사용할 수 있는지 확인해 주세요.";

// ---------- 날짜·시각 포맷 (기기 현지 시간) ----------

function pad2(n) {
  return String(n).padStart(2, "0");
}

function formatDate(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function formatTime(d) {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

// ---------- 저장소 ----------

function isEntry(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    typeof value.id === "string" &&
    typeof value.date === "string" &&
    typeof value.time === "string" &&
    typeof value.text === "string" &&
    typeof value.createdAt === "number"
  );
}

function loadEntries() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isEntry) : [];
  } catch {
    return [];
  }
}

// 성공하면 추가된 기록을, 실패하면 null 을 돌려준다.
function addEntry(text, now = new Date()) {
  const entries = loadEntries();
  const createdAt = now.getTime();

  let id = String(createdAt);
  for (let i = 1; entries.some((e) => e.id === id); i++) {
    id = `${createdAt}-${i}`;
  }

  const entry = { id, date: formatDate(now), time: formatTime(now), text, createdAt };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...entries, entry]));
    return entry;
  } catch {
    return null;
  }
}

// 내용(text)만 바꾼다. date·time·createdAt 은 그대로라 날짜·시각과 목록 순서가 유지된다.
// 성공하면 true, 대상이 없거나 쓰기에 실패하면 false.
function updateEntryText(id, text) {
  const entries = loadEntries();
  const target = entries.find((e) => e.id === id);
  if (!target) return false;

  target.text = text;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    return true;
  } catch {
    return false;
  }
}

// ---------- 화면 ----------

const els = {};

// 수정 중인 기록의 id. null 이면 수정 중이 아니다. 하나뿐이라 한 번에 한 기록만 수정된다.
let editingId = null;

function renderToday() {
  els.today.textContent = formatDate(new Date());
}

function createStamp(entry) {
  const stamp = document.createElement("span");
  stamp.className = "shrink-0 font-mono text-sm text-stone-400";
  stamp.textContent = `${entry.date} ${entry.time}`;
  return stamp;
}

function createSmallButton(label, type, variant) {
  const button = document.createElement("button");
  button.type = type;
  button.textContent = label;
  button.className =
    "shrink-0 rounded-md px-2.5 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300 " +
    (variant === "primary"
      ? "bg-stone-800 text-white hover:bg-stone-700"
      : "border border-stone-300 text-stone-600 hover:bg-stone-100");
  return button;
}

function createViewRow(entry) {
  const li = document.createElement("li");
  li.className = "flex h-12 items-center gap-3 px-4";

  const text = document.createElement("span");
  text.className = "min-w-0 flex-1 truncate";
  text.textContent = entry.text;
  text.title = entry.text;

  const editButton = createSmallButton("수정", "button", "secondary");
  editButton.addEventListener("click", () => startEdit(entry.id));

  li.append(createStamp(entry), text, editButton);
  return li;
}

function createEditRow(entry) {
  const li = document.createElement("li");
  li.className = "px-4";

  const form = document.createElement("form");
  form.className = "flex h-12 items-center gap-3";
  form.noValidate = true;

  const input = document.createElement("input");
  input.type = "text";
  input.autocomplete = "off";
  input.value = entry.text;
  input.setAttribute("aria-label", "기록 수정");
  input.className =
    "min-w-0 flex-1 rounded-md border border-stone-300 px-2 py-1 focus:border-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-300";

  const warning = document.createElement("p");
  warning.id = `edit-warning-${entry.id}`;
  warning.setAttribute("role", "alert");
  warning.className = "hidden pb-2 text-sm text-red-600";
  input.setAttribute("aria-describedby", warning.id);

  const saveButton = createSmallButton("저장", "submit", "primary");
  const cancelButton = createSmallButton("취소", "button", "secondary");

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const text = input.value.trim();
    if (text === "") {
      showRowWarning(warning, EMPTY_WARNING);
      input.focus();
      return;
    }
    if (!updateEntryText(entry.id, text)) {
      showRowWarning(warning, SAVE_FAILED_WARNING);
      return; // 수정 상태와 입력 내용을 유지한다
    }
    finishEdit();
  });
  cancelButton.addEventListener("click", finishEdit);
  input.addEventListener("keydown", (event) => {
    if (event.key === "Escape") finishEdit();
  });
  input.addEventListener("input", () => hideRowWarning(warning));

  form.append(createStamp(entry), input, saveButton, cancelButton);
  li.append(form, warning);
  return li;
}

function renderList() {
  const entries = loadEntries().sort((a, b) => b.createdAt - a.createdAt);

  // 수정 중이던 기록이 사라졌으면 수정 상태를 푼다.
  if (editingId !== null && !entries.some((e) => e.id === editingId)) {
    editingId = null;
  }

  els.list.replaceChildren(
    ...entries.map((entry) => (entry.id === editingId ? createEditRow(entry) : createViewRow(entry)))
  );

  const isEmpty = entries.length === 0;
  els.list.classList.toggle("hidden", isEmpty);
  els.empty.classList.toggle("hidden", !isEmpty);

  if (editingId !== null) {
    const input = els.list.querySelector("form input");
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }
}

function startEdit(id) {
  editingId = id;
  renderList();
}

function finishEdit() {
  editingId = null;
  renderList();
}

function showRowWarning(el, message) {
  el.textContent = message;
  el.classList.remove("hidden");
}

function hideRowWarning(el) {
  el.textContent = "";
  el.classList.add("hidden");
}

function showWarning(message) {
  showRowWarning(els.warning, message);
}

function hideWarning() {
  hideRowWarning(els.warning);
}

// ---------- 이벤트 ----------

function handleSubmit(event) {
  event.preventDefault();
  const text = els.input.value.trim();

  if (text === "") {
    showWarning(EMPTY_WARNING);
    els.input.focus();
    return;
  }

  if (addEntry(text) === null) {
    showWarning(SAVE_FAILED_WARNING);
    return; // 입력 내용은 지우지 않는다
  }

  els.input.value = "";
  hideWarning();
  editingId = null; // 수정 중이던 줄은 저장하지 않고 닫는다
  renderList();
  els.input.focus();
}

function init() {
  els.today = document.getElementById("today");
  els.form = document.getElementById("entry-form");
  els.input = document.getElementById("entry-input");
  els.warning = document.getElementById("entry-warning");
  els.list = document.getElementById("entry-list");
  els.empty = document.getElementById("empty-message");

  els.form.addEventListener("submit", handleSubmit);
  els.input.addEventListener("input", hideWarning);

  renderToday();
  renderList();
}

init();
