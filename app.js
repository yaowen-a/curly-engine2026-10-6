const STORAGE_KEYS = {
  habits: "daily-habits-v1",
  checkins: "daily-habit-checkins-v1",
};

const DEFAULT_HABITS = [
  { name: "喝水", icon: "💧", color: "#3e7790", tint: "#e8f3f7" },
  { name: "运动", icon: "🏃", color: "#e7654e", tint: "#fcebe7" },
  { name: "读书", icon: "📖", color: "#b07a22", tint: "#fbf2dd" },
];

const ICON_RULES = [
  {
    words: ["水", "喝", "饮"],
    icon: "💧",
    color: "#3e7790",
    tint: "#e8f3f7",
  },
  {
    words: ["运动", "跑步", "健身", "散步", "瑜伽", "骑车"],
    icon: "🏃",
    color: "#e7654e",
    tint: "#fcebe7",
  },
  {
    words: ["读书", "阅读", "学习", "背单词", "写作"],
    icon: "📖",
    color: "#b07a22",
    tint: "#fbf2dd",
  },
  {
    words: ["睡", "早起", "起床", "休息"],
    icon: "🌙",
    color: "#6271a8",
    tint: "#eef0fa",
  },
  {
    words: ["吃", "早餐", "水果", "蔬菜", "饮食"],
    icon: "🍎",
    color: "#c65353",
    tint: "#fbeaea",
  },
  {
    words: ["冥想", "呼吸", "放松", "日记"],
    icon: "🌿",
    color: "#2d7158",
    tint: "#e8f2eb",
  },
];

const FALLBACK_STYLES = [
  { icon: "✦", color: "#2d7158", tint: "#e8f2eb" },
  { icon: "◉", color: "#3e7790", tint: "#e8f3f7" },
  { icon: "◆", color: "#e7654e", tint: "#fcebe7" },
  { icon: "●", color: "#b07a22", tint: "#fbf2dd" },
];

const habitForm = document.querySelector("#habitForm");
const habitInput = document.querySelector("#habitInput");
const formMessage = document.querySelector("#formMessage");
const habitList = document.querySelector("#habitList");
const emptyState = document.querySelector("#emptyState");
const habitTemplate = document.querySelector("#habitTemplate");
const todayLabel = document.querySelector("#todayLabel");
const footerDate = document.querySelector("#footerDate");
const completedCount = document.querySelector("#completedCount");
const progressText = document.querySelector("#progressText");
const remainingText = document.querySelector("#remainingText");
const progressRing = document.querySelector("#progressRing");
const heroNote = document.querySelector("#heroNote");
const sectionSummary = document.querySelector("#sectionSummary");
const toast = document.querySelector("#toast");
const toastText = document.querySelector("#toastText");
const undoButton = document.querySelector("#undoButton");

let habits = loadHabits();
let checkins = loadCheckins();
let currentDateKey = getDateKey(new Date());
let deletedHabit = null;
let toastTimer = null;

function createId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function readStorage(key, fallback) {
  try {
    const storedValue = localStorage.getItem(key);
    return storedValue ? JSON.parse(storedValue) : fallback;
  } catch (error) {
    console.warn(`Unable to read ${key}`, error);
    return fallback;
  }
}

function loadHabits() {
  const storedHabits = readStorage(STORAGE_KEYS.habits, null);

  if (Array.isArray(storedHabits)) {
    return storedHabits.filter(
      (habit) => habit && typeof habit.name === "string" && habit.id,
    );
  }

  return DEFAULT_HABITS.map((habit) => ({
    ...habit,
    id: createId(),
  }));
}

function loadCheckins() {
  const storedCheckins = readStorage(STORAGE_KEYS.checkins, {});
  return storedCheckins && typeof storedCheckins === "object"
    ? storedCheckins
    : {};
}

function saveHabits() {
  try {
    localStorage.setItem(STORAGE_KEYS.habits, JSON.stringify(habits));
  } catch (error) {
    console.warn("Unable to save habits", error);
  }
}

