// src/data/favorites.js
import { supabase } from '../lib/supaBaseClient'

/**
 * favorites schema:
 *  id uuid PK
 *  recipe_id integer        -- local DB recipe id (null for AI recipes)
 *  name text                -- AI recipe name (optional for local)
 *  ingredients jsonb        -- array (strings or objects)
 *  instructions jsonb       -- array of step strings (or null for local)
 *  is_ai_recipe boolean
 *  created_at timestamptz
 */

/** List all favorites (local + AI) */
export async function listFavorites(limit = 200) {
  const { data, error } = await supabase
    .from('favorites')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data
}

/** List local DB recipe favorites (by recipe_id only) */
export async function listLocalFavorites(limit = 200) {
  const { data, error } = await supabase
    .from('favorites')
    .select('recipe_id, created_at')
    .eq('is_ai_recipe', false)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data // [{recipe_id, created_at}, ...]
}

/** List AI recipe favorites (full snapshots) */
export async function listAiFavorites(limit = 200) {
  const { data, error } = await supabase
    .from('favorites')
    .select('name, ingredients, instructions, created_at')
    .eq('is_ai_recipe', true)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data // [{name, ingredients, instructions, created_at}, ...]
}

/** Boolean: is this local recipe (by id) favorited? */
export async function isFavoriteLocal(recipeId) {
  const { data, error } = await supabase
    .from('favorites')
    .select('id')
    .eq('is_ai_recipe', false)
    .eq('recipe_id', recipeId)
    .maybeSingle()

  if (error) throw error
  return !!data
}

/** Boolean: is this AI recipe (by name) favorited? */
export async function isFavoriteAiByName(name) {
  const { data, error } = await supabase
    .from('favorites')
    .select('id')
    .eq('is_ai_recipe', true)
    .eq('name', name)
    .maybeSingle()

  if (error) throw error
  return !!data
}

/** Add local favorite (recipe in your SQLite DB) */
export async function addFavoriteLocal(recipeId) {
  const { data, error } = await supabase
    .from('favorites')
    .insert([
      {
        recipe_id: recipeId,
        is_ai_recipe: false,
        name: null,
        ingredients: null,
        instructions: null,
      },
    ])
    .select()
    .single()

  if (error) throw error
  return data
}

/** Remove local favorite */
export async function removeFavoriteLocal(recipeId) {
  const { error } = await supabase
    .from('favorites')
    .delete()
    .eq('is_ai_recipe', false)
    .eq('recipe_id', recipeId)

  if (error) throw error
}

/** Add AI favorite (full snapshot) */
export async function addFavoriteAiSnapshot(recipe) {
  const { name, ingredients, steps } = recipe
  const { data, error } = await supabase
    .from('favorites')
    .insert([
      {
        recipe_id: null,
        is_ai_recipe: true,
        name: name || null,
        ingredients: ingredients || [],
        instructions: steps || [],
      },
    ])
    .select()
    .single()

  if (error) throw error
  return data
}

/** Remove AI favorite by name (simple heuristic) */
export async function removeFavoriteAiByName(name) {
  const { error } = await supabase
    .from('favorites')
    .delete()
    .eq('is_ai_recipe', true)
    .eq('name', name || null)

  if (error) throw error
}

/** Toggle local favorite; returns true if now favorited, false if removed */
export async function toggleFavoriteLocal(recipeId) {
  const exists = await isFavoriteLocal(recipeId)
  if (exists) {
    await removeFavoriteLocal(recipeId)
    return false
  } else {
    await addFavoriteLocal(recipeId)
    return true
  }
}

/** Toggle AI favorite; returns true if now favorited, false if removed */
export async function toggleFavoriteAiSnapshot(recipe) {
  const exists = await isFavoriteAiByName(recipe.name || null)
  if (exists) {
    await removeFavoriteAiByName(recipe.name || null)
    return false
  } else {
    await addFavoriteAiSnapshot(recipe)
    return true
  }
}
