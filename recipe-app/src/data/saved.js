import { supabase } from '../lib/supaBaseClient'

/**
 * favorites table schema (named `favorites` in supabase):
 *  id uuid PK
 *  recipe_id integer        -- local DB recipe id (null for AI recipes)
 *  name text                -- AI recipe name (optional for local)
 *  ingredients jsonb        -- array (strings or objects)
 *  instructions jsonb       -- array of step strings (or null for local)
 *  is_ai_recipe boolean
 *  created_at timestamptz
 */

/** List all saved recipes */
export async function listSaved(limit = 200) {
  const { data, error } = await supabase
    .from('favorites')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data
}

/** List saved local recipes  */
export async function listLocalSaved(limit = 200) {
  const { data, error } = await supabase
    .from('favorites')
    .select('recipe_id, created_at')
    .eq('is_ai_recipe', false)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data
}

/** List saved AI recipe  */
export async function listAiSaved(limit = 200) {
  const { data, error } = await supabase
    .from('favorites')
    .select('name, ingredients, instructions, created_at')
    .eq('is_ai_recipe', true)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data 
}

/**  is this local recipe saved */
export async function isSavedLocal(recipeId) {
  const { data, error } = await supabase
    .from('favorites')
    .select('id')
    .eq('is_ai_recipe', false)
    .eq('recipe_id', recipeId)
    .maybeSingle()

  if (error) throw error
  return !!data
}

/** is this AI recipe saved */
export async function isSavedAiByName(name) {
  const { data, error } = await supabase
    .from('favorites')
    .select('id')
    .eq('is_ai_recipe', true)
    .eq('name', name)
    .maybeSingle()

  if (error) throw error
  return !!data
}

/** Add saved local recipe */
export async function addSavedLocal(recipeId) {
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

export async function removeSavedLocal(recipeId) {
  const { error } = await supabase
    .from('favorites')
    .delete()
    .eq('is_ai_recipe', false)
    .eq('recipe_id', recipeId)

  if (error) throw error
}

export async function addSavedAiSnapshot(recipe) {
  const { name, ingredients, steps, image_url } = recipe
  const { data, error } = await supabase
    .from('favorites')
    .insert([
      {
        recipe_id: null,
        is_ai_recipe: true,
        name: name || null,
        ingredients: ingredients || [],
        instructions: steps || [],
        image_url: image_url || null,
      },
    ])
    .select()
    .single()

  if (error) throw error
  return data
}

/** Remove saved AI recipe by name  */
export async function removeSavedAiByName(name) {
  const { error } = await supabase
    .from('favorites')
    .delete()
    .eq('is_ai_recipe', true)
    .eq('name', name || null)

  if (error) throw error
}

export async function toggleSavedLocal(recipeId) {
  const exists = await isSavedLocal(recipeId)
  if (exists) {
    await removeSavedLocal(recipeId)
    return false
  } else {
    await addSavedLocal(recipeId)
    return true
  }
}

export async function toggleSavedAiSnapshot(recipe) {
  const exists = await isSavedAiByName(recipe.name || null)
  if (exists) {
    await removeSavedAiByName(recipe.name || null)
    return false
  } else {
    await addSavedAiSnapshot(recipe)
    return true
  }
}

export async function deleteSavedById(id) {
  const { error } = await supabase
    .from('favorites')
    .delete()
    .eq('id', id)

  if (error) throw error
}
