import { SupabaseClient } from '@supabase/supabase-js'

export async function logActivity(
  supabase: SupabaseClient,
  userId: string,
  type: string,
  title: string,
  description: string,
  icon: string
) {
  try {
    const { error } = await supabase.from('activity_logs').insert([{
      user_id: userId,
      type,
      title,
      description,
      icon
    }])

    if (error) {
      console.error('Failed to log activity:', error)
    }
  } catch (err) {
    console.error('Unexpected error logging activity:', err)
  }
}
