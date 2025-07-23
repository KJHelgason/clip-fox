'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useUser } from '@/lib/supabase/useUser'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

type Clip = {
    id: string
    title: string | null
    video_path: string
    created_at: string
    signedUrl: string | null
}

export default function ClipListPage() {
    const { user } = useUser()
    const [clips, setClips] = useState<Clip[]>([])
    const [loading, setLoading] = useState(true)
    const [deletingId, setDeletingId] = useState<string | null>(null)

    useEffect(() => {
        if (!user) return

        const fetchClips = async () => {
            const { data, error } = await supabase
                .from('clips')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })

            if (error || !data) {
                console.error('Error fetching clips:', error)
                setLoading(false)
                return
            }

            const clipsWithUrls = await Promise.all(
                data.map(async (clip) => {
                    const { data: signed } = await supabase.storage
                        .from('clips')
                        .createSignedUrl(clip.video_path, 3600)

                    return {
                        ...clip,
                        signedUrl: signed?.signedUrl || null
                    }
                })
            )

            setClips(clipsWithUrls)
            setLoading(false)
        }

        fetchClips()
    }, [user])

    const handleDelete = async (clip: Clip) => {
        setDeletingId(clip.id)

        // 1. Delete from storage
        const { error: storageError } = await supabase.storage
            .from('clips')
            .remove([clip.video_path])

        // 2. Delete from DB
        const { error: dbError } = await supabase
            .from('clips')
            .delete()
            .eq('id', clip.id)

        if (storageError || dbError) {
            alert('Failed to delete clip.')
            console.error({ storageError, dbError })
        } else {
            setClips((prev) => prev.filter((c) => c.id !== clip.id))
        }

        setDeletingId(null)
    }

    if (loading) return <div className="p-4">Loading clips...</div>
    if (!clips.length) return <div className="p-4">No clips uploaded yet.</div>

    return (
        <div className="p-6 space-y-4">
            <h1 className="text-2xl font-bold">Your Uploaded Clips</h1>
            <div className="grid gap-4 md:grid-cols-2">
                {clips.map((clip) => (
                    <Card key={clip.id}>
                        <CardContent className="p-4 space-y-2">
                            {clip.signedUrl ? (
                                <video
                                    className="w-full rounded"
                                    src={clip.signedUrl}
                                    controls
                                />
                            ) : (
                                <div className="text-red-500">Failed to load video</div>
                            )}
                            <div className="text-lg font-medium">
                                {clip.title || 'Untitled'}
                            </div>
                            <div className="text-sm text-muted-foreground">
                                {new Date(clip.created_at).toLocaleString()}
                            </div>
                            <div className="flex gap-2 pt-2">
                                <Button asChild variant="outline">
                                    <Link href={`/dashboard/edit/${clip.id}`}>Edit</Link>
                                </Button>
                                <Button
                                    variant="destructive"
                                    onClick={() => handleDelete(clip)}
                                    disabled={deletingId === clip.id}
                                >
                                    {deletingId === clip.id ? 'Deleting...' : 'Delete'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}
