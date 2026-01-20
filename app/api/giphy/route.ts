import { NextRequest, NextResponse } from 'next/server'

const GIPHY_API_KEY = process.env.GIPHY_API_KEY

// GET /api/giphy?type=gifs|stickers&q=searchQuery&limit=50&offset=0
export async function GET(request: NextRequest) {
  if (!GIPHY_API_KEY) {
    return NextResponse.json(
      { error: 'Giphy API key not configured' },
      { status: 500 }
    )
  }

  const searchParams = request.nextUrl.searchParams
  const type = searchParams.get('type') || 'gifs' // 'gifs' or 'stickers'
  const query = searchParams.get('q')
  const limit = searchParams.get('limit') || '50'
  const offset = searchParams.get('offset') || '0'
  const rating = searchParams.get('rating') || 'pg-13'

  // Validate type
  if (type !== 'gifs' && type !== 'stickers') {
    return NextResponse.json(
      { error: 'Invalid type. Must be "gifs" or "stickers"' },
      { status: 400 }
    )
  }

  try {
    // Build the Giphy API URL
    const baseUrl = `https://api.giphy.com/v1/${type}`
    const endpoint = query ? 'search' : 'trending'

    const params = new URLSearchParams({
      api_key: GIPHY_API_KEY,
      limit,
      offset,
      rating,
    })

    // Add search query if provided
    if (query) {
      params.set('q', query)
      params.set('lang', 'en')
    }

    const giphyUrl = `${baseUrl}/${endpoint}?${params.toString()}`

    const response = await fetch(giphyUrl, {
      headers: {
        'Accept': 'application/json',
      },
      // Cache for 5 minutes for trending, 1 minute for search
      next: { revalidate: query ? 60 : 300 }
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Giphy API error:', errorText)
      return NextResponse.json(
        { error: 'Failed to fetch from Giphy' },
        { status: response.status }
      )
    }

    const data = await response.json()

    // Return the data with pagination info
    return NextResponse.json({
      data: data.data,
      pagination: data.pagination,
      meta: data.meta,
    })
  } catch (error) {
    console.error('Error fetching from Giphy:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
