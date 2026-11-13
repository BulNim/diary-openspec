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

// ---------- 화면 ----------

const els = {};

function renderToday() {
  els.today.textContent = formatDate(new Date());
}

function renderList() {
  const entries = loadEntries().sort((a, b) => b.createdAt - a.createdAt);

  els.list.replaceChildren(
    ...entries.map((entry) => {
      const li = document.createElement("li");
      li.className = "flex h-12 items-center gap-3 px-4";

      const stamp = document.createElement("span");
      stamp.className = "shrink-0 font-mono text-sm text-stone-400";
      stamp.textContent = `${entry.date} ${entry.time}`;

      const text = document.createElement("span");
      text.className = "min-w-0 flex-1 truncate";
      text.textContent = entry.text;
      text.title = entry.text;

      li.append(stamp, text);
      return li;
    })
  );

  const isEmpty = entries.length === 0;
  els.list.classList.toggle("hidden", isEmpty);
  els.empty.classList.toggle("hidden", !isEmpty);
}

function showWarning(message) {
  els.warning.textContent = message;
  els.warning.classList.remove("hidden");
}

function hideWarning() {
  els.warning.textContent = "";
  els.warning.classList.add("hidden");
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
