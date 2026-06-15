const allOption = "全部";
const storageKey = "eat-what-restaurants";
let storageSupported = true;

const defaultRestaurants = normalizeRestaurants(window.restaurantData || []);

const state = {
  restaurants: loadRestaurants(),
  region: allOption,
  category: allOption,
  activeId: "",
  pickedId: "",
  isPicking: false,
};

const regionFilter = document.querySelector("#regionFilter");
const categoryFilter = document.querySelector("#categoryFilter");
const candidateList = document.querySelector("#candidateList");
const candidateCount = document.querySelector("#candidateCount");
const pickButton = document.querySelector("#pickButton");
const resetButton = document.querySelector("#resetButton");
const manageButton = document.querySelector("#manageButton");
const manageDialog = document.querySelector("#manageDialog");
const manageClose = document.querySelector("#manageClose");
const manageList = document.querySelector("#manageList");
const restaurantForm = document.querySelector("#restaurantForm");
const formMessage = document.querySelector("#formMessage");
const storageNote = document.querySelector("#storageNote");
const resultDialog = document.querySelector("#resultDialog");
const dialogClose = document.querySelector("#dialogClose");
const resultName = document.querySelector("#resultName");
const resultRegion = document.querySelector("#resultRegion");
const resultCategory = document.querySelector("#resultCategory");
const resultPool = document.querySelector("#resultPool");

function loadRestaurants() {
  let saved = null;

  try {
    saved = localStorage.getItem(storageKey);
  } catch {
    storageSupported = false;
  }

  if (!saved) {
    return copyRestaurants(defaultRestaurants);
  }

  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) && parsed.length
      ? normalizeRestaurants(parsed)
      : copyRestaurants(defaultRestaurants);
  } catch {
    return copyRestaurants(defaultRestaurants);
  }
}

function normalizeRestaurants(restaurants) {
  return restaurants
    .filter((restaurant) => restaurant.name && restaurant.region && restaurant.category)
    .map((restaurant, index) => ({
      id: restaurant.id || `r-file-${index + 1}`,
      name: restaurant.name.trim(),
      region: restaurant.region.trim(),
      category: restaurant.category.trim(),
    }));
}

function copyRestaurants(restaurants) {
  return restaurants.map((restaurant) => ({ ...restaurant }));
}

function saveRestaurants() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(state.restaurants));
    storageSupported = true;
    return true;
  } catch {
    storageSupported = false;
    return false;
  }
}

function uniqueOptions(key) {
  return [allOption, ...new Set(state.restaurants.map((item) => item[key]).filter(Boolean))];
}

function fillSelect(select, values, selectedValue) {
  select.innerHTML = "";

  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    option.selected = value === selectedValue;
    select.append(option);
  });
}

function getCandidates() {
  return state.restaurants.filter((restaurant) => {
    const regionMatched = state.region === allOption || restaurant.region === state.region;
    const categoryMatched = state.category === allOption || restaurant.category === state.category;
    return regionMatched && categoryMatched;
  });
}

function renderFilters() {
  const regions = uniqueOptions("region");
  const categories = uniqueOptions("category");

  if (!regions.includes(state.region)) {
    state.region = allOption;
  }
  if (!categories.includes(state.category)) {
    state.category = allOption;
  }

  fillSelect(regionFilter, regions, state.region);
  fillSelect(categoryFilter, categories, state.category);
}

function renderCandidates() {
  const candidates = getCandidates();
  candidateList.innerHTML = "";
  candidateCount.textContent = `${candidates.length} 家`;

  if (!candidates.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "没有符合条件的餐厅，可以换个筛选条件或添加一家。";
    candidateList.append(empty);
    return;
  }

  candidates.forEach((restaurant) => {
    const tile = document.createElement("article");
    const name = document.createElement("div");
    const tags = document.createElement("div");
    const region = document.createElement("span");
    const category = document.createElement("span");

    tile.className = "candidate-tile";
    tile.dataset.id = restaurant.id;
    if (state.activeId === restaurant.id) {
      tile.classList.add("is-active");
    }
    if (state.pickedId === restaurant.id) {
      tile.classList.add("is-picked");
    }

    name.className = "tile-name";
    name.textContent = restaurant.name;
    tags.className = "tile-tags";
    region.className = "tag";
    region.textContent = restaurant.region;
    category.className = "tag category";
    category.textContent = restaurant.category;

    tags.append(region, category);
    tile.append(name, tags);
    candidateList.append(tile);
  });
}

function renderManageList() {
  manageList.innerHTML = "";

  state.restaurants.forEach((restaurant) => {
    const row = document.createElement("article");
    const content = document.createElement("div");
    const name = document.createElement("div");
    const tags = document.createElement("div");
    const region = document.createElement("span");
    const category = document.createElement("span");
    const deleteButton = document.createElement("button");

    row.className = "manage-row";
    name.className = "manage-name";
    name.textContent = restaurant.name;
    tags.className = "tile-tags";
    region.className = "tag";
    region.textContent = restaurant.region;
    category.className = "tag category";
    category.textContent = restaurant.category;

    deleteButton.className = "delete-button";
    deleteButton.type = "button";
    deleteButton.textContent = "删除";
    deleteButton.ariaLabel = `删除 ${restaurant.name}`;
    deleteButton.addEventListener("click", () => removeRestaurant(restaurant.id));

    tags.append(region, category);
    content.append(name, tags);
    row.append(content, deleteButton);
    manageList.append(row);
  });
}

