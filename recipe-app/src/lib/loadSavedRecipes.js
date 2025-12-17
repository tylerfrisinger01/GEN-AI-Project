const API_BASE = process.env.REACT_APP_API_BASE;

if (!API_BASE) {
  console.warn(
    "Missing REACT_APP_API_BASE. Identify page requests will fail until it is provided."
  );
}

export function formatInstructions(steps) {
  if (!steps) return [];
  
  // If it's already an array, just return it
  if (Array.isArray(steps)) {
    return steps;
  }

  // If it's a string, try to turn it into a list
  if (typeof steps === "string") {
    const cleanText = steps.trim();

    // Try parsing as JSON first (like ["step 1", "step 2"])
    if (cleanText.startsWith("[") && cleanText.endsWith("]")) {
      try {
        const parsed = JSON.parse(cleanText);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        // failed to parse, ignore
      }
    }

    // Fallback: split by newlines
    return cleanText.split(/\r?\n/).filter(line => line.trim().length > 0);
  }
  
  return [];
}

async function getRecipeDetails(id) {
  try {
    const response = await fetch(`${API_BASE}/recipes/${id}`);
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error("Could not load recipe details for id:", id);
  }
  return null;
}

export async function loadSavedRecipes(savedItems) {
  if (!savedItems || !Array.isArray(savedItems)) return [];

  const results = [];

  // Loop through each saved item one by one
  for (const item of savedItems) {
    // If it is an AI recipe or has no ID, avoid fetching details
    if (item.is_ai_recipe || !item.recipe_id) {
      results.push(item);
      continue;
    }

    // Fetch the full details from the database
    const details = await getRecipeDetails(item.recipe_id);

    if (details) {
      // Use the fetched details to fill in blanks
      const instructions = formatInstructions(details.steps || item.instructions);
      
      results.push({
        ...item,
        name: details.name || item.name,
        description: details.description || item.description,
        ingredients: details.ingredients || item.ingredients,
        instructions: instructions,
        steps: instructions,
        minutes: details.minutes || item.minutes,
        image: details.image || item.image,
        localRecipe: details
      });
    } else {
      // If details couldn't be loaded, use existing data
      results.push(item);
    }
  }

  return results;
}

export async function loadSingleRecipe(item) {
  if (!item) return null;
  const [loaded] = await loadSavedRecipes([item]);
  return loaded;
}
