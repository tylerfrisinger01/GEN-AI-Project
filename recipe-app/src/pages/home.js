import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "../css/home.css";
import { addSavedAiSnapshot, listSaved } from "../data/saved";
import { generateAiImage } from "../api/aiImage";
import { Link } from "react-router-dom";
import { hydrateSavedRecipes, normalizeInstructions } from "../lib/hydrateSaved";

// ---------------- LocalStorage Keys ----------------
const LS_DIETARY = "dietary-settings";
const LS_SHOPPING_LIST = "shopping-list";

const items = ["chicken breast", "ground beef", "onion", "garlic", "olive oil", "salt", "black pepper", "butter", "potatoes", "rice", "pasta", "tomatoes", "carrots", "bell peppers", "cheese", "eggs", "flour", "broth", "soy sauce", "herbs"];
const AI_IMAGE_FALLBACK = "/meal_image.jpg";
const AI_IMAGE_MAX_ATTEMPTS = 3;

const DEFAULT_DIETARY = {
  vegetarian: false,
  vegan: false,
  glutenFree: false,
  dairyFree: false,
  nutFree: false,
  halal: false,
  kosher: false,
};

function formatDietLabel(key = "") {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase());
}

function extractIngredientName(entry) {
  if (!entry) return "";
  if (typeof entry === "string") return entry;
  return entry.ingredient || "";
}

function pickDinnerCandidate(recipes = []) {
  if (!Array.isArray(recipes) || recipes.length === 0) return null;
  const withDescription = recipes.filter(
    (recipe) =>
      typeof recipe?.description === "string" && recipe.description.trim()
  );
  const pool = withDescription.length ? withDescription : recipes;
  const index = Math.floor(Math.random() * pool.length);
  return pool[index];
}

function truncateText(text, max = 120) {
  if (!text) return "";
  if (text.length <= max) return text;
  return `${text.slice(0, max).trim()}…`;
}

// ---------------- Helpers ----------------
function loadLS(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
}

function saveLS(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function createEmptyAiSession() {
  return {
    prompt: null,
    recipes: [],
    images: [],
    generatedAt: null,
  };
}

function getRecipeSteps(recipe) {
  if (!recipe) return [];
  if (Array.isArray(recipe.steps) && recipe.steps.length) {
    return recipe.steps;
  }
  const instructions = recipe.instructions;
  if (typeof instructions === "string") {
    return normalizeInstructions(instructions);
  }
  if (
    Array.isArray(instructions) &&
    instructions.every((entry) => typeof entry === "string")
  ) {
    return normalizeInstructions(instructions);
  }
  return [];
}

function formatStepEntries(rawSteps = []) {
  if (!Array.isArray(rawSteps) || rawSteps.length === 0) return [];
  return rawSteps
    .map((entry, idx) => {
      if (!entry) return null;
      if (typeof entry === "string") {
        const text = entry.trim();
        if (!text) return null;
        return {
          number: idx + 1,
          text,
          title: null,
        };
      }
      if (typeof entry === "object") {
        const text =
          entry.text ||
          entry.description ||
          entry.body ||
          entry.step ||
          entry.value ||
          "";
        const cleaned = typeof text === "string" ? text.trim() : "";
        if (!cleaned) return null;
        const numberCandidate =
          entry.number ?? entry.step_number ?? entry.index ?? entry.order;
        const number = Number(numberCandidate);
        return {
          number: Number.isFinite(number) ? number : idx + 1,
          text: cleaned,
          title:
            typeof entry.title === "string"
              ? entry.title.trim()
              : typeof entry.name === "string"
              ? entry.name.trim()
              : null,
        };
      }
      return null;
    })
    .filter(Boolean);
}

async function generateAiImageWithRetry(recipe, maxAttempts = AI_IMAGE_MAX_ATTEMPTS) {
  const payload = {
    name: recipe?.name,
    ingredients: recipe?.ingredients,
  };

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const url = await generateAiImage(payload);
    if (url) {
      return url;
    }
  }
  return AI_IMAGE_FALLBACK;
}

