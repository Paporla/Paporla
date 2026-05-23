import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const start = Date.now()

  try {
    const supabase = await createClient()
    const { error } = await supabase.from('user_profiles').select('id').limit(1).maybeSingle()

    if (error) {
      return NextResponse.json(
        {
          status: 'degraded',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          database: 'error',
          error: error.message,
        },
        { status: 503 },
      )
    }

    return NextResponse.json(
      {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: 'connected',
        responseTimeMs: Date.now() - start,
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
      },
      {
        headers: {
          'Cache-Control': 'no-store, must-revalidate',
        },
      },
    )
  } catch (err) {
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: 'disconnected',
        error: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