function saveCheckins() {
  try {
    localStorage.setItem(STORAGE_KEYS.checkins, JSON.stringify(checkins));
  } catch (error) {
    console.warn("Unable to save check-ins", error);
  }
}

saveHabits();

function getDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getTodayCompletedIds() {
  if (!Array.isArray(checkins[currentDateKey])) {
    checkins[currentDateKey] = [];
  }

  return checkins[currentDateKey];
}

function inferHabitStyle(name) {
  const matchedRule = ICON_RULES.find((rule) =>
    rule.words.some((word) => name.includes(word)),
  );

  if (matchedRule) {
    return {
      icon: matchedRule.icon,
      color: matchedRule.color,
      tint: matchedRule.tint,
    };
  }

  const styleIndex = Array.from(name).reduce(
    (sum, character) => sum + character.codePointAt(0),
    0,
  );

  return FALLBACK_STYLES[styleIndex % FALLBACK_STYLES.length];
}

function refreshDate() {
  const now = new Date();
  const nextDateKey = getDateKey(now);

  if (nextDateKey !== currentDateKey) {
    currentDateKey = nextDateKey;
    render();
  }

  updateDateLabels(now);
}

function updateDateLabels(date) {
  const longDate = new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(date);

  const shortDate = new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

  todayLabel.textContent = longDate;
  footerDate.textContent = shortDate;
  todayLabel.dateTime = getDateKey(date);
}

function render() {
  const completedIds = getTodayCompletedIds();
  const completed = habits.filter((habit) =>
    completedIds.includes(habit.id),
  ).length;
  const total = habits.length;
  const progress = total === 0 ? 0 : completed / total;

  habitList.replaceChildren();
  habits.forEach((habit) => {
    habitList.append(createHabitElement(habit, completedIds.includes(habit.id)));
  });

  emptyState.hidden = total > 0;
  completedCount.textContent = String(completed);
  progressText.textContent = `${completed} / ${total}`;
  progressRing.style.setProperty("--progress", `${progress * 100}%`);
  progressRing.setAttribute("aria-valuemax", String(total));
  progressRing.setAttribute("aria-valuenow", String(completed));
  progressRing.setAttribute(
    "aria-valuetext",
    total === 0 ? "还没有习惯" : `已完成 ${completed} 项，共 ${total} 项`,
  );

  if (total === 0) {
    remainingText.textContent = "先添加一个习惯";
    sectionSummary.textContent = "还没有习惯";
    heroNote.textContent = "从一件小事开始吧。";
  } else if (completed === total) {
    remainingText.textContent = "非常棒！已经全部完成了";
    sectionSummary.textContent = `做得很好，${completed} 项已全部完成`;
    heroNote.textContent = "今天的清单完成了，去好好享受生活吧。";
  } else {
    remainingText.textContent = `还差 ${total - completed} 项`;
    sectionSummary.textContent = `已完成 ${completed} 项，还剩 ${total - completed} 项`;
    heroNote.textContent =
      completed === 0 ? "从一件小事开始吧。" : "保持这个节奏，很快就能完成。";
  }
}

function createHabitElement(habit, isComplete) {
  const element = habitTemplate.content.firstElementChild.cloneNode(true);
  const checkButton = element.querySelector(".check-button");
  const name = element.querySelector(".habit-name");
  const status = element.querySelector(".habit-status");
  const icon = element.querySelector(".habit-icon");
  const deleteButton = element.querySelector(".delete-button");

  element.dataset.id = habit.id;
  element.style.setProperty("--habit-color", habit.color);
  element.style.setProperty("--habit-tint", habit.tint);
  element.classList.toggle("is-complete", isComplete);

  checkButton.setAttribute("aria-checked", String(isComplete));
  checkButton.setAttribute(
    "aria-label",
    `${isComplete ? "取消完成" : "标记完成"}：${habit.name}`,
  );
  name.textContent = habit.name;
  status.textContent = isComplete ? "今天已完成" : "今日待完成";
  icon.textContent = habit.icon;
  deleteButton.setAttribute("aria-label", `删除习惯：${habit.name}`);

  checkButton.addEventListener("click", () => toggleHabit(habit.id));
  deleteButton.addEventListener("click", () => deleteHabit(habit.id));

  return element;
}

