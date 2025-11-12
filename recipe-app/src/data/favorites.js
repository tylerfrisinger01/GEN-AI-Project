import { supabase } from '../lib/supaBaseClient'

/** List favorites (just ids + timestamps) */
export async function listFavorites(targetType = 'recipe', limit = 200) {
  const { data, error } = await supabase
    .from('favorites')
    .select('target_id, created_at')
    .eq('target_type', targetType)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data // [{target_id, created_at}, ...]
}

/** Boolean check */
export async function isFavorite(targetId, targetType = 'recipe') {
  const { data, error } = await supabase
    .from('favorites')
    .select('id')
    .eq('target_type', targetType)
    .eq('target_id', targetId)
    .maybeSingle()
  if (error) throw error
  return !!data
}

/** Add favorite */
export async function addFavorite(targetId, targetType = 'recipe') {
  const { data, error } = await supabase
    .from('favorites')
    .insert([{ target_type: targetType, target_id: targetId }])
    .select()
    .single()
  if (error) throw error
  return data
}

/** Remove favorite */
export async function removeFavorite(targetId, targetType = 'recipe') {
  const { error } = await supabase
    .from('favorites')
    .delete()
    .eq('target_type', targetType)
    .eq('target_id', targetId)
  if (error) throw error
}

/** Toggle; returns true if now favorited, false if removed */
export async function toggleFavorite(targetId, targetType = 'recipe') {
  const exists = await isFavorite(targetId, targetType)
  if (exists) {
    await removeFavorite(targetId, targetType)
    return false
  } else {
    await addFavorite(targetId, targetType)
    return true
  }
}

/** (Optional) If you have a `recipes` table and want the full rows for favorites */
// export async function getFavoriteRecipes(limit = 50) {
//   const favs = await listFavorites('recipe', limit)
//   const ids = favs.map(f => f.target_id)
//   if (!ids.length) return []
//   const { data, error } = await supabase.from('recipes').select('*').in('id', ids)
//   if (error) throw error
//   // keep original favorite order
//   const order = new Map(ids.map((id, i) => [id, i]))
//   return data.sort((a, b) => (order.get(a.id) ?? 1e9) - (order.get(b.id) ?? 1e9))
// }
