import React, { useEffect, useMemo, useRef, useState } from "react";
import "../css/home.css";

// ---------------- LocalStorage Keys ----------------
const LS_DIETARY = "dietary-settings";
const LS_FAV_MEALS = "favorite-meals";
const LS_FAV_CUISINES = "favorite-cuisines";
const LS_SHOPPING_LIST = "shopping-list";

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

const ALL_CUISINES = [
  "american","italian","french","mexican","chinese","japanese","korean","thai",
  "indian","mediterranean","greek","spanish","vietnamese","lebanese","ethiopian",
  "german","brazilian","caribbean"
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
  const [dietary, setDietary] = useState(() => ({
    ...DEFAULT_DIETARY,
    ...loadLS(LS_DIETARY, {})
  }));
  const [favMeals, setFavMeals] = useState(() => loadLS(LS_FAV_MEALS, []));
  const [favCuisines, setFavCuisines] = useState(() => loadLS(LS_FAV_CUISINES, []));
  const [shoppingList, setShoppingList] = useState(() => loadLS(LS_SHOPPING_LIST, []));

  // Persist data
  useEffect(() => saveLS(LS_DIETARY, dietary), [dietary]);
  useEffect(() => saveLS(LS_FAV_MEALS, favMeals), [favMeals]);
  useEffect(() => saveLS(LS_FAV_CUISINES, favCuisines), [favCuisines]);
  useEffect(() => saveLS(LS_SHOPPING_LIST, shoppingList), [shoppingList]);

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

  // -------------- UI --------------
  return (
    <div className="home-shell">
      <header className="home-header">
        <div className="home-title">
          <span className="logo">🍽️</span>
          <h1>Welcome</h1>
        </div>
      </header>

      {/* What's for Dinner */}
      <section className="panel">
        <div className="panel-head">
          <h2>What's for Dinner</h2>
        </div>
        <div className="dinner-section">
          <p className="dinner-caption">Tonight’s Dinner Idea: Christmas Ham</p>
          <img 
            src="/meal_image.jpg" 
            alt="Tonight's Dinner" 
            className="dinner-image"
          />
        </div>
      </section>


      {/* Profile Summary */}
      <section className="panel">
        <div className="panel-head">
          <h2>Profile Summary</h2>
        </div>
        <ul className="profile-list">
          <li>Dishes Cooked: <strong>{favMeals.length}</strong></li>
          <li>Account Level: <strong>Beginner</strong></li>
          <li>Daily Challenge: <em>Make an Italian dish</em></li>
        </ul>
      </section>

      {/* Dietary Restrictions */}
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

      {/* Favorite Meals */}
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

      {/* Favorite Cuisines */}
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

      {/* Shopping List */}
      <section className="panel">
        <div className="panel-head">
          <h2>Shopping List</h2>
          {shoppingList.length > 0 && (
            <button className="btn ghost" onClick={clearShoppingList}>Clear</button>
          )}
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

// -------------- Components --------------
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
      <input ref={nameRef} type="text" placeholder="Meal name (e.g., Chicken Tikka)" />
      <input ref={imgRef} type="url" placeholder="Image URL (optional)" />
      <button className="btn primary" onClick={add}>Add</button>
    </div>
  );
}

function AddShoppingItem({ onAdd }) {
  const itemRef = useRef(null);

  function add() {
    onAdd(itemRef.current?.value || "");
    if (itemRef.current) itemRef.current.value = "";
    itemRef.current?.focus();
  }

  return (
    <div className="add-fav-row">
      <input ref={itemRef} type="text" placeholder="Add item (e.g., Tomatoes)" />
      <button className="btn primary" onClick={add}>Add</button>
    </div>
  );
}
