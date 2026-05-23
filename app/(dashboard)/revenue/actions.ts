'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { logActivity } from '@/lib/activity'

export async function addTransaction(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const amount = parseFloat(formData.get('amount') as string)
  const description = formData.get('description') as string
  const type = formData.get('type') as 'revenue' | 'expense'
  const category = formData.get('category') as string || null
  const notes = formData.get('notes') as string || null
  const dateStr = formData.get('date') as string
  const file = formData.get('receipt') as File | null

  let receipt_url = null

  if (file && file.size > 0) {
    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}-${Math.random()}.${fileExt}`
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('receipts')
      .upload(fileName, file)

    if (uploadError) {
      console.error('Upload Error:', uploadError)
      throw new Error('Failed to upload receipt')
    }

    const { data: { publicUrl } } = supabase.storage
      .from('receipts')
      .getPublicUrl(fileName)
      
    receipt_url = publicUrl
  }

  const { error } = await supabase
    .from('transactions')
    .insert({
      user_id: user.id,
      amount,
      description,
      type,
      receipt_url,
      category,
      notes,
      date: dateStr ? new Date(dateStr).toISOString() : new Date().toISOString()
    })

  if (error) {
    console.error('Insert Error:', error)
    throw new Error('Failed to add transaction')
  }

  await logActivity(
    supabase,
    user.id,
    'finance',
    type === 'revenue' ? `Revenue Added — $${amount.toLocaleString()}` : `Expense Logged — $${amount.toLocaleString()}`,
    description,
    type === 'revenue' ? '💰' : '💸'
  )

  revalidatePath('/revenue')
  revalidatePath('/')
  
  return { success: true }
}

export async function deleteTransaction(id: string, receipt_url: string | null) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Optional: delete receipt from storage
  if (receipt_url) {
    const fileName = receipt_url.split('/').pop()
    if (fileName) {
      await supabase.storage.from('receipts').remove([fileName])
    }
  }

  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw new Error('Failed to delete transaction')

  revalidatePath('/revenue')
  revalidatePath('/')
  
  return { success: true }
}
