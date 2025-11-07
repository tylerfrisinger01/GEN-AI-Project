// // src/pages/Search.jsx
// import React, { useEffect, useMemo, useRef, useState } from "react";

// /**
//  * Local Recipe Search (SQLite FTS + Express)
//  * - Server-side paging (/api/search?page=&page_size=)
//  * - Facets: cuisine & diet (/api/facets)
//  * - Filters: min_rating, max_minutes; Sort: relevance/rating/minutes/popularity
//  * - Debounced input, sane loading states, error surfaces
//  * - Per result: ingredients list + instructions (detail drawer via /api/recipes/:id)
//  * - No external UI libs; neat inline styles
//  */

// // ====== CONFIG ======
// const API_BASE = "http://localhost:4000/api";
// const DEFAULT_PAGE_SIZE = 10;
// const PAGE_SIZES = [5, 10, 20, 50];

// // ====== styles ======
// const S = {
//   page: { maxWidth: 1100, margin: "0 auto", padding: "28px 16px", fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif", color: "#0f172a" },
//   h1: { fontSize: 28, fontWeight: 800, textAlign: "center", margin: "0 0 20px" },

//   inputWrap: { border: "1px solid #e2e8f0", borderRadius: 16, background: "#fff", padding: 12, marginBottom: 16 },
//   inputRow: { display: "flex", gap: 10, alignItems: "center", padding: 10, border: "1px solid #e2e8f0", borderRadius: 12, background: "#fff" },
//   textInput: { border: "none", outline: "none", flex: 1, fontSize: 16 },

//   layout: { display: "grid", gridTemplateColumns: "280px 1fr", gap: 16 },
//   card: { border: "1px solid #e2e8f0", borderRadius: 16, background: "#fff", padding: 16 },
//   label: { fontSize: 12, color: "#475569", marginBottom: 8, display: "block", fontWeight: 700, letterSpacing: 0.2 },
//   chips: { display: "flex", gap: 8, flexWrap: "wrap" },
//   chip: (active) => ({
//     fontSize: 12, padding: "6px 10px", borderRadius: 999,
//     border: "1px solid " + (active ? "#0f172a" : "#cbd5e1"),
//     background: active ? "#0f172a" : "#fff", color: active ? "#fff" : "#0f172a",
//     cursor: "pointer", fontWeight: 600
//   }),
//   select: { padding: "8px 12px", borderRadius: 10, border: "1px solid #cbd5e1", background: "#fff", fontSize: 13 },

//   list: { display: "grid", gap: 12 },
//   rCard: { border: "1px solid #e2e8f0", borderRadius: 16, background: "#fff", padding: 16 },
//   title: { fontSize: 18, fontWeight: 800, marginBottom: 6 },
//   meta: { display: "flex", gap: 12, color: "#64748b", fontSize: 13, alignItems: "center", flexWrap: "wrap" },
//   tag: { background: "#f1f5f9", color: "#334155", padding: "4px 10px", borderRadius: 999, fontSize: 12, fontWeight: 500 },
//   details: { marginTop: 8, color: "#334155", lineHeight: 1.5, whiteSpace: "pre-wrap" },

//   row: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 10 },
//   small: { color: "#64748b", fontSize: 12 },

//   pager: { display: "flex", gap: 8, justifyContent: "center", marginTop: 12 },
//   btn: { border: "1px solid #cbd5e1", borderRadius: 10, background: "#fff", padding: "8px 12px", fontSize: 13, cursor: "pointer", fontWeight: 600 },
//   btnPri: { border: "1px solid #0f172a", borderRadius: 10, background: "#0f172a", color: "#fff", padding: "10px 14px", fontSize: 14, cursor: "pointer", fontWeight: 700 },

//   error: { border: "1px solid #fecaca", background: "#fef2f2", color: "#b91c1c", padding: 12, borderRadius: 12 },
//   skel: { border: "1px solid #e2e8f0", borderRadius: 16, background: "#fff" },
//   skelBar: { height: 14, background: "linear-gradient(90deg,#f1f5f9, #e5e7eb, #f1f5f9)", borderRadius: 6, animation: "pulse 1.2s infinite" },

//   drawer: { marginTop: 12, borderTop: "1px solid #e2e8f0", paddingTop: 12 },
//   subTitle: { fontWeight: 800, margin: "10px 0 6px" },
//   actionRow: { display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 },
// };

// // tiny inline animation
// if (typeof document !== "undefined" && !document.getElementById("searchPulseKeyframes")) {
//   const styleEl = document.createElement("style");
//   styleEl.id = "searchPulseKeyframes";
//   styleEl.textContent = `@keyframes pulse { 0%{opacity:.8} 50%{opacity:.4} 100%{opacity:.8} }`;
//   document.head.appendChild(styleEl);
// }

