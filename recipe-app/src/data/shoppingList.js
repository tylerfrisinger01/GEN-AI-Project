import { supabase } from '../lib/supaBaseClient'

/** Get shopping list (unchecked first, newest first) */
export async function getShoppingList() {
  const { data, error } = await supabase
    .from('shopping_items')
    .select('*')
    .order('checked', { ascending: true })
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

/** Add item */
export async function addShoppingItem({ name, qty = '', notes = '' }) {
  const { data, error } = await supabase
    .from('shopping_items')
    .insert([{ name, qty, notes }])
    .select()
    .single()
  if (error) throw error
  return data
}

/** Update arbitrary fields: { qty, notes, checked, name } */
export async function updateShoppingItem(id, patch) {
  const { data, error } = await supabase
    .from('shopping_items')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

/** Toggle check state */
export async function toggleShoppingChecked(id, checked) {
  const { data, error } = await supabase
    .from('shopping_items')
    .update({ checked })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

/** Remove a single item */
export async function removeShoppingItem(id) {
  const { error } = await supabase
    .from('shopping_items')
    .delete()
    .eq('id', id)
  if (error) throw error
}

/** Bulk: clear all checked items */
export async function clearCheckedShopping() {
  const { error } = await supabase
    .from('shopping_items')
    .delete()
    .eq('checked', true)
  if (error) throw error
}

/** Optional convenience: move one checked item to pantry then delete it */
export async function moveShoppingItemToPantry(id) {
  // read the item
  const { data: item, error: readErr } = await supabase
    .from('shopping_items')
    .select('*')
    .eq('id', id)
    .single()
  if (readErr) throw readErr

  // create in pantry
  const { error: insErr } = await supabase
    .from('pantry_items')
    .insert([{ name: item.name, qty: item.qty, notes: item.notes }])
  if (insErr) throw insErr

  // remove from shopping list
  const { error: delErr } = await supabase
    .from('shopping_items')
    .delete()
    .eq('id', id)
  if (delErr) throw delErr
}

/** Clear all items */
export async function clearShopping() {
  const { error } = await supabase.from('shopping_items').delete()
  if (error) throw error
}