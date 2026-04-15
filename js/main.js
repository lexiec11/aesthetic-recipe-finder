/* ========================================
   Aesthetic Recipe Finder — main.js
   Vanilla JS with TheMealDB API
   ======================================== */

// ---- DOM Elements ----
const searchForm = document.getElementById("search-form");
const searchInput = document.getElementById("search-input");
const searchBtn = document.getElementById("search-btn");
const statusEl = document.getElementById("status");
const gridEl = document.getElementById("recipe-grid");
const modalOverlay = document.getElementById("modal-overlay");
const modalBackdrop = document.getElementById("modal-backdrop");
const modalClose = document.getElementById("modal-close");
const modalImg = document.getElementById("modal-img");
const modalTitle = document.getElementById("modal-title");
const modalTags = document.getElementById("modal-tags");
const modalIngredients = document.getElementById("modal-ingredients");
const modalInstructions = document.getElementById("modal-instructions");
const modalYoutubeWrap = document.getElementById("modal-youtube-wrap");
const modalIngredientsSection = document.getElementById("modal-ingredients-section");
const modalInstructionsSection = document.getElementById("modal-instructions-section");

// ---- API ----
const API_URL = "https://www.themealdb.com/api/json/v1/1/search.php";

/**
 * Fetch meals from TheMealDB by search query.
 * @param {string} query - The meal name to search for.
 * @returns {Promise<Array>} Array of meal objects or empty array.
 */
async function searchMeals(query) {
  const response = await fetch(`${API_URL}?s=${encodeURIComponent(query)}`);
  if (!response.ok) throw new Error("Failed to fetch recipes");
  const data = await response.json();
  return data.meals || [];
}

// ---- Favorites (localStorage) ----

/**
 * Get the set of favorite meal IDs from localStorage.
 * @returns {Set<string>}
 */
