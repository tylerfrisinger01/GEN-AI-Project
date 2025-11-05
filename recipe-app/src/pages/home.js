// Home.jsx — JavaScript (no TypeScript)
// A polished homepage that shows:
// - Recently clicked meals (persisted)
// - Dietary restrictions (editable)
// - Favorite meals (editable)
// - Favorite cuisines (chips, editable)
//
// Drop this file in your pages/components folder and add a route/tab for it.
// Copy the CSS at the bottom into home.css (or merge into your global stylesheet).

import React, { useEffect, useMemo, useRef, useState } from "react";
import "../css/home.css";

// ---------------- LocalStorage Keys ----------------
const LS_RECENT_MEALS = "recent-meals";            // [{id, name, imageUrl, clickedAt}]
const LS_DIETARY = "dietary-settings";              // { vegetarian, vegan, glutenFree, ... }
const LS_FAV_MEALS = "favorite-meals";              // [{id, name, imageUrl}]
const LS_FAV_CUISINES = "favorite-cuisines";        // ["italian", "chinese", ...]

// ---------------- Helpers ----------------
function loadLS(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
  catch { return fallback; }
}

function saveLS(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

// Call this from your Search or Meal page when a user clicks a meal result.
// Example usage elsewhere: window.__pushRecentMeal({ id, name, imageUrl })
function pushRecentMeal(meal) {
  const limit = 20; // keep last 20
  const prev = loadLS(LS_RECENT_MEALS, []);
  // de-dupe by id/name combo
  const filtered = prev.filter(m => !(m.id === meal.id && m.name === meal.name));
  const next = [{ ...meal, clickedAt: Date.now() }, ...filtered].slice(0, limit);
  saveLS(LS_RECENT_MEALS, next);
}

// Expose a debug helper for your other pages to log recents without wiring props
if (typeof window !== "undefined") {
  window.__pushRecentMeal = (meal) => pushRecentMeal(meal);
}

const ALL_CUISINES = [
  "american","italian","french","mexican","chinese","japanese","korean","thai","indian","mediterranean","greek","spanish","vietnamese","lebanese","ethiopian","german","brazilian","caribbean"
];

const DEFAULT_DIETARY = {
  vegetarian: false,
  vegan: false,
  glutenFree: false,
  dairyFree: false,
  nutFree: false,
  halal: false,
  kosher: false,
};

export default function Home() {
  const [recent, setRecent] = useState(() => loadLS(LS_RECENT_MEALS, []));
  const [dietary, setDietary] = useState(() => ({ ...DEFAULT_DIETARY, ...loadLS(LS_DIETARY, {}) }));
  const [favMeals, setFavMeals] = useState(() => loadLS(LS_FAV_MEALS, []));
  const [favCuisines, setFavCuisines] = useState(() => loadLS(LS_FAV_CUISINES, []));

  // Persist
  useEffect(() => saveLS(LS_RECENT_MEALS, recent), [recent]);
  useEffect(() => saveLS(LS_DIETARY, dietary), [dietary]);
  useEffect(() => saveLS(LS_FAV_MEALS, favMeals), [favMeals]);
  useEffect(() => saveLS(LS_FAV_CUISINES, favCuisines), [favCuisines]);

  // Sort recent by clickedAt desc
  const recentSorted = useMemo(() => {
    return [...recent].sort((a,b) => (b.clickedAt || 0) - (a.clickedAt || 0));
  }, [recent]);

  // -------------- Handlers --------------
  function toggleDietary(key) {
    setDietary(d => ({ ...d, [key]: !d[key] }));
  }

  function addFavoriteMeal({ name, imageUrl }) {
    const id = name.toLowerCase().trim().replace(/\s+/g, "-") + "-" + Math.random().toString(36).slice(2,7);
    if (!name.trim()) return;
    if (favMeals.some(m => m.name.toLowerCase() === name.toLowerCase())) return;
    setFavMeals(prev => [{ id, name: name.trim(), imageUrl: (imageUrl || "").trim() }, ...prev]);
  }

  function removeFavoriteMeal(id) {
    setFavMeals(prev => prev.filter(m => m.id !== id));
  }

  function toggleCuisine(c) {
    setFavCuisines(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);
  }

  // -------------- UI --------------
  return (
    <div className="home-shell">
      <header className="home-header">
        <div className="home-title">
          <span className="logo">🍽️</span>
          <h1>Welcome</h1>
        </div>
        <p className="subtitle">Your cooking HQ — pick meals, set preferences, and jump back into your recent finds.</p>
      </header>

      <section className="panel">
        <div className="panel-head">
          <h2>Recently Viewed Meals</h2>
          <div className="panel-actions">
            {recent.length > 0 && (
              <button className="btn ghost" onClick={() => setRecent([])}>Clear</button>
            )}
          </div>
        </div>
        {recentSorted.length === 0 ? (
          <div className="empty">
            <EmptyCard/>
            <p>No recent meals yet. When you click a meal in Search, it will appear here.</p>
            <code>window.__pushRecentMeal({"{"} id, name, imageUrl {"}"})</code>
          </div>
        ) : (
          <div className="card-grid">
            {recentSorted.slice(0, 12).map(m => (
              <article className="card meal" key={(m.id || m.name) + String(m.clickedAt)}>
                <div className="card-media">
                  {m.imageUrl ? (
                    <img src={m.imageUrl} alt={m.name} />
                  ) : (
                    <div className="placeholder">🍽️</div>
                  )}
                </div>
                <div className="card-body">
                  <h3 className="card-title">{m.name}</h3>
                  <time className="muted">{m.clickedAt ? new Date(m.clickedAt).toLocaleString() : ""}</time>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Dietary Restrictions</h2>
        </div>
        <div className="dietary-grid">
          {Object.keys(DEFAULT_DIETARY).map((key) => (
            <label key={key} className={`diet-chip ${dietary[key] ? "on" : ""}`}>
              <input type="checkbox" checked={!!dietary[key]} onChange={() => toggleDietary(key)} />
              <span className="name">{key.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase())}</span>
            </label>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Favorite Meals</h2>
        </div>
        <AddFavoriteMeal onAdd={addFavoriteMeal} />
        {favMeals.length === 0 ? (
          <div className="empty"><p>No favorites yet. Add some above!</p></div>
        ) : (
          <div className="card-grid">
            {favMeals.map(m => (
              <article className="card meal" key={m.id}>
                <div className="card-media">
                  {m.imageUrl ? <img src={m.imageUrl} alt={m.name}/> : <div className="placeholder">⭐</div>}
                </div>
                <div className="card-body">
                  <h3 className="card-title">{m.name}</h3>
                </div>
                <div className="card-actions">
                  <button className="btn danger" onClick={() => removeFavoriteMeal(m.id)}>Remove</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Favorite Cuisines</h2>
        </div>
        <div className="cuisine-cloud">
          {ALL_CUISINES.map(c => (
            <button
              key={c}
              className={`chip ${favCuisines.includes(c) ? "selected" : ""}`}
              onClick={() => toggleCuisine(c)}
            >
              {c[0].toUpperCase() + c.slice(1)}
            </button>
          ))}
        </div>
      </section>

      <footer className="home-footer">
        <small className="muted">Tip: From your Search page, call <code>window.__pushRecentMeal({"{"} id, name, imageUrl {"}"})</code> when a user opens a meal.</small>
      </footer>
    </div>
  );
}

function AddFavoriteMeal({ onAdd }) {
  const nameRef = useRef(null);
  const imgRef = useRef(null);

  function add() {
    onAdd({ name: nameRef.current?.value || "", imageUrl: imgRef.current?.value || "" });
    if (nameRef.current) nameRef.current.value = "";
    if (imgRef.current) imgRef.current.value = "";
    nameRef.current?.focus();
  }

  return (
    <div className="add-fav-row">
      <input ref={nameRef} type="text" placeholder="Meal name (e.g., Chicken Tikka)"/>
      <input ref={imgRef} type="url" placeholder="Image URL (optional)"/>
      <button className="btn primary" onClick={add}>Add</button>
    </div>
  );
}

function EmptyCard() {
  return (
    <svg width="110" height="72" viewBox="0 0 110 72" role="img" aria-label="Empty">
      <rect x="5" y="12" width="100" height="48" rx="8" fill="#eef2ff" stroke="#e5e7eb" />
      <rect x="16" y="22" width="78" height="8" rx="4" fill="#e5e7eb" />
      <rect x="16" y="38" width="58" height="8" rx="4" fill="#e5e7eb" />
    </svg>
  );
}


