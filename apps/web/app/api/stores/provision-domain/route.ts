import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase/server'
import { provisionTenantDomain } from '@mallevo/lib'

export async function POST(req: NextRequest) {
  try {
    const { storeId, slug } = await req.json()

    if (!storeId || !slug) {
      return NextResponse.json(
        { error: 'storeId e slug são obrigatórios' },
        { status: 400 }
      )
    }

    const result = await provisionTenantDomain(slug)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, step: result.step },
        { status: 502 }
      )
    }

    const supabase = createSupabaseAdmin()
    const { error: updateError } = await supabase
      .from('stores')
      .update({ domain: result.domain, cf_dns_record_id: result.cloudflareId })
      .eq('id', storeId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ domain: result.domain })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro inesperado'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