// ---------------- Home Component ----------------
export default function Home({
  systemPrompt = null,
  aiSession = null,
  setAiSession = null,
}) {
  const [dietary, setDietary] = useState(() => ({ ...DEFAULT_DIETARY, ...loadLS(LS_DIETARY, {}) }));
  const [shoppingList, setShoppingList] = useState(() => loadLS(LS_SHOPPING_LIST, []));
  const [savedRecipes, setSavedRecipes] = useState([]);
  const [savedLoading, setSavedLoading] = useState(true);

  const [fallbackAiSession, setFallbackAiSession] = useState(() =>
    createEmptyAiSession()
  );
  const sessionState = aiSession ?? fallbackAiSession;
  const sessionSetter = setAiSession ?? setFallbackAiSession;

  const [aiRecipes, setAiRecipes] = useState(
    () => sessionState?.recipes || []
  );
  const [aiImages, setAiImages] = useState(
    () => sessionState?.images || []
  );
  const [aiImagesLoading, setAiImagesLoading] = useState(false);
  const [dinnerIdea, setDinnerIdea] = useState(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [expandedAiIndex, setExpandedAiIndex] = useState(null);
  const [savingAiIndex, setSavingAiIndex] = useState(null);
  const [aiSaveError, setAiSaveError] = useState(null);

  const hasAutoGeneratedRef = useRef(false);

  useEffect(() => {
    if (sessionState) {
      setAiRecipes(sessionState.recipes || []);
      setAiImages(sessionState.images || []);
    }
  }, [sessionState]);

  // Persist state
  useEffect(() => saveLS(LS_DIETARY, dietary), [dietary]);
  useEffect(() => saveLS(LS_SHOPPING_LIST, shoppingList), [shoppingList]);

  // ---------------- AI Fetch ----------------
  async function fetchAiRecipes(prompt, systemPrompt = null) {
    try {
      const res = await fetch("http://localhost:4000/api/ai-recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, systemPrompt }),
      });
      const data = await res.json();
      return data.text || "[]"; 
    } catch (err) {
      console.error(err);
      return "[]";
    }
  }

  const refreshAiImages = useCallback(async (recipes = []) => {
    if (!Array.isArray(recipes) || recipes.length === 0) {
      setAiImages([]);
      setAiImagesLoading(false);
      return [];
    }
    setAiImagesLoading(true);
    try {
      const urls = await Promise.all(
        recipes.map((recipe) => generateAiImageWithRetry(recipe))
      );
      setAiImages(urls);
      return urls;
    } catch (err) {
      console.error("Failed to generate AI images:", err);
      const fallbacks = recipes.map(() => AI_IMAGE_FALLBACK);
      setAiImages(fallbacks);
      return fallbacks;
    } finally {
      setAiImagesLoading(false);
    }
  }, []);

  const generateDefaultPrompt = useCallback(() => {
    const pantry = items.join(", ");
    const diets = Object.keys(dietary).filter(k => dietary[k]).join(", ") || "none";
    return `Generate 3 recipes using ingredients: ${pantry}.
Dietary restrictions: ${diets}.
Preferred cuisines: any.
Return JSON array like: [{name, description, ingredients, steps}]`;
  }, [dietary]);

  const fetchSavedRecipes = useCallback(async () => {
    const data = await listSaved();
    const rows = Array.isArray(data) ? data : [];
    return hydrateSavedRecipes(rows);
  }, []);

  const resetAiSession = useCallback(() => {
    sessionSetter(createEmptyAiSession());
  }, [sessionSetter]);

  const storeAiSession = useCallback(
    ({ prompt, recipes, images }) => {
      sessionSetter({
        prompt: prompt || null,
        recipes: Array.isArray(recipes) ? recipes : [],
        images: Array.isArray(images) ? images : [],
        generatedAt: Date.now(),
      });
    },
    [sessionSetter]
  );

  const runAiGeneration = useCallback(
    async ({ prompt, silent = false } = {}) => {
      const effectivePrompt = prompt || generateDefaultPrompt();
      if (!silent) setLoadingAi(true);
      try {
        const text = await fetchAiRecipes(effectivePrompt, systemPrompt);
        let recipes = [];
        try {
          recipes = JSON.parse(text);
        } catch {
          recipes = [];
        }
        if (!Array.isArray(recipes)) {
          recipes = [];
        }
        setAiRecipes(recipes);
        setExpandedAiIndex(null);
        if (!recipes.length) {
          setAiImages([]);
          resetAiSession();
          return;
        }
        const urls = await refreshAiImages(recipes);
        storeAiSession({
          prompt: effectivePrompt,
          recipes,
          images: Array.isArray(urls) ? urls : [],
        });
      } catch (err) {
        console.error("Failed to generate AI recipes:", err);
        setAiRecipes([]);
        setExpandedAiIndex(null);
        setAiImages([]);
        resetAiSession();
      } finally {
        if (!silent) setLoadingAi(false);
      }
    },
    [generateDefaultPrompt, refreshAiImages, resetAiSession, storeAiSession, systemPrompt]
  );

  useEffect(() => {
    if (hasAutoGeneratedRef.current) return;
    if (aiRecipes.length > 0) {
      hasAutoGeneratedRef.current = true;
      return;
    }
    hasAutoGeneratedRef.current = true;
    runAiGeneration({ prompt: generateDefaultPrompt() });
  }, [aiRecipes.length, generateDefaultPrompt, runAiGeneration]);

  useEffect(() => {
    let cancelled = false;
    setSavedLoading(true);
    fetchSavedRecipes()
      .then((enriched) => {
        if (cancelled) return;
        setSavedRecipes(enriched);
        setDinnerIdea(pickDinnerCandidate(enriched));
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Failed to load saved recipes:", err);
        setSavedRecipes([]);
        setDinnerIdea(null);
      })
      .finally(() => {
        if (!cancelled) setSavedLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [fetchSavedRecipes]);

  // ---------------- Handlers ----------------
  function toggleDietary(key) {
    setDietary(d => ({ ...d, [key]: !d[key] }));
  }

  function addShoppingItem(item) {
    if (!item.trim()) return;
    setShoppingList(prev => [...prev, { id: Math.random().toString(36).slice(2,7), name: item.trim(), done: false }]);
  }

  function toggleShoppingItem(id) {
    setShoppingList(prev => prev.map(i => i.id === id ? { ...i, done: !i.done } : i));
  }

  function clearShoppingList() {
    setShoppingList([]);
  }

  async function handleSaveAiRecipe(recipe, index) {
    if (!recipe) return;
    const normalizedName = (recipe.name || "").trim();
    if (!normalizedName) {
      setAiSaveError("Please name the recipe before saving it.");
      return;
    }
    const lookupName = normalizedName.toLowerCase();
    if (savedAiNames.has(lookupName)) {
      return;
    }
    const imageUrl = aiImages[index] || null;

    setAiSaveError(null);
    setSavingAiIndex(index);
    try {
      await addSavedAiSnapshot({
        ...recipe,
        name: normalizedName,
        ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
        steps: Array.isArray(recipe.steps) ? recipe.steps : [],
        image_url: imageUrl,
      });
      const enriched = await fetchSavedRecipes();
      setSavedRecipes(enriched);
      setDinnerIdea(pickDinnerCandidate(enriched));
    } catch (err) {
      console.error("Failed to save AI recipe:", err);
      setAiSaveError(err?.message || "Failed to save recipe");
    } finally {
      setSavingAiIndex(null);
    }
  }

  const activeDietaryKeys = Object.keys(dietary).filter((key) => dietary[key]);
  const dinnerMeta = dinnerIdea
    ? [
        dinnerIdea.minutes ? `${dinnerIdea.minutes} min` : null,
        typeof dinnerIdea.rating === "number" ? `★ ${dinnerIdea.rating}` : null,
        dinnerIdea.cuisine || null,
        dinnerIdea.diet || null,
      ].filter(Boolean)
    : [];
  const dinnerDescription =
    dinnerIdea && typeof dinnerIdea.description === "string" && dinnerIdea.description.trim()
      ? dinnerIdea.description
      : dinnerIdea
      ? "This saved recipe doesn't have a description yet, but it's ready to cook!"
      : "";
  const dinnerIngredientsPreview =
    dinnerIdea && Array.isArray(dinnerIdea.ingredients)
      ? dinnerIdea.ingredients
          .map(extractIngredientName)
          .filter(Boolean)
          .slice(0, 5)
      : [];
  const dinnerStepsSource = dinnerIdea ? getRecipeSteps(dinnerIdea) : [];
  const dinnerStepsPreview = formatStepEntries(dinnerStepsSource).slice(0, 3);
  const savedAiNames = useMemo(() => {
    const nameSet = new Set();
    savedRecipes.forEach((recipe) => {
      if (recipe?.name && recipe?.is_ai_recipe) {
        nameSet.add(recipe.name.toLowerCase());
      }
    });
    return nameSet;
  }, [savedRecipes]);

  // ---------------- UI ----------------
  return (
    <div className="home-shell">
      <header className="home-header">
        <div className="home-title">
          <span className="logo">🍽️</span>
          <div>
            <h1>Welcome back</h1>
            <p className="subtitle">Here's your personalized kitchen dashboard.</p>
          </div>
        </div>
      </header>

      {/* What's for Dinner */}
      <section className="panel">
        <div className="panel-head">
          <h2>What's for Dinner</h2>
        </div>
        <div className="dinner-section">
          {savedLoading ? (
            <p>Loading your saved recipes…</p>
          ) : savedRecipes.length === 0 ? (
            <div>
            <p>You haven't saved any recipes yet. Head to Search to save a few favorites.</p>
              <Link className="btn primary" to="/saved">View Saved Recipes</Link>
            </div>
          ) : dinnerIdea ? (
            <div className="dinner-layout">
              {dinnerIdea.image_url && (
                <div className="dinner-media">
                  <img
                    src={dinnerIdea.image_url}
                    alt={dinnerIdea.name || "Saved recipe"}
                    className="dinner-image"
                  />
                </div>
              )}
              <div className="dinner-text">
                <p className="dinner-eyebrow">Chef's pick</p>
                <h3 className="dinner-caption">{dinnerIdea.name}</h3>
                <p className="dinner-description">{dinnerDescription}</p>
                {dinnerMeta.length > 0 && (
                  <div className="dinner-meta">
                    {dinnerMeta.map((pill) => (
                      <span key={pill} className="meta-pill">
                        {pill}
                      </span>
                    ))}
                  </div>
                )}
                {dinnerIngredientsPreview.length > 0 && (
                  <div className="dinner-block">
                    <strong>Quick ingredients</strong>
                    <ul className="inline-list">
                      {dinnerIngredientsPreview.map((ing, idx) => (
                        <li key={idx}>{ing}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {dinnerStepsPreview.length > 0 && (
                  <div className="dinner-block">
                    <strong>Steps</strong>
                    <ol className="dinner-steps">
                      {dinnerStepsPreview.map((step) => {
                        const key = `${step.number}-${step.text.slice(0, 24)}`;
                        return (
                          <li key={key}>
                            <div className="dinner-step-label">
                              Step {step.number}
                              {step.title ? ` · ${step.title}` : ""}
                            </div>
                            <div className="dinner-step-text">{step.text}</div>
                          </li>
                        );
                      })}
                    </ol>
                  </div>
                )}
                <Link className="btn primary" to="/saved">
                  Go to Saved Recipes
                </Link>
              </div>
            </div>
          ) : (
            <div>
              <p>No saved recipes available right now.</p>
              <Link className="btn primary" to="/saved">Go to Saved Recipes</Link>
            </div>
          )}
        </div>
      </section>

      {/* AI Recipes */}
      <section className="panel">
        <div className="panel-head">
          <h2>AI-Generated Recipes</h2>
        </div>
        {loadingAi ? (
          <p>Generating AI recipes...</p>
        ) : (
          <>
            {aiImagesLoading && aiRecipes.length > 0 && (
              <p>Generating fresh images…</p>
            )}
            {aiSaveError && <p className="inline-error">{aiSaveError}</p>}
            {aiRecipes.length === 0 ? (
              <p>No AI recipes yet.</p>
            ) : (
              <div className="ai-card-grid">
                {aiRecipes.map((r, i) => {
                  const isExpanded = expandedAiIndex === i;
                  const imgUrl = aiImages[i] || null;
                  const normalizedName = (r.name || "").toLowerCase();
                  const alreadySaved = !!(
                    normalizedName && savedAiNames.has(normalizedName)
                  );
                  const saving = savingAiIndex === i;
                  const disableSave = !r.name || alreadySaved || saving;
                  return (
                    <article
                      className={`ai-card ${isExpanded ? "expanded" : ""}`}
                      key={i}
                      onClick={() => setExpandedAiIndex(isExpanded ? null : i)}
                    >
                      {imgUrl && (
                        <div className="ai-card-media">
                          <img src={imgUrl} alt={r.name || `Recipe ${i + 1}`} />
                        </div>
                      )}
                      <div className="ai-card-body">
                        <h3>{r.name || `Recipe ${i + 1}`}</h3>
                        <p className="ai-card-hint">
                          {isExpanded ? "Click to collapse" : "Click to expand"}
                        </p>
                        {!isExpanded && r.description && (
                          <p className="ai-card-summary">
                            {truncateText(r.description, 140)}
                          </p>
                        )}
                        <div className="ai-card-chips">
                          {Array.isArray(r.ingredients) && r.ingredients.length > 0 && (
                            <span>{r.ingredients.length} ingredients</span>
                          )}
                          {Array.isArray(r.steps) && r.steps.length > 0 && (
                            <span>{r.steps.length} steps</span>
                          )}
                        </div>
                        <div className="ai-card-actions">
                          <button
                            type="button"
                            className="btn secondary"
                            disabled={disableSave}
                            onClick={(event) => {
                              event.stopPropagation();
                              if (!disableSave) {
                                handleSaveAiRecipe(r, i);
                              }
                            }}
                          >
                            {alreadySaved
                              ? "Saved"
                              : saving
                              ? "Saving…"
                              : "Save Recipe"}
                          </button>
                          {alreadySaved && (
                            <span className="ai-card-saved">Saved to favorites</span>
                          )}
                        </div>
                        {isExpanded && (
                          <div className="ai-card-details">
                            {r.description && <p>{r.description}</p>}
                            {Array.isArray(r.ingredients) && r.ingredients.length > 0 && (
                              <div>
                                <strong>Ingredients:</strong>
                                <ul>
                                  {r.ingredients.map((ing, idx) => (
                                    <li key={idx}>
                                      {typeof ing === "string" ? ing : ing.ingredient || ""}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {Array.isArray(r.steps) && r.steps.length > 0 && (
                              <div>
                                <strong>Steps:</strong>
                                <ol>
                                  {r.steps.map((step, idx) => (
                                    <li key={idx}>{step}</li>
                                  ))}
                                </ol>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
            <button
              className="btn primary"
              onClick={() => runAiGeneration({ prompt: generateDefaultPrompt() })}
              disabled={loadingAi}
            >
              Regenerate AI Recipes
            </button>
          </>
        )}
      </section>

      {/* Profile Summary */}
      <section className="panel">
        <div className="panel-head"><h2>Profile Summary</h2></div>
        <ul className="profile-list profile-stats">
          <li>
            <span className="label">Saved Recipes</span>
            <span className="value">{savedRecipes.length}</span>
          </li>
          <li>
            <span className="label">Active Dietary Filters</span>
            <span className="value">
              {activeDietaryKeys.length
                ? activeDietaryKeys.map(formatDietLabel).join(", ")
                : "None"}
            </span>
          </li>
          <li>
            <span className="label">Shopping List Items</span>
            <span className="value">{shoppingList.length}</span>
          </li>
          <li>
            <span className="label">Daily Challenge</span>
            <span className="value highlight">Make an Italian dish</span>
          </li>
        </ul>
      </section>

      {/* Dietary Restrictions */}
      <section className="panel">
        <div className="panel-head"><h2>Dietary Restrictions</h2></div>
        <div className="dietary-grid">
          {Object.keys(DEFAULT_DIETARY).map(key => (
            <label key={key} className={`diet-chip ${dietary[key] ? "on" : ""}`}>
              <input type="checkbox" checked={!!dietary[key]} onChange={() => toggleDietary(key)} />
              <span className="name">{key.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase())}</span>
            </label>
          ))}
        </div>
      </section>

      {/* Shopping List */}
      <section className="panel">
        <div className="panel-head">
          <h2>Shopping List</h2>
          {shoppingList.length > 0 && <button className="btn ghost" onClick={clearShoppingList}>Clear</button>}
        </div>
        <AddShoppingItem onAdd={addShoppingItem} />
        {shoppingList.length === 0 ? (
          <div className="empty"><p>Your shopping list is empty. Add ingredients above!</p></div>
        ) : (
          <ul className="shopping-list">
            {shoppingList.map(i => (
              <li key={i.id} className={i.done ? "done" : ""} onClick={() => toggleShoppingItem(i.id)}>
                {i.name}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

// ---------------- Components ----------------
function AddShoppingItem({ onAdd }) {
  const itemRef = useRef(null);

  function add() {
    onAdd(itemRef.current?.value || "");
    if (itemRef.current) itemRef.current.value = "";
    itemRef.current?.focus();
  }

  return (
    <div className="add-fav-row">
      <input
        ref={itemRef}
        type="text"
        placeholder="Add item (e.g., Tomatoes)"
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            add();
          }
        }}
      />
      <button className="btn primary" type="button" onClick={add}>
        Add
      </button>
    </div>
  );
}