// // ====== icons ======
// function MagnifierIcon() {
//   return (
//     <svg viewBox="0 0 24 24" style={{ width: 16, height: 16, display: "inline-block", verticalAlign: "-3px" }} aria-hidden>
//       <path fill="#64748b" d="M21 20.3 16.7 16a7.5 7.5 0 1 0-1 1L20.3 21 21 20.3zM10.5 17a6.5 6.5 0 1 1 0-13 6.5 6.5 0 0 1 0 13z"/>
//     </svg>
//   );
// }
// function ClockIcon() {
//   return (
//     <svg viewBox="0 0 24 24" style={{ width: 16, height: 16, display: "inline-block", verticalAlign: "-3px" }} aria-hidden>
//       <path fill="#64748b" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm.75 5.5a.75.75 0 0 0-1.5 0V12c0 .41.34.75.75.75H15a.75.75 0 0 0 0-1.5h-2.25V7.5z"/>
//     </svg>
//   );
// }

// // ====== helpers ======
// function useDebounced(value, ms) {
//   const [v, setV] = useState(value);
//   useEffect(() => { const id = setTimeout(() => setV(value), ms); return () => clearTimeout(id); }, [value, ms]);
//   return v;
// }
// function highlight(text, query) {
//   if (!query) return text;
//   const safe = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
//   const re = new RegExp(`(${safe})`, "ig");
//   const parts = String(text || "").split(re);
//   return parts.map((p, i) =>
//     i % 2 ? <mark key={i} style={{ background: "#fde68a", padding: "0 3px", borderRadius: 3 }}>{p}</mark> : <React.Fragment key={i}>{p}</React.Fragment>
//   );
// }
// async function fetchJSON(url) {
//   const res = await fetch(url);
//   if (!res.ok) throw new Error(await res.text());
//   return res.json();
// }
// function copy(text) {
//   try { navigator.clipboard.writeText(text); } catch {}
// }

// // ====== API wrappers ======
// async function apiSearch({ q, page, pageSize, cuisine, diet, minRating, maxMinutes, sort }) {
//   const u = new URL(`${API_BASE}/search`);
//   if (q) u.searchParams.set("q", q);
//   if (page) u.searchParams.set("page", page);
//   if (pageSize) u.searchParams.set("page_size", pageSize);
//   if (cuisine) u.searchParams.set("cuisine", cuisine);
//   if (diet) u.searchParams.set("diet", diet);
//   if (minRating) u.searchParams.set("min_rating", minRating);
//   if (maxMinutes) u.searchParams.set("max_minutes", maxMinutes);
//   if (sort) u.searchParams.set("sort", sort);
//   return fetchJSON(u.toString());
// }
// async function apiFacets() {
//   return fetchJSON(`${API_BASE}/facets`);
// }
// async function apiRecipe(id) {
//   return fetchJSON(`${API_BASE}/recipes/${id}`);
// }

// // ====== Component ======
// export default function Search() {
//   // query, filters, sort
//   const [q, setQ] = useState("");
//   const dq = useDebounced(q, 250);

//   const [page, setPage] = useState(1);
//   const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
//   const [sort, setSort] = useState("relevance");
//   const [cuisine, setCuisine] = useState("");
//   const [diet, setDiet] = useState("");
//   const [minRating, setMinRating] = useState(0);
//   const [maxMinutes, setMaxMinutes] = useState(0);

//   // data
//   const [facets, setFacets] = useState({ cuisines: [], diets: [] });
//   const [results, setResults] = useState({ page: 1, page_size: pageSize, total: 0, pages: 0, items: [] });
//   const [loading, setLoading] = useState(false);
//   const [err, setErr] = useState(null);

//   // details cache
//   const [openId, setOpenId] = useState(null);
//   const [detail, setDetail] = useState(null);
//   const detailsCacheRef = useRef(new Map()); // id -> recipe detail

//   // load facets once
//   useEffect(() => { apiFacets().then(setFacets).catch(() => {}); }, []);

//   // search whenever inputs change
//   useEffect(() => {
//     if (!dq) { setResults({ page: 1, page_size: pageSize, total: 0, pages: 0, items: [] }); setErr(null); return; }
//     setLoading(true);
//     setErr(null);
//     apiSearch({ q: dq, page, pageSize, cuisine, diet, minRating, maxMinutes, sort })
//       .then((data) => setResults(data))
//       .catch((e) => setErr(String(e.message || e)))
//       .finally(() => setLoading(false));
//   }, [dq, page, pageSize, cuisine, diet, minRating, maxMinutes, sort]);

//   // reset page when search inputs (except page/pageSize) change
//   useEffect(() => { setPage(1); }, [dq, cuisine, diet, minRating, maxMinutes, sort]);

//   // open detail drawer and fetch once (cache subsequent opens)
//   async function openDetails(id) {
//     setOpenId((cur) => (cur === id ? null : id));
//     if (!id) { setDetail(null); return; }
//     if (detailsCacheRef.current.has(id)) { setDetail(detailsCacheRef.current.get(id)); return; }
//     const row = await apiRecipe(id).catch(() => null);
//     if (row) { detailsCacheRef.current.set(id, row); setDetail(row); }
//   }

