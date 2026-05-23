'use client'

import { useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase/client'
import { UserProfile } from '@/lib/supabase/types'

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

function validateFile(file: File): string | null {
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return 'Tipo de archivo no permitido. Usa: JPEG, PNG, WebP, GIF o AVIF'
  }
  if (file.size > MAX_FILE_SIZE) {
    return `El archivo excede el tamaño máximo de ${MAX_FILE_SIZE / 1024 / 1024}MB`
  }
  return null
}

export function useProfile() {
  const supabase = supabaseBrowser()
  const [uploading, setUploading] = useState(false)

  const updateProfile = async (userId: string, updates: Partial<UserProfile>) => {
    const { error } = await supabase.from('user_profiles').update(updates).eq('id', userId)

    if (error) throw error
    return true
  }

  const uploadAvatar = async (userId: string, file: File) => {
    const validationError = validateFile(file)
    if (validationError) throw new Error(validationError)

    setUploading(true)

    const fileExt = file.name.split('.').pop()
    const fileName = `${userId}-${Date.now()}.${fileExt}`
    const filePath = `avatars/${fileName}`

    const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, {
      contentType: file.type,
      upsert: true,
    })

    if (uploadError) throw uploadError

    const {
      data: { publicUrl },
    } = supabase.storage.from('avatars').getPublicUrl(filePath)

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