function getFavorites() {
  try {
    const stored = localStorage.getItem("recipe-favorites");
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
}

/**
 * Save favorites set to localStorage.
 * @param {Set<string>} favs
 */
function saveFavorites(favs) {
  localStorage.setItem("recipe-favorites", JSON.stringify([...favs]));
}

/**
 * Toggle a meal ID in favorites and update the UI button.
 * @param {string} id
 * @param {HTMLElement} btnEl - The favorite button element.
 */
function toggleFavorite(id, btnEl) {
  const favs = getFavorites();
  if (favs.has(id)) {
    favs.delete(id);
    btnEl.classList.remove("is-fav");
    btnEl.setAttribute("aria-label", "Add to favorites");
  } else {
    favs.add(id);
    btnEl.classList.add("is-fav");
    btnEl.setAttribute("aria-label", "Remove from favorites");
  }
  saveFavorites(favs);
}

// ---- Ingredient Parser ----

/**
 * Parse ingredients from a TheMealDB meal object.
 * @param {Object} meal
 * @returns {Array<{name: string, measure: string}>}
 */
function parseIngredients(meal) {
  const ingredients = [];
  for (let i = 1; i <= 20; i++) {
    const name = meal[`strIngredient${i}`];
    const measure = meal[`strMeasure${i}`];
    if (name && name.trim()) {
      ingredients.push({
        name: name.trim(),
        measure: measure ? measure.trim() : "",
      });
    }
  }
  return ingredients;
}

// ---- UI Helpers ----

/** Show a status message (loading, error, empty). */
function showStatus(html) {
  statusEl.innerHTML = html;
  statusEl.classList.remove("hidden");
  gridEl.innerHTML = "";
}

/** Hide the status message. */
function hideStatus() {
  statusEl.classList.add("hidden");
  statusEl.innerHTML = "";
}

/** Heart SVG icon string. */
const heartSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`;

/**
 * Create a recipe card element.
 * @param {Object} meal
 * @returns {HTMLElement}
 */
function createRecipeCard(meal) {
  const favs = getFavorites();
  const isFav = favs.has(meal.idMeal);

  const card = document.createElement("article");
  card.className = "recipe-card";

  card.innerHTML = `
    <div class="recipe-card__img-wrap">
      <img class="recipe-card__img" src="${meal.strMealThumb}" alt="${meal.strMeal}" loading="lazy" />
      <button class="recipe-card__fav ${isFav ? "is-fav" : ""}" aria-label="${isFav ? "Remove from favorites" : "Add to favorites"}">
        ${heartSVG}
      </button>
    </div>
    <div class="recipe-card__body">
      <h3 class="recipe-card__title">${meal.strMeal}</h3>
      <div class="recipe-card__tags">
        ${meal.strCategory ? `<span class="tag tag--category">${meal.strCategory}</span>` : ""}
        ${meal.strArea ? `<span class="tag tag--area">${meal.strArea}</span>` : ""}
      </div>
      <div class="recipe-card__action">
        <button class="btn-outline js-view-recipe">View Recipe</button>
      </div>
    </div>
  `;

  // Favorite button
  const favBtn = card.querySelector(".recipe-card__fav");
  favBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleFavorite(meal.idMeal, favBtn);
  });

  // View recipe button
  const viewBtn = card.querySelector(".js-view-recipe");
  viewBtn.addEventListener("click", () => openModal(meal));

  return card;
}

/**
 * Render an array of meals into the grid.
 * @param {Array} meals
 */
function renderMeals(meals) {
  hideStatus();
  gridEl.innerHTML = "";
  meals.forEach((meal) => {
    gridEl.appendChild(createRecipeCard(meal));
  });
}

// ---- Modal ----

/** Open the detail modal for a given meal. */
function openModal(meal) {
  const ingredients = parseIngredients(meal);

  modalImg.src = meal.strMealThumb;
  modalImg.alt = meal.strMeal;
  modalTitle.textContent = meal.strMeal;

  // Tags
  modalTags.innerHTML = "";
  if (meal.strCategory) {
    modalTags.innerHTML += `<span class="tag tag--category">${meal.strCategory}</span>`;
  }
  if (meal.strArea) {
    modalTags.innerHTML += `<span class="tag tag--area">${meal.strArea}</span>`;
  }

  // Ingredients
  if (ingredients.length > 0) {
    modalIngredientsSection.classList.remove("hidden");
    modalIngredients.innerHTML = ingredients
      .map((ing) => `<li><span>${ing.name}</span>${ing.measure ? ` — ${ing.measure}` : ""}</li>`)
      .join("");
  } else {
    modalIngredientsSection.classList.add("hidden");
  }

  // Instructions
  if (meal.strInstructions) {
    modalInstructionsSection.classList.remove("hidden");
    modalInstructions.textContent = meal.strInstructions;
  } else {
    modalInstructionsSection.classList.add("hidden");
  }

  // YouTube link
  modalYoutubeWrap.innerHTML = "";
  if (meal.strYoutube) {
    modalYoutubeWrap.innerHTML = `
      <a href="${meal.strYoutube}" target="_blank" rel="noopener noreferrer" class="btn-primary">
        Watch on YouTube
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
      </a>
    `;
  }

  // Show modal
  modalOverlay.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

/** Close the detail modal. */
function closeModal() {
  modalOverlay.classList.add("hidden");
  document.body.style.overflow = "";
}

modalClose.addEventListener("click", closeModal);
modalBackdrop.addEventListener("click", closeModal);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !modalOverlay.classList.contains("hidden")) {
    closeModal();
  }
});

// ---- Search Handler ----

/**
 * Handle a search: show loading, fetch results, render or show status.
 * @param {string} query
 */
async function handleSearch(query) {
  showStatus('<div class="spinner"></div>');
  searchBtn.disabled = true;
  searchBtn.textContent = "Searching…";

  try {
    const meals = await searchMeals(query);
    if (meals.length === 0) {
      showStatus(`
        <svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>
        </svg>
        <p>No recipes found. Try a different search!</p>
      `);
    } else {
      renderMeals(meals);
    }
  } catch {
    showStatus("<p>Something went wrong. Please try again.</p>");
  } finally {
    searchBtn.disabled = false;
    searchBtn.textContent = "Search";
  }
}

// ---- Event Listeners ----

searchForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const query = searchInput.value.trim();
  if (query) handleSearch(query);
});

// ---- Load Default Recipes on Page Load ----
handleSearch("chicken");