//   // derived
//   const infoLine = useMemo(() => {
//     if (!dq) return "Type a query to begin.";
//     const { page: p, pages, total } = results;
//     return `Showing page ${p} of ${pages || 0}, total ${total} results for “${dq}”.`;
//   }, [dq, results]);

//   return (
//     <main style={S.page}>
//       <h1 style={S.h1}>Local Recipe Search</h1>

//       {/* Query + global options */}
//       <div style={S.inputWrap}>
//         <div style={S.inputRow}>
//           <MagnifierIcon />
//           <input
//             value={q}
//             onChange={(e) => setQ(e.target.value)}
//             placeholder="Search recipes (e.g., chicken pasta)"
//             style={S.textInput}
//           />
//           <button style={S.btn} onClick={() => setQ("")}>Clear</button>
//         </div>

//         <div style={S.row}>
//           <span style={S.small}>Sort</span>
//           <select style={S.select} value={sort} onChange={(e) => setSort(e.target.value)}>
//             <option value="relevance">Relevance</option>
//             <option value="rating">Rating</option>
//             <option value="minutes-asc">Time: Low → High</option>
//             <option value="minutes-desc">Time: High → Low</option>
//             <option value="popularity">Popularity</option>
//           </select>

//           <span style={S.small}>Per page</span>
//           <select style={S.select} value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
//             {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
//           </select>
//         </div>
//       </div>

//       <div style={S.layout}>
//         {/* Facets & filters */}
//         <aside style={S.card}>
//           <div style={{ marginBottom: 14 }}>
//             <span style={S.label}>Cuisine</span>
//             <div style={S.chips}>
//               <button style={S.chip(!cuisine)} onClick={() => setCuisine("")}>All</button>
//               {facets.cuisines.map((c) => (
//                 <button key={c.name} style={S.chip(cuisine === c.name)} onClick={() => setCuisine(c.name)}>
//                   {c.name} ({c.count})
//                 </button>
//               ))}
//             </div>
//           </div>

//           <div style={{ marginBottom: 14 }}>
//             <span style={S.label}>Diet</span>
//             <div style={S.chips}>
//               <button style={S.chip(!diet)} onClick={() => setDiet("")}>All</button>
//               {facets.diets.map((d) => (
//                 <button key={d.name} style={S.chip(diet === d.name)} onClick={() => setDiet(d.name)}>
//                   {d.name} ({d.count})
//                 </button>
//               ))}
//             </div>
//           </div>

//           <div style={{ marginBottom: 14 }}>
//             <label style={S.label}>Min rating</label>
//             <input type="range" min={0} max={5} step={0.5} value={minRating}
//                    onChange={(e) => setMinRating(Number(e.target.value))} style={{ width: "100%" }} />
//             <div style={{ ...S.small, marginTop: 6 }}>{minRating.toFixed(1)}</div>
//           </div>

//           <div>
//             <label style={S.label}>Max minutes</label>
//             <input type="range" min={0} max={240} step={5} value={maxMinutes}
//                    onChange={(e) => setMaxMinutes(Number(e.target.value))} style={{ width: "100%" }} />
//             <div style={{ ...S.small, marginTop: 6 }}>{maxMinutes || "No limit"}</div>
//           </div>
//         </aside>

//         {/* Results */}
//         <section>
//           <div style={{ ...S.row, justifyContent: "space-between", marginTop: 0 }}>
//             <div style={S.small}>{infoLine}</div>
//             <div>
//               <button
//                 style={{ ...S.btn, marginRight: 6, opacity: results.page <= 1 ? 0.6 : 1 }}
//                 disabled={results.page <= 1 || loading}
//                 onClick={() => setPage((p) => Math.max(1, p - 1))}
//               >
//                 ← Prev
//               </button>
//               <button
//                 style={S.btnPri}
//                 disabled={loading || results.page >= results.pages}
//                 onClick={() => setPage((p) => p + 1)}
//               >
//                 Next →
//               </button>
//             </div>
//           </div>

//           {err && <div style={S.error}>{err}</div>}

//           <div style={S.list}>
//             {/* Loading skeleton */}
//             {loading && (
//               <>
//                 {Array.from({ length: 3 }).map((_, i) => (
//                   <div key={i} style={{ ...S.skel, padding: 16 }}>
//                     <div style={{ ...S.skelBar, width: "60%" }} />
//                     <div style={{ height: 8 }} />
//                     <div style={{ ...S.skelBar, width: "35%" }} />
//                     <div style={{ height: 8 }} />
//                     <div style={{ ...S.skelBar, width: "80%" }} />
//                   </div>
//                 ))}
//               </>
//             )}

