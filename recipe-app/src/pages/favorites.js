// src/pages/Favorites.jsx
import React, { useEffect, useState } from "react";
import { listFavorites } from "../data/favorites";

const S = {
  page: {
    maxWidth: 1100,
    margin: "0 auto",
    padding: "28px 16px",
    fontFamily:
      "Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
    color: "#0f172a",
  },
  h1: { fontSize: 28, fontWeight: 800, marginBottom: 16 },
  small: { fontSize: 13, color: "#64748b", marginBottom: 16 },
  row: { display: "flex", justifyContent: "space-between", marginBottom: 12 },
  btn: {
    border: "1px solid #cbd5e1",
    borderRadius: 999,
    padding: "6px 12px",
    fontSize: 13,
    background: "#ffffff",
    cursor: "pointer",
    fontWeight: 600,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: 16,
  },
  card: {
    border: "1px solid #e2e8f0",
    borderRadius: 16,
    padding: 16,
    background: "#ffffff",
  },
  img: {
    width: "100%",
    maxHeight: 220,
    objectFit: "cover",
    borderRadius: 12,
    marginBottom: 8,
  },
  title: { fontSize: 18, fontWeight: 700, marginBottom: 4 },
  badgeRow: { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 },
  badge: {
    fontSize: 11,
    padding: "3px 8px",
    borderRadius: 999,
    background: "#f1f5f9",
    color: "#475569",
    fontWeight: 600,
  },
  aiBadge: {
    fontSize: 11,
    padding: "3px 8px",
    borderRadius: 999,
    background: "#eef2ff",
    color: "#4f46e5",
    fontWeight: 700,
  },
  localBadge: {
    fontSize: 11,
    padding: "3px 8px",
    borderRadius: 999,
    background: "#ecfdf5",
    color: "#15803d",
    fontWeight: 700,
  },
  body: { fontSize: 13, color: "#475569", lineHeight: 1.4 },
  list: { margin: "6px 0 0 18px", padding: 0 },
  error: {
    border: "1px solid #fecaca",
    background: "#fef2f2",
    color: "#b91c1c",
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
};

export default function Favorites() {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  async function loadFavorites() {
    try {
      setLoading(true);
      setErr(null);
      const data = await listFavorites();
      setFavorites(data || []);
    } catch (e) {
      console.error("Error loading favorites:", e);
      setErr(e.message || "Failed to load favorites");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFavorites();
  }, []);

  return (
    <main style={S.page}>
      <div style={S.row}>
        <div>
          <h1 style={S.h1}>Favorites</h1>
          <div style={S.small}>
            Showing all favorited recipes (local DB + AI) with their generated
            images.
          </div>
        </div>
        <button style={S.btn} onClick={loadFavorites}>
          Refresh
        </button>
      </div>

      {err && <div style={S.error}>{err}</div>}

      {loading && <div style={S.small}>Loading favorites…</div>}

      {!loading && favorites.length === 0 && !err && (
        <div style={S.small}>No favorites yet. Go favorite something!</div>
      )}

      {!loading && favorites.length > 0 && (
        <div style={S.grid}>
          {favorites.map((fav) => {
            const isAi = fav.is_ai_recipe;
            const title =
              fav.name ||
              (isAi
                ? "AI recipe"
                : fav.recipe_id != null
                ? `Local recipe #${fav.recipe_id}`
                : "Recipe");

            // Ingredients can be strings or ingredient objects from AI
            let ingredientPreview = "";
            if (Array.isArray(fav.ingredients) && fav.ingredients.length) {
              const names = fav.ingredients.slice(0, 5).map((x) => {
                if (typeof x === "string") return x;
                return x.ingredient || "";
              });
              ingredientPreview = names.filter(Boolean).join(", ");
            }

            return (
              <article key={fav.id} style={S.card}>
                {fav.image_url && (
                  <img
                    src={fav.image_url}
                    alt={title}
                    style={S.img}
                    loading="lazy"
                  />
                )}

                <div style={S.title}>{title}</div>

                <div style={S.badgeRow}>
                  {isAi ? (
                    <span style={S.aiBadge}>AI recipe</span>
                  ) : (
                    <span style={S.localBadge}>Local recipe</span>
                  )}
                  {fav.recipe_id != null && (
                    <span style={S.badge}>recipe_id: {fav.recipe_id}</span>
                  )}
                  {fav.created_at && (
                    <span style={S.badge}>
                      favorited: {new Date(fav.created_at).toLocaleString()}
                    </span>
                  )}
                </div>

                <div style={S.body}>
                  {ingredientPreview && (
                    <>
                      <div>
                        <strong>Key ingredients:</strong>
                      </div>
                      <ul style={S.list}>
                        {ingredientPreview.split(", ").map((ing) => (
                          <li key={ing}>{ing}</li>
                        ))}
                      </ul>
                    </>
                  )}

                  {isAi && Array.isArray(fav.instructions) && (
                    <>
                      <div style={{ marginTop: 6 }}>
                        <strong>Steps (preview):</strong>
                      </div>
                      <ul style={S.list}>
                        {fav.instructions.slice(0, 2).map((step, idx) => (
                          <li key={idx}>{step}</li>
                        ))}
                      </ul>
                    </>
                  )}

                  {!isAi && fav.recipe_id != null && (
                    <div style={{ marginTop: 6 }}>
                      Full details come from your local database (
                      <code>recipes.id = {fav.recipe_id}</code>).
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
