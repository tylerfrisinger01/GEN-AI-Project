
export async function generateFavoriteImage(favoriteId, name, ingredients) {
  try {
    const res = await fetch("http://localhost:4000/api/favorite-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ favorite_id: favoriteId, name, ingredients }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "Failed to generate image");
    }

    const json = await res.json();
    return json.image_url;
  } catch (err) {
    console.error("generateFavoriteImage error:", err);
    // you can choose to surface this or just fail silently
    return null;
  }
}