//             {!loading && dq && results.items.length === 0 && !err && (
//               <div style={{ ...S.card, textAlign: "center" }}>No results. Try different keywords or filters.</div>
//             )}

//             {results.items.map((r) => (
//               <article key={r.id} style={S.rCard}>
//                 <div style={S.title} onClick={() => openDetails(r.id)}>
//                   {highlight(r.name, dq)}
//                 </div>
//                 <div style={S.meta}>
//                   <span><ClockIcon /> {r.minutes}m</span>
//                   {r.rating != null && <span>★ {r.rating}</span>}
//                   {!!r.popularity && <span>❤ {r.popularity}</span>}
//                   {r.cuisine && <span>{r.cuisine}</span>}
//                   {r.diet && <span>{r.diet}</span>}
//                 </div>

//                 {!!r.ingredients?.length && (
//                   <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
//                     {r.ingredients.slice(0, 12).map((ing) => (
//                       <span key={ing} style={S.tag}>{ing}</span>
//                     ))}
//                   </div>
//                 )}

//                 {r.description && (
//                   <p style={{ ...S.details, marginTop: 8 }}>
//                     {highlight(r.description.slice(0, 240), dq)}{r.description.length > 240 ? "…" : ""}
//                   </p>
//                 )}

//                 {/* Actions */}
//                 <div style={S.actionRow}>
//                   <button style={S.btn} onClick={() => openDetails(r.id)}>
//                     {openId === r.id ? "Hide details" : "Show full ingredients & instructions"}
//                   </button>
//                   {!!r.ingredients?.length && (
//                     <button
//                       style={S.btn}
//                       onClick={() => copy(r.ingredients.join("\n"))}
//                       title="Copy ingredients to clipboard"
//                     >
//                       Copy ingredients
//                     </button>
//                   )}
//                 </div>

//                 {/* Detail drawer (ingredients + instructions from /api/recipes/:id) */}
//                 {openId === r.id && (
//                   <div style={S.drawer}>
//                     {!detail || detail.id !== r.id ? (
//                       <div style={{ color: "#64748b" }}>Loading details…</div>
//                     ) : (
//                       <>
//                         {!!detail.ingredients?.length && (
//                           <>
//                             <div style={S.subTitle}>Ingredients</div>
//                             <ul>
//                               {detail.ingredients.map((x, i) => <li key={i}>{x}</li>)}
//                             </ul>
//                           </>
//                         )}
//                         {detail.steps && (
//                           <>
//                             <div style={S.subTitle}>Instructions</div>
//                             <p style={S.details}>{detail.steps}</p>
//                           </>
//                         )}
//                         <div style={S.actionRow}>
//                           <button style={S.btn} onClick={() => window.print()}>Print</button>
//                           <button style={S.btn} onClick={() => { setOpenId(null); setDetail(null); }}>Close</button>
//                         </div>
//                       </>
//                     )}
//                   </div>
//                 )}
//               </article>
//             ))}
//           </div>
//         </section>
//       </div>
//     </main>
//   );
// }






// src/pages/Search.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * Local Recipe Search
 * - Popover filters (Diet, Cuisine, Ingredients) + inline pills
 * - Sidebar removed
 * - NOW: persists Diet/Cuisine/Ingredients to localStorage
 */

const API_BASE = "http://localhost:4000/api";
const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZES = [5, 10, 20, 50];
const LS_KEY = "searchFilters.v1"; // <- localStorage key