function toggleHabit(habitId) {
  const completedIds = getTodayCompletedIds();
  const isCurrentlyComplete = completedIds.includes(habitId);
  const nextCompletedIds = isCurrentlyComplete
    ? completedIds.filter((id) => id !== habitId)
    : [...completedIds, habitId];

  checkins[currentDateKey] = nextCompletedIds;
  saveCheckins();
  render();

  const updatedElement = habitList.querySelector(`[data-id="${habitId}"]`);
  if (
    updatedElement &&
    !isCurrentlyComplete &&
    typeof updatedElement.animate === "function"
  ) {
    updatedElement.animate(
      [
        { transform: "translateY(0) scale(1)" },
        { transform: "translateY(-3px) scale(1.008)" },
        { transform: "translateY(0) scale(1)" },
      ],
      { duration: 280, easing: "ease-out" },
    );
  }
}

function addHabit(name) {
  const duplicate = habits.some(
    (habit) => habit.name.toLocaleLowerCase() === name.toLocaleLowerCase(),
  );

  if (duplicate) {
    formMessage.textContent = "这个习惯已经在清单里了";
    habitInput.select();
    return;
  }

  habits = [
    ...habits,
    {
      id: createId(),
      name,
      ...inferHabitStyle(name),
    },
  ];

  formMessage.textContent = "";
  saveHabits();
  render();
  habitInput.value = "";
  habitInput.focus();

  const newElement = habitList.lastElementChild;
  if (newElement && typeof newElement.animate === "function") {
    newElement.animate(
      [
        { opacity: 0, transform: "translateY(10px)" },
        { opacity: 1, transform: "translateY(0)" },
      ],
      { duration: 280, easing: "ease-out" },
    );
  }
}

function deleteHabit(habitId) {
  const habitIndex = habits.findIndex((habit) => habit.id === habitId);
  if (habitIndex === -1) return;

  const habit = habits[habitIndex];
  const completedIds = getTodayCompletedIds();
  const wasComplete = completedIds.includes(habitId);

  habits = habits.filter((item) => item.id !== habitId);
  checkins[currentDateKey] = completedIds.filter((id) => id !== habitId);
  deletedHabit = { habit, index: habitIndex, wasComplete };

  saveHabits();
  saveCheckins();
  render();
  showToast(`已删除「${habit.name}」`);
}

function undoDelete() {
  if (!deletedHabit) return;

  const { habit, index, wasComplete } = deletedHabit;
  const restoredHabits = [...habits];
  restoredHabits.splice(Math.min(index, restoredHabits.length), 0, habit);
  habits = restoredHabits;

  if (wasComplete) {
    checkins[currentDateKey] = [...getTodayCompletedIds(), habit.id];
  }

  deletedHabit = null;
  saveHabits();
  saveCheckins();
  hideToast();
  render();
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  toastText.textContent = message;
  toast.hidden = false;

  toastTimer = window.setTimeout(() => {
    deletedHabit = null;
    hideToast();
  }, 5000);
}

function hideToast() {
  window.clearTimeout(toastTimer);
  toast.hidden = true;
}

habitForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = habitInput.value.trim().replace(/\s+/g, " ");

  if (!name) {
    formMessage.textContent = "先写下一个习惯吧";
    habitInput.focus();
    return;
  }

  addHabit(name);
});

habitInput.addEventListener("input", () => {
  if (formMessage.textContent) {
    formMessage.textContent = "";
  }
});

undoButton.addEventListener("click", undoDelete);

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    refreshDate();
    render();
  }
});

window.addEventListener("storage", (event) => {
  if (event.key === STORAGE_KEYS.habits) {
    habits = loadHabits();
    render();
  }

  if (event.key === STORAGE_KEYS.checkins) {
    checkins = loadCheckins();
    render();
  }
});

window.setInterval(refreshDate, 60 * 1000);

updateDateLabels(new Date());
render();
