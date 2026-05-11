'use client'

import { useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase/client'
import { UserProfile } from '@/lib/supabase/types'

export function useProfile() {
  const supabase = supabaseBrowser();
  const [uploading, setUploading] = useState(false)

  const updateProfile = async (userId: string, updates: Partial<UserProfile>) => {
    const { error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', userId)

    if (error) throw error
    return true
  }

  const uploadAvatar = async (userId: string, file: File) => {
    setUploading(true)
    
    const fileExt = file.name.split('.').pop()
    const fileName = `${userId}-${Date.now()}.${fileExt}`
    const filePath = `avatars/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file)

    if (uploadError) throw uploadError

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath)

    await updateProfile(userId, { avatar_url: publicUrl })

    setUploading(false)
    return publicUrl
  }

  return {
    updateProfile,
    uploadAvatar,
    uploading,
  }
}