const S = {
  page: { maxWidth: 1100, margin: "0 auto", padding: "28px 16px", fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif", color: "#0f172a" },
  h1: { fontSize: 28, fontWeight: 800, textAlign: "center", margin: "0 0 20px" },

  inputWrap: { position: "relative", border: "1px solid #e2e8f0", borderRadius: 16, background: "#fff", padding: 12, marginBottom: 16 },
  inputRow: { display: "flex", gap: 10, alignItems: "center", padding: 10, border: "1px solid #e2e8f0", borderRadius: 12, background: "#fff", flexWrap: "wrap" },
  pillsWrap: { display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", maxWidth: "100%" },
  pill: { display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 8px", borderRadius: 999, fontSize: 12, fontWeight: 600, background: "#0f172a", color: "#fff", border: "1px solid #0f172a" },
  pillBtn: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 18, height: 18, borderRadius: 999, border: "1px solid #cbd5e1", background: "#fff", color: "#0f172a", cursor: "pointer", fontSize: 12, lineHeight: "16px", padding: 0 },

  textInput: { border: "none", outline: "none", flex: 1, minWidth: 160, fontSize: 16 },

  menu: { position: "absolute", top: "100%", left: 12, right: 12, marginTop: 8, border: "1px solid #e2e8f0", borderRadius: 16, background: "#fff", boxShadow: "0 10px 30px rgba(15,23,42,0.08)", zIndex: 20, padding: 12 },
  menuRow: { display: "grid", gridTemplateColumns: "110px 1fr", gap: 12, alignItems: "start", padding: "8px 0" },
  menuTitle: { fontSize: 12, fontWeight: 800, color: "#475569", paddingTop: 6 },
  menuChips: { display: "flex", gap: 8, flexWrap: "wrap", maxHeight: 140, overflow: "auto" },
  inputSmall: { width: "100%", padding: "8px 10px", borderRadius: 10, border: "1px solid #cbd5e1", fontSize: 13 },

  layout: { display: "grid", gridTemplateColumns: "1fr", gap: 16 },
  card: { border: "1px solid #e2e8f0", borderRadius: 16, background: "#fff", padding: 16 },
  chip: (active) => ({
    fontSize: 12, padding: "6px 10px", borderRadius: 999,
    border: "1px solid " + (active ? "#0f172a" : "#cbd5e1"),
    background: active ? "#0f172a" : "#fff", color: active ? "#fff" : "#0f172a",
    cursor: "pointer", fontWeight: 600
  }),
  select: { padding: "8px 12px", borderRadius: 10, border: "1px solid #cbd5e1", background: "#fff", fontSize: 13 },

  list: { display: "grid", gap: 12 },
  rCard: { border: "1px solid #e2e8f0", borderRadius: 16, background: "#fff", padding: 16 },
  title: { fontSize: 18, fontWeight: 800, marginBottom: 6 },
  meta: { display: "flex", gap: 12, color: "#64748b", fontSize: 13, alignItems: "center", flexWrap: "wrap" },
  tag: { background: "#f1f5f9", color: "#334155", padding: "4px 10px", borderRadius: 999, fontSize: 12, fontWeight: 500 },
  details: { marginTop: 8, color: "#334155", lineHeight: 1.5, whiteSpace: "pre-wrap" },

  row: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 10 },
  small: { color: "#64748b", fontSize: 12 },

  pager: { display: "flex", gap: 8, justifyContent: "center", marginTop: 12 },
  btn: { border: "1px solid #cbd5e1", borderRadius: 10, background: "#fff", padding: "8px 12px", fontSize: 13, cursor: "pointer", fontWeight: 600 },
  btnPri: { border: "1px solid #0f172a", borderRadius: 10, background: "#0f172a", color: "#fff", padding: "10px 14px", fontSize: 14, cursor: "pointer", fontWeight: 700 },

  error: { border: "1px solid #fecaca", background: "#fef2f2", color: "#b91c1c", padding: 12, borderRadius: 12 },
  skel: { border: "1px solid #e2e8f0", borderRadius: 16, background: "#fff" },
  skelBar: { height: 14, background: "linear-gradient(90deg,#f1f5f9, #e5e7eb, #f1f5f9)", borderRadius: 6, animation: "pulse 1.2s infinite" },

  drawer: { marginTop: 12, borderTop: "1px solid #e2e8f0", paddingTop: 12 },
  subTitle: { fontWeight: 800, margin: "10px 0 6px" },
  actionRow: { display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 },
};

if (typeof document !== "undefined" && !document.getElementById("searchPulseKeyframes")) {
  const style = document.createElement("style");
  style.id = "searchPulseKeyframes";
  style.textContent = `@keyframes pulse { 0%{opacity:.8} 50%{opacity:.4} 100%{opacity:.8} }`;
  document.head.appendChild(style);
}

function MagnifierIcon() {
  return (
    <svg viewBox="0 0 24 24" style={{ width: 16, height: 16, display: "inline-block", verticalAlign: "-3px" }} aria-hidden>
      <path fill="#64748b" d="M21 20.3 16.7 16a7.5 7.5 0 1 0-1 1L20.3 21 21 20.3zM10.5 17a6.5 6.5 0 1 1 0-13 6.5 6.5 0 0 1 0 13z"/>
    </svg>
  );
}
function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" style={{ width: 16, height: 16, display: "inline-block", verticalAlign: "-3px" }} aria-hidden>
      <path fill="#64748b" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm.75 5.5a.75.75 0 0 0-1.5 0V12c0 .41.34.75.75.75H15a.75.75 0 0 0 0-1.5h-2.25V7.5z"/>
    </svg>
  );
}

