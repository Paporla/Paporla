'use client'

import { useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase/client'
import type { UserProfile } from '@/types/user'

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
const MAX_FILE_SIZE = 2 * 1024 * 1024

const EXTENSION_BY_MIME: Record<(typeof ALLOWED_MIME_TYPES)[number], string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

export interface ProfileUpdateValues {
  displayName: string
  phoneE164: string | null
  avatarPath: string | null
  marketId: string | null
  localityId: string | null
  locale: string
}

function validateFile(file: File): asserts file is File & { type: (typeof ALLOWED_MIME_TYPES)[number] } {
  if (!ALLOWED_MIME_TYPES.includes(file.type as (typeof ALLOWED_MIME_TYPES)[number])) {
    throw new Error('Tipo de archivo no permitido. Usa JPEG, PNG o WebP')
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('El archivo excede el tamaño máximo de 2MB')
  }
}

export function buildAvatarPath(userId: string, mimeType: (typeof ALLOWED_MIME_TYPES)[number], id: string): string {
  return `${userId}/${id}.${EXTENSION_BY_MIME[mimeType]}`
}

export function useProfile() {
  const supabase = supabaseBrowser()
  const [uploading, setUploading] = useState(false)

  const updateProfile = async (values: ProfileUpdateValues) => {
    const { error } = await supabase.rpc('update_own_profile', {
      p_display_name: values.displayName,
      p_phone_e164: values.phoneE164 ?? '',
      p_avatar_path: values.avatarPath ?? '',
      // Supabase genera uuid como string aunque PostgreSQL admite NULL aquí.
      p_market_id: values.marketId as string,
      p_locality_id: values.localityId as string,
      p_locale: values.locale,
    })

    if (error) throw error
    return true
  }

  const uploadAvatar = async (profile: UserProfile, file: File) => {
    validateFile(file)
    setUploading(true)

    const filePath = buildAvatarPath(profile.id, file.type, crypto.randomUUID())

    try {
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, {
        contentType: file.type,
        upsert: false,
      })
      if (uploadError) throw uploadError

      try {
        await updateProfile({
          displayName: profile.displayName ?? '',
          phoneE164: profile.phoneE164,
          avatarPath: filePath,
          marketId: profile.marketId,
          localityId: profile.localityId,
          locale: profile.locale,
        })
      } catch (profileError) {
        await supabase.storage
          .from('avatars')
          .remove([filePath])
          .catch(() => {})
        throw profileError
      }

      if (profile.avatarPath && profile.avatarPath !== filePath) {
        await supabase.storage
          .from('avatars')
          .remove([profile.avatarPath])
          .catch(() => {})
      }

      return supabase.storage.from('avatars').getPublicUrl(filePath).data.publicUrl
    } finally {
      setUploading(false)
    }
  }

  return { updateProfile, uploadAvatar, uploading }
}
