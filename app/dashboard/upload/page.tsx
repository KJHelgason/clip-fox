'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'
import { useUser } from '@/lib/supabase/useUser'
import { v4 as uuidv4 } from 'uuid'

export default function UploadClip() {
  const { user } = useUser()
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  const handleUpload = async () => {
    if (!file || !user) return

    setUploading(true)
    const clipId = uuidv4()
    const filePath = `${user.id}/${clipId}.mp4`

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('clips')
      .upload(filePath, file)

    if (uploadError) {
      alert(`Upload failed: ${uploadError.message}`)
      setUploading(false)
      return
    }

    // Insert metadata into DB
    const { error: dbError } = await supabase.from('clips').insert({
      user_id: user.id,
      title: file.name,
      video_path: filePath,
    })

    if (dbError) {
      alert(`DB error: ${dbError.message}`)
    } else {
      alert('Upload successful!')
    }

    setUploading(false)
  }

  return (
    <div className="p-4 max-w-md mx-auto space-y-4">
      <Input
        type="file"
        accept="video/*"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />
      <Button onClick={handleUpload} disabled={uploading || !file}>
        {uploading ? 'Uploading...' : 'Upload Clip'}
      </Button>
    </div>
  )
}