function useDebounced(value, ms) {
  const [v, setV] = useState(value);
  useEffect(() => { const id = setTimeout(() => setV(value), ms); return () => clearTimeout(id); }, [value, ms]);
  return v;
}
function highlight(text, query) {
  if (!query) return text;
  const safe = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(${safe})`, "ig");
  const parts = String(text || "").split(re);
  return parts.map((p, i) =>
    i % 2 ? <mark key={i} style={{ background: "#fde68a", padding: "0 3px", borderRadius: 3 }}>{p}</mark> : <React.Fragment key={i}>{p}</React.Fragment>
  );
}
async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
function copy(text) {
  try { navigator.clipboard.writeText(text); } catch {}
}

async function apiSearch({ q, page, pageSize, cuisine, diet, minRating, maxMinutes, sort, ingredientsCSV }) {
  const u = new URL(`${API_BASE}/search`);
  if (q) u.searchParams.set("q", q);
  if (page) u.searchParams.set("page", page);
  if (pageSize) u.searchParams.set("page_size", pageSize);
  if (cuisine) u.searchParams.set("cuisine", cuisine);
  if (diet) u.searchParams.set("diet", diet);
  if (minRating) u.searchParams.set("min_rating", minRating);
  if (maxMinutes) u.searchParams.set("max_minutes", maxMinutes);
  if (sort) u.searchParams.set("sort", sort);
  if (ingredientsCSV) u.searchParams.set("ingredients", ingredientsCSV);
  return fetchJSON(u.toString());
}
async function apiFacets() { return fetchJSON(`${API_BASE}/facets`); }
async function apiRecipe(id) { return fetchJSON(`${API_BASE}/recipes/${id}`); }

export default function Search() {
  const [q, setQ] = useState("");
  const dq = useDebounced(q, 250);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [sort, setSort] = useState("relevance");

  // persisted filters
  const [cuisine, setCuisine] = useState("");
  const [diet, setDiet] = useState("");
  const [pickedIngredients, setPickedIngredients] = useState([]);

  // not persisted (tuneable)
  const [minRating, setMinRating] = useState(0);
  const [maxMinutes, setMaxMinutes] = useState(0);

  const [ingredientInput, setIngredientInput] = useState("");
  const ingredientsCSV = useMemo(
    () => (pickedIngredients.length ? pickedIngredients.join(",") : ""),
    [pickedIngredients]
  );

  const [facets, setFacets] = useState({ cuisines: [], diets: [], ingredients: [] });
  const [results, setResults] = useState({ page: 1, page_size: pageSize, total: 0, pages: 0, items: [] });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  const [openId, setOpenId] = useState(null);
  const [detail, setDetail] = useState(null);
  const detailsCacheRef = useRef(new Map());

  const [menuOpen, setMenuOpen] = useState(false);
  const inputRef = useRef(null);
  const menuRef = useRef(null);

  // ---- LOCALSTORAGE: load once on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (typeof saved?.diet === "string") setDiet(saved.diet);
        if (typeof saved?.cuisine === "string") setCuisine(saved.cuisine);
        if (Array.isArray(saved?.ingredients)) setPickedIngredients(saved.ingredients.filter(Boolean));
      }
    } catch {}
  }, []);

  // ---- LOCALSTORAGE: save whenever filters change
  useEffect(() => {
    try {
      const payload = JSON.stringify({
        diet,
        cuisine,
        ingredients: pickedIngredients,
      });
      localStorage.setItem(LS_KEY, payload);
    } catch {}
  }, [diet, cuisine, pickedIngredients]);

  // load facets once
  useEffect(() => {
    apiFacets()
      .then((f) => setFacets({ cuisines: f.cuisines || [], diets: f.diets || [], ingredients: f.ingredients || [] }))
      .catch(() => {});
  }, []);

  // search whenever inputs change
  useEffect(() => {
    if (!dq) { setResults({ page: 1, page_size: pageSize, total: 0, pages: 0, items: [] }); setErr(null); return; }
    setLoading(true);
    setErr(null);
    apiSearch({ q: dq, page, pageSize, cuisine, diet, minRating, maxMinutes, sort, ingredientsCSV })
      .then((data) => setResults(data))
      .catch((e) => setErr(String(e.message || e)))
      .finally(() => setLoading(false));
  }, [dq, page, pageSize, cuisine, diet, minRating, maxMinutes, sort, ingredientsCSV]);

  // reset page when search inputs (except page/pageSize) change
  useEffect(() => { setPage(1); }, [dq, cuisine, diet, minRating, maxMinutes, sort, ingredientsCSV]);

  async function openDetails(id) {
    setOpenId((cur) => (cur === id ? null : id));
    if (!id) { setDetail(null); return; }
    if (detailsCacheRef.current.has(id)) { setDetail(detailsCacheRef.current.get(id)); return; }
    const row = await apiRecipe(id).catch(() => null);
    if (row) { detailsCacheRef.current.set(id, row); setDetail(row); }
  }

  // ingredients suggestions (facets preferred; else derive from results)
  const ingredientSuggestions = useMemo(() => {
    if (facets.ingredients?.length) {
      return facets.ingredients
        .map((x) => ({ name: x.name, count: x.count || 0 }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 200);
    }
    const counts = new Map();
    for (const it of results.items || []) {
      for (const ing of it.ingredients || []) {
        const k = String(ing).trim();
        if (!k) continue;
        counts.set(k, (counts.get(k) || 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 200);
  }, [facets.ingredients, results.items]);

  const filteredSuggestions = useMemo(() => {
    const q = ingredientInput.trim().toLowerCase();
    const base = ingredientSuggestions.filter(s => !pickedIngredients.includes(s.name));
    if (!q) return base.slice(0, 30);
    return base.filter(s => s.name.toLowerCase().includes(q)).slice(0, 30);
  }, [ingredientInput, ingredientSuggestions, pickedIngredients]);

  const addIngredient = (raw) => {
    const name = String(raw || "").trim();
    if (!name) return;
    setPickedIngredients((xs) => (xs.includes(name) ? xs : [...xs, name]));
    setIngredientInput("");
  };
  const toggleIngredient = (name) =>
    setPickedIngredients((xs) => (xs.includes(name) ? xs.filter((x) => x !== name) : [...xs, name]));

  const pills = useMemo(() => {
    const xs = [];
    if (diet) xs.push({ key: `diet:${diet}`, label: `Diet: ${diet}`, onRemove: () => setDiet("") });
    if (cuisine) xs.push({ key: `cuisine:${cuisine}`, label: `Cuisine: ${cuisine}`, onRemove: () => setCuisine("") });
    pickedIngredients.forEach((n) => {
      xs.push({ key: `ing:${n}`, label: n, onRemove: () => setPickedIngredients((arr) => arr.filter((x) => x !== n)) });
    });
    return xs;
  }, [diet, cuisine, pickedIngredients]);

  const infoLine = useMemo(() => {
    if (!dq) return "Type a query to begin.";
    const { page: p, pages, total } = results;
    return `Showing page ${p} of ${pages || 0}, total ${total} results for “${dq}”.`;
  }, [dq, results]);

  // popover close handlers
  useEffect(() => {
    function onDocClick(e) {
      if (!menuOpen) return;
      const t = e.target;
      if (menuRef.current && !menuRef.current.contains(t) && inputRef.current && !inputRef.current.contains(t)) {
        setMenuOpen(false);
      }
    }
    function onEsc(e) { if (e.key === "Escape") setMenuOpen(false); }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [menuOpen]);

  return (
    <main style={S.page}>
      <h1 style={S.h1}>Local Recipe Search</h1>

      {/* Query + pills + menu */}
      <div style={S.inputWrap}>
        <div style={S.inputRow} ref={inputRef} onClick={() => setMenuOpen(true)}>
          <MagnifierIcon />

          {/* Active pills INSIDE bar */}
          {pills.length > 0 && (
            <div style={S.pillsWrap}>
              {pills.map((p) => (
                <span key={p.key} style={S.pill}>
                  {p.label}
                  <button
                    style={S.pillBtn}
                    onClick={(e) => { e.stopPropagation(); p.onRemove(); }}
                    aria-label={`Remove ${p.label}`}
                    title="Remove"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={pills.length ? "Refine search…" : "Search recipes (e.g., chicken pasta)"}
            style={S.textInput}
            onFocus={() => setMenuOpen(true)}
          />
          <button style={S.btn} onClick={() => setQ("")}>Clear</button>
        </div>

        {/* Popover */}
        {menuOpen && (
          <div style={S.menu} ref={menuRef} role="dialog" aria-label="Quick Filters">
            {/* Diet */}
            <div style={S.menuRow}>
              <div style={S.menuTitle}>Diet</div>
              <div style={S.menuChips}>
                <button style={S.chip(!diet)} onClick={() => setDiet("")}>All</button>
                {facets.diets.map((d) => (
                  <button key={d.name} style={S.chip(diet === d.name)} onClick={() => setDiet(d.name)}>
                    {d.name} {d.count ? `(${d.count})` : ""}
                  </button>
                ))}
              </div>
            </div>

            {/* Cuisine */}
            <div style={S.menuRow}>
              <div style={S.menuTitle}>Cuisine</div>
              <div style={S.menuChips}>
                <button style={S.chip(!cuisine)} onClick={() => setCuisine("")}>All</button>
                {facets.cuisines.map((c) => (
                  <button key={c.name} style={S.chip(cuisine === c.name)} onClick={() => setCuisine(c.name)}>
                    {c.name} {c.count ? `(${c.count})` : ""}
                  </button>
                ))}
              </div>
            </div>

            {/* Ingredients */}
            <div style={S.menuRow}>
              <div style={S.menuTitle}>Ingredients</div>
              <div>
                <input
                  value={ingredientInput}
                  onChange={(e) => setIngredientInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === ",") {
                      e.preventDefault();
                      const pieces = ingredientInput.split(",").map(s => s.trim()).filter(Boolean);
                      if (pieces.length) {
                        setPickedIngredients((xs) => {
                          const set = new Set(xs);
                          pieces.forEach(p => set.add(p));
                          return Array.from(set);
                        });
                        setIngredientInput("");
                      }
                    }
                  }}
                  placeholder="Type to add (press Enter)…"
                  style={S.inputSmall}
                />
                <div style={{ ...S.menuChips, marginTop: 8 }}>
                  {filteredSuggestions.length === 0 ? (
                    <span style={{ fontSize: 12, color: "#64748b" }}>No suggestions.</span>
                  ) : (
                    filteredSuggestions.map((s) => {
                      const active = pickedIngredients.includes(s.name);
                      return (
                        <button
                          key={s.name}
                          style={S.chip(active)}
                          onClick={() => toggleIngredient(s.name)}
                          title={active ? "Remove" : "Add"}
                        >
                          {s.name} {typeof s.count === "number" && s.count > 0 ? `(${s.count})` : ""}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
              <button
                style={S.btn}
                onClick={() => {
                  setDiet(""); setCuisine(""); setPickedIngredients([]); setIngredientInput("");
                  try { localStorage.removeItem(LS_KEY); } catch {}
                }}
                title="Clear selections"
              >
                Clear
              </button>
              <button
                style={S.btnPri}
                onClick={() => setMenuOpen(false)}
                title="Apply filters"
              >
                Apply
              </button>
            </div>
          </div>
        )}

        <div style={S.row}>
          <span style={S.small}>Sort</span>
          <select style={S.select} value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="relevance">Relevance</option>
            <option value="rating">Rating</option>
            <option value="minutes-asc">Time: Low → High</option>
            <option value="minutes-desc">Time: High → Low</option>
            <option value="popularity">Popularity</option>
          </select>

          <span style={S.small}>Per page</span>
          <select style={S.select} value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
            {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>

      <div style={S.layout}>
        <section>
          <div style={{ ...S.row, justifyContent: "space-between", marginTop: 0 }}>
            <div style={S.small}>{infoLine}</div>
            <div>
              <button
                style={{ ...S.btn, marginRight: 6, opacity: results.page <= 1 ? 0.6 : 1 }}
                disabled={results.page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                ← Prev
              </button>
              <button
                style={S.btnPri}
                disabled={loading || results.page >= results.pages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next →
              </button>
            </div>
          </div>

          {err && <div style={S.error}>{err}</div>}

          <div style={S.list}>
            {loading && (
              <>
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} style={{ ...S.skel, padding: 16 }}>
                    <div style={{ ...S.skelBar, width: "60%" }} />
                    <div style={{ height: 8 }} />
                    <div style={{ ...S.skelBar, width: "35%" }} />
                    <div style={{ height: 8 }} />
                    <div style={{ ...S.skelBar, width: "80%" }} />
                  </div>
                ))}
              </>
            )}

            {!loading && dq && results.items.length === 0 && !err && (
              <div style={{ ...S.card, textAlign: "center" }}>No results. Try different keywords or filters.</div>
            )}

            {results.items.map((r) => (
              <article key={r.id} style={S.rCard}>
                <div style={S.title} onClick={() => openDetails(r.id)}>
                  {highlight(r.name, dq)}
                </div>
                <div style={S.meta}>
                  <span><ClockIcon /> {r.minutes}m</span>
                  {r.rating != null && <span>★ {r.rating}</span>}
                  {!!r.popularity && <span>❤ {r.popularity}</span>}
                  {r.cuisine && <span>{r.cuisine}</span>}
                  {r.diet && <span>{r.diet}</span>}
                </div>

                {!!r.ingredients?.length && (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                    {r.ingredients.slice(0, 12).map((ing) => (
                      <span key={ing} style={S.tag}>{ing}</span>
                    ))}
                  </div>
                )}

                {r.description && (
                  <p style={{ ...S.details, marginTop: 8 }}>
                    {highlight(r.description.slice(0, 240), dq)}{r.description.length > 240 ? "…" : ""}
                  </p>
                )}

                <div style={S.actionRow}>
                  <button style={S.btn} onClick={() => openDetails(r.id)}>
                    {openId === r.id ? "Hide details" : "Show full ingredients & instructions"}
                  </button>
                  {!!r.ingredients?.length && (
                    <button
                      style={S.btn}
                      onClick={() => copy(r.ingredients.join("\n"))}
                      title="Copy ingredients to clipboard"
                    >
                      Copy ingredients
                    </button>
                  )}
                </div>

                {openId === r.id && (
                  <div style={S.drawer}>
                    {!detail || detail.id !== r.id ? (
                      <div style={{ color: "#64748b" }}>Loading details…</div>
                    ) : (
                      <>
                        {!!detail.ingredients?.length && (
                          <>
                            <div style={S.subTitle}>Ingredients</div>
                            <ul>
                              {detail.ingredients.map((x, i) => <li key={i}>{x}</li>)}
                            </ul>
                          </>
                        )}
                        {detail.steps && (
                          <>
                            <div style={S.subTitle}>Instructions</div>
                            <p style={S.details}>{detail.steps}</p>
                          </>
                        )}
                        <div style={S.actionRow}>
                          <button style={S.btn} onClick={() => window.print()}>Print</button>
                          <button style={S.btn} onClick={() => { setOpenId(null); setDetail(null); }}>Close</button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