function renderStorageStatus() {
  storageNote.textContent = storageSupported
    ? "新增、删除和重置会自动保存到当前浏览器本地。"
    : "当前浏览器阻止了本地保存，刷新后可能恢复默认列表。";
  storageNote.classList.toggle("is-warning", !storageSupported);
}

function render() {
  renderFilters();
  renderCandidates();
  renderManageList();
  renderStorageStatus();
}

function randomIndex(max) {
  return crypto.getRandomValues(new Uint32Array(1))[0] % max;
}

function setActiveCandidate(id) {
  state.activeId = id;
  renderCandidates();
}

function sleep(duration) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, duration);
  });
}

async function pickRandomRestaurant() {
  if (state.isPicking) {
    return;
  }

  const candidates = getCandidates();

  if (!candidates.length) {
    formMessage.textContent = "当前筛选条件下没有候选餐厅。";
    return;
  }

  state.isPicking = true;
  state.pickedId = "";
  pickButton.disabled = true;
  pickButton.textContent = "挑选中...";
  formMessage.textContent = "";
  renderCandidates();

  const targetIndex = randomIndex(candidates.length);
  const totalSteps = 26;
  let previousIndex = -1;

  for (let step = 0; step <= totalSteps; step += 1) {
    let index = step === totalSteps ? targetIndex : randomIndex(candidates.length);
    if (candidates.length > 1 && index === previousIndex && step !== totalSteps) {
      index = (index + 1 + randomIndex(candidates.length - 1)) % candidates.length;
    }
    previousIndex = index;
    const current = candidates[index];
    setActiveCandidate(current.id);
    await sleep(40 + step * 2);
  }

  const picked = candidates[targetIndex];
  state.activeId = picked.id;
  state.pickedId = picked.id;
  state.isPicking = false;
  pickButton.disabled = false;
  pickButton.textContent = "开始挑选";
  renderCandidates();
  openResultDialog(picked, candidates.length);
}

function openResultDialog(restaurant, poolSize) {
  resultName.textContent = restaurant.name;
  resultRegion.textContent = restaurant.region;
  resultCategory.textContent = restaurant.category;
  resultPool.textContent = `${poolSize} 家候选中选出`;

  if (typeof resultDialog.showModal === "function") {
    resultDialog.showModal();
  }
}

function closeResultDialog() {
  resultDialog.close();
}

function openManageDialog() {
  renderManageList();
  if (typeof manageDialog.showModal === "function") {
    manageDialog.showModal();
  }
}

function closeManageDialog() {
  manageDialog.close();
}

function removeRestaurant(id) {
  if (state.isPicking) {
    return;
  }

  state.restaurants = state.restaurants.filter((restaurant) => restaurant.id !== id);
  if (state.activeId === id) {
    state.activeId = "";
  }
  if (state.pickedId === id) {
    state.pickedId = "";
  }
  const saved = saveRestaurants();
  formMessage.textContent = saved ? "已删除并保存到本地。" : "已删除，但浏览器阻止了本地保存。";
  render();
}

function addRestaurant(event) {
  event.preventDefault();
  const formData = new FormData(restaurantForm);
  const name = formData.get("name").trim();
  const region = formData.get("region").trim();
  const category = formData.get("category").trim();

  if (!name || !region || !category) {
    formMessage.textContent = "请补全餐厅名称、地域和种类。";
    return;
  }

  const existed = state.restaurants.some(
    (restaurant) =>
      restaurant.name === name &&
      restaurant.region === region &&
      restaurant.category === category,
  );

  if (existed) {
    formMessage.textContent = "这家餐厅已经在列表里了。";
    return;
  }

  state.restaurants.push({
    id: `r-${Date.now()}`,
    name,
    region,
    category,
  });

  state.region = region;
  state.category = category;
  state.activeId = "";
  state.pickedId = "";
  const saved = saveRestaurants();
  restaurantForm.reset();
  formMessage.textContent = saved ? "已添加并保存到本地。" : "已添加，但浏览器阻止了本地保存。";
  render();
}

regionFilter.addEventListener("change", (event) => {
  state.region = event.target.value;
  state.activeId = "";
  state.pickedId = "";
  renderCandidates();
});

categoryFilter.addEventListener("change", (event) => {
  state.category = event.target.value;
  state.activeId = "";
  state.pickedId = "";
  renderCandidates();
});

pickButton.addEventListener("click", pickRandomRestaurant);
restaurantForm.addEventListener("submit", addRestaurant);
manageButton.addEventListener("click", openManageDialog);
manageClose.addEventListener("click", closeManageDialog);
dialogClose.addEventListener("click", closeResultDialog);
resultDialog.addEventListener("click", (event) => {
  if (event.target === resultDialog) {
    closeResultDialog();
  }
});
manageDialog.addEventListener("click", (event) => {
  if (event.target === manageDialog) {
    closeManageDialog();
  }
});

resetButton.addEventListener("click", () => {
  if (state.isPicking) {
    return;
  }

  state.restaurants = copyRestaurants(defaultRestaurants);
  state.region = allOption;
  state.category = allOption;
  state.activeId = "";
  state.pickedId = "";
  const saved = saveRestaurants();
  formMessage.textContent = saved ? "已恢复默认餐厅并保存到本地。" : "已恢复默认餐厅，但浏览器阻止了本地保存。";
  render();
});

render();
