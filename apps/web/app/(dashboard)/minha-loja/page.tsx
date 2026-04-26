import { getDadosLoja } from '@/lib/actions/lojas'
import { createSupabaseServer } from '@/lib/supabase/server'
import { formatarReais } from '@mallora/lib'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  Pencil,
  Phone,
  MapPin,
  Clock,
  Truck,
  CreditCard,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Store,
  Smartphone,
  Globe,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { BotaoCopiarLink } from '@/components/dashboard/botao-copiar-link'

const DIAS_LABELS: Record<string, string> = {
  seg: 'Seg',
  ter: 'Ter',
  qua: 'Qua',
  qui: 'Qui',
  sex: 'Sex',
  sab: 'Sáb',
  dom: 'Dom',
}
const DIAS_ORDEM = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom']

export default async function PaginaMinhaLoja() {
  const supabase = createSupabaseServer()
  const dados = await getDadosLoja()

  if (!dados?.loja) redirect('/onboarding')

  const { loja, tenant } = dados

  const [{ count: totalProdutos }, { count: totalPedidos }, { data: produtosDestaque }] =
    await Promise.all([
      supabase
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenant.id),
      supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('store_id', loja.id),
      supabase
        .from('products')
        .select('id, nome, foto_url, preco')
        .eq('tenant_id', tenant.id)
        .eq('disponivel', true)
        .limit(4),
    ])

  const horarios = (loja.horarios as Record<string, { abre: string; fecha: string }>) ?? {}
  const endereco = loja.endereco as Record<string, string> | null
  const temEndereco = endereco?.rua && endereco?.cidade

  const metodosPagamento = [
    { key: 'aceita_dinheiro', label: 'Dinheiro', ativo: loja.aceita_dinheiro },
    { key: 'aceita_pix', label: 'PIX', ativo: loja.aceita_pix },
    { key: 'aceita_cartao_maquininha', label: 'Maquininha', ativo: loja.aceita_cartao_maquininha },
    { key: 'aceita_cartao_online', label: 'Online', ativo: loja.aceita_cartao_online },
  ]

  const urlLoja = loja.slug ? `mallora.app/${loja.slug}` : null
  const urlLojaCompleta = loja.slug ? `https://mallora.app/${loja.slug}` : null

  const produtos = (produtosDestaque ?? []) as Array<{
    id: string
    nome: string
    foto_url: string | null
    preco: number
  }>

  return (
    <div className="slide-up">
      {/* Hero */}
      <div className="relative mb-0">
        <div className="w-full h-[180px] overflow-hidden" style={{ background: 'var(--bg-3)' }}>
          {loja.banner_url ? (
            <img src={loja.banner_url} alt="Banner da loja" className="w-full h-full object-cover" />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #e9f9b8 0%, #c1f148 50%, #a3d22a 100%)' }}
            >
              <Store className="w-10 h-10 opacity-30" style={{ color: 'var(--brick-ink)' }} />
            </div>
          )}
        </div>

        <div className="px-9">
          <div className="flex items-end justify-between -mt-10 mb-5">
            <div className="flex items-end gap-4">
              <div
                className="w-20 h-20 rounded-2xl overflow-hidden border-4 flex-shrink-0"
                style={{ background: 'var(--bg-2)', borderColor: 'var(--bg)' }}
              >
                {loja.logo_url ? (
                  <img src={loja.logo_url} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center text-2xl font-bold"
                    style={{ background: 'var(--brick)', color: 'var(--brick-ink)' }}
                  >
                    {loja.nome.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              <div className="mb-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="font-display text-[26px] leading-tight text-ink">{loja.nome}</h1>
                  <span
                    className="text-xs px-2.5 py-0.5 rounded-full font-semibold"
                    style={
                      loja.ativo
                        ? { background: 'rgba(79,176,37,0.12)', color: 'var(--ok)' }
                        : { background: 'rgba(224,90,59,0.12)', color: 'var(--err)' }
                    }
                  >
                    {loja.ativo ? 'Ativa' : 'Inativa'}
                  </span>
                </div>
                {urlLoja && <p className="text-xs text-ink-3 mt-0.5">{urlLoja}</p>}
              </div>
            </div>

            <div className="flex items-center gap-2 mb-1">
              {urlLojaCompleta && (
                <a
                  href={urlLojaCompleta}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold hover:opacity-80 transition-opacity"
                  style={{ border: '1px solid var(--line)', color: 'var(--ink-2)' }}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Ver loja
                </a>
              )}
              <Link
                href="/configuracoes"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold hover:opacity-90 transition-opacity"
                style={{ background: 'var(--brick)', color: 'var(--brick-ink)' }}
              >
                <Pencil className="w-3.5 h-3.5" />
                Editar
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div
        className="mx-9 mb-6 grid grid-cols-3 divide-x rounded-2xl overflow-hidden"
        style={{ background: 'var(--bg-2)' }}
      >
        {[
          { label: 'Produtos ativos', val: totalProdutos ?? 0 },
          { label: 'Pedidos totais', val: totalPedidos ?? 0 },
          { label: 'Tempo médio', val: loja.tempo_entrega ? `${loja.tempo_entrega} min` : '—' },
        ].map((stat) => (
          <div key={stat.label} className="px-5 py-3.5" style={{ borderColor: 'var(--line)' }}>
            <p className="text-xs text-ink-3">{stat.label}</p>
            <p className="font-display text-[22px] text-ink leading-tight mt-0.5">{stat.val}</p>
          </div>
        ))}
      </div>

      {/* Dupla Presença */}
      <div className="px-9 mb-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <h2 className="font-display text-[20px] leading-tight text-ink">Sua dupla presença</h2>
            <span
              className="text-[11px] px-2.5 py-0.5 rounded-full font-semibold"
              style={{ background: 'var(--brick-lt)', color: 'var(--brick-dk)' }}
            >
              2 canais
            </span>
          </div>
          <Link
            href="/configuracoes"
            className="text-xs font-medium hover:underline"
            style={{ color: 'var(--brick-dk)' }}
          >
            Personalizar
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Canal 1: App Mallora */}
          <div
            className="rounded-2xl overflow-hidden border flex flex-col"
            style={{ borderColor: 'var(--line)', background: 'var(--bg)' }}
          >
            {/* Card header */}
            <div className="flex items-start justify-between p-5 pb-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: 'var(--bg-2)' }}
                  >
                    <Smartphone className="w-3.5 h-3.5 text-ink-2" />
                  </div>
                  <span className="text-sm font-semibold text-ink">Dentro do Mallora</span>
                </div>
                <p className="text-xs text-ink-3 leading-relaxed">
                  Seus clientes te encontram no marketplace de Divinópolis
                </p>
              </div>
              <span
                className="flex-shrink-0 ml-3 text-[10px] px-2 py-0.5 rounded-full font-semibold"
                style={{ background: 'rgba(79,176,37,0.12)', color: 'var(--ok)' }}
              >
                Online
              </span>
            </div>

            {/* Phone mockup */}
            <div className="flex justify-center px-5 pb-4 flex-1">
              <div
                style={{
                  width: 200,
                  background: '#0f0f0d',
                  borderRadius: 28,
                  padding: '10px 7px 18px',
                  boxShadow:
                    '0 20px 48px -8px rgba(0,0,0,0.30), inset 0 0 0 1.5px rgba(255,255,255,0.07), 0 0 0 1px rgba(0,0,0,0.6)',
                  position: 'relative',
                }}
              >
                {/* Dynamic island */}
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
                  <div
                    style={{
                      width: 72,
                      height: 8,
                      background: '#000',
                      borderRadius: 20,
                      border: '1px solid rgba(255,255,255,0.06)',
                    }}
                  />
                </div>

                {/* Screen */}
                <div
                  style={{
                    borderRadius: 20,
                    overflow: 'hidden',
                    background: '#f6f6f3',
                    minHeight: 290,
                  }}
                >
                  {/* Status bar */}
                  <div
                    style={{
                      height: 14,
                      background: loja.banner_url ? 'rgba(0,0,0,0.25)' : '#a3d22a',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0 10px',
                    }}
                  >
                    <span style={{ fontSize: 7, color: '#fff', fontWeight: 600 }}>9:41</span>
                    <span style={{ fontSize: 7, color: '#fff' }}>●●●</span>
                  </div>

                  {/* Store banner */}
                  <div
                    style={{
                      height: 80,
                      background: loja.banner_url
                        ? undefined
                        : 'linear-gradient(135deg, #c1f148 0%, #a3d22a 100%)',
                      overflow: 'hidden',
                      position: 'relative',
                    }}
                  >
                    {loja.banner_url && (
                      <img
                        src={loja.banner_url}
                        alt=""
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    )}
                    {/* Gradient */}
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'linear-gradient(to bottom, transparent 30%, rgba(0,0,0,0.25) 100%)',
                      }}
                    />
                  </div>

                  {/* Identity (logo overlaps banner) */}
                  <div style={{ padding: '0 10px 0', marginTop: -18, position: 'relative' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, marginBottom: 6 }}>
                      <div
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 11,
                          border: '2.5px solid #fff',
                          overflow: 'hidden',
                          flexShrink: 0,
                          background: '#c1f148',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 14,
                          fontWeight: 800,
                          color: '#18181b',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                        }}
                      >
                        {loja.logo_url ? (
                          <img
                            src={loja.logo_url}
                            alt=""
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          loja.nome.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div style={{ paddingBottom: 2 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#0f0f0d', lineHeight: 1.2 }}>
                          {loja.nome.length > 18 ? loja.nome.slice(0, 18) + '…' : loja.nome}
                        </div>
                        {loja.tempo_entrega && (
                          <div style={{ fontSize: 8, color: '#8a8a84', marginTop: 1 }}>
                            ⏱ {loja.tempo_entrega} min ·{' '}
                            {loja.taxa_entrega === 0
                              ? 'Grátis'
                              : formatarReais(loja.taxa_entrega)}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Category pills */}
                    <div style={{ display: 'flex', gap: 4, marginBottom: 8, overflow: 'hidden' }}>
                      {['Todos', 'Destaques', 'Promoções'].map((cat, i) => (
                        <div
                          key={cat}
                          style={{
                            padding: '2px 7px',
                            borderRadius: 20,
                            fontSize: 8,
                            fontWeight: 600,
                            background: i === 0 ? '#c1f148' : '#ececea',
                            color: i === 0 ? '#18181b' : '#8a8a84',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {cat}
                        </div>
                      ))}
                    </div>

                    {/* Product grid */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: 5,
                      }}
                    >
                      {produtos.slice(0, 4).map((p) => (
                        <div
                          key={p.id}
                          style={{
                            background: '#fff',
                            borderRadius: 8,
                            overflow: 'hidden',
                            border: '1px solid #ececea',
                          }}
                        >
                          <div style={{ height: 46, background: '#f0f0ed', overflow: 'hidden' }}>
                            {p.foto_url && (
                              <img
                                src={p.foto_url}
                                alt=""
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                            )}
                          </div>
                          <div style={{ padding: '4px 5px 5px' }}>
                            <div
                              style={{
                                fontSize: 7,
                                fontWeight: 600,
                                color: '#0f0f0d',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {p.nome}
                            </div>
                            <div style={{ fontSize: 8, fontWeight: 700, color: '#a3d22a', marginTop: 1 }}>
                              {formatarReais(p.preco)}
                            </div>
                          </div>
                        </div>
                      ))}
                      {/* Placeholder cards */}
                      {Array.from({ length: Math.max(0, 4 - produtos.length) }).map((_, i) => (
                        <div
                          key={`ph-${i}`}
                          style={{
                            height: 72,
                            background: '#f6f6f3',
                            borderRadius: 8,
                            border: '1.5px dashed #dcdcd8',
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 pb-5 pt-1">
              {urlLojaCompleta ? (
                <a
                  href={urlLojaCompleta}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between w-full px-4 py-2.5 rounded-xl text-xs font-semibold hover:opacity-80 transition-opacity"
                  style={{ background: 'var(--bg-2)', color: 'var(--ink-2)' }}
                >
                  <span>Abrir no app</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              ) : (
                <div
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs"
                  style={{ background: 'var(--bg-2)', color: 'var(--ink-3)' }}
                >
                  Configure um slug para publicar sua loja
                </div>
              )}
            </div>
          </div>

          {/* Canal 2: Loja na Web */}
          <div
            className="rounded-2xl overflow-hidden border flex flex-col"
            style={{ borderColor: 'var(--line)', background: 'var(--bg)' }}
          >
            {/* Card header */}
            <div className="flex items-start justify-between p-5 pb-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: 'var(--bg-2)' }}
                  >
                    <Globe className="w-3.5 h-3.5 text-ink-2" />
                  </div>
                  <span className="text-sm font-semibold text-ink">Sua loja na web</span>
                </div>
                <p className="text-xs text-ink-3 leading-relaxed">
                  Venda fora do app — cole o link na sua bio das redes sociais
                </p>
              </div>
              <span
                className="flex-shrink-0 ml-3 text-[10px] px-2 py-0.5 rounded-full font-semibold"
                style={
                  urlLoja
                    ? { background: 'rgba(79,176,37,0.12)', color: 'var(--ok)' }
                    : { background: 'rgba(138,138,132,0.12)', color: 'var(--ink-3)' }
                }
              >
                {urlLoja ? 'Publicada' : 'Sem slug'}
              </span>
            </div>

            {/* Browser mockup */}
            <div className="px-5 pb-4 flex-1">
              <div
                className="rounded-2xl overflow-hidden"
                style={{ border: '1px solid var(--line-2)', background: 'var(--bg)' }}
              >
                {/* Browser chrome */}
                <div
                  className="flex items-center gap-2 px-3 py-2.5 border-b"
                  style={{ borderColor: 'var(--line)', background: 'var(--bg-2)' }}
                >
                  <div className="flex gap-1.5 flex-shrink-0">
                    {['#ff5f57', '#ffbd2e', '#28c840'].map((c) => (
                      <div key={c} style={{ width: 9, height: 9, borderRadius: '50%', background: c }} />
                    ))}
                  </div>
                  <div
                    className="flex-1 flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-mono truncate"
                    style={{ background: 'var(--bg-3)', color: 'var(--ink-3)' }}
                  >
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"
                        stroke="currentColor"
                        strokeWidth="2"
                      />
                    </svg>
                    {urlLoja ?? 'mallora.app/sua-loja'}
                  </div>
                </div>

                {/* Web store content */}
                <div>
                  {/* Banner */}
                  <div
                    style={{
                      height: 80,
                      background: loja.banner_url
                        ? undefined
                        : 'linear-gradient(135deg, #c1f148 0%, #a3d22a 100%)',
                      overflow: 'hidden',
                      position: 'relative',
                    }}
                  >
                    {loja.banner_url && (
                      <img
                        src={loja.banner_url}
                        alt=""
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    )}
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.35) 100%)',
                      }}
                    />
                  </div>

                  <div style={{ padding: '0 14px 14px', marginTop: -20 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 8 }}>
                      <div
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: 12,
                          border: '2.5px solid #fff',
                          overflow: 'hidden',
                          flexShrink: 0,
                          background: '#c1f148',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 16,
                          fontWeight: 800,
                          color: '#18181b',
                          boxShadow: '0 2px 10px rgba(0,0,0,0.12)',
                        }}
                      >
                        {loja.logo_url ? (
                          <img
                            src={loja.logo_url}
                            alt=""
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          loja.nome.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div style={{ paddingBottom: 2 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#0f0f0d', lineHeight: 1.2 }}>
                          {loja.nome}
                        </div>
                        {loja.descricao && (
                          <div
                            style={{
                              fontSize: 9,
                              color: '#8a8a84',
                              marginTop: 2,
                              maxWidth: 200,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {loja.descricao}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Info chips */}
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 10 }}>
                      {loja.aceita_pix && (
                        <div
                          style={{
                            padding: '2px 7px',
                            borderRadius: 20,
                            fontSize: 8,
                            background: '#ececea',
                            color: '#4a4a46',
                          }}
                        >
                          PIX
                        </div>
                      )}
                      {loja.aceita_cartao_online && (
                        <div
                          style={{
                            padding: '2px 7px',
                            borderRadius: 20,
                            fontSize: 8,
                            background: '#ececea',
                            color: '#4a4a46',
                          }}
                        >
                          Cartão
                        </div>
                      )}
                      {loja.tempo_entrega && (
                        <div
                          style={{
                            padding: '2px 7px',
                            borderRadius: 20,
                            fontSize: 8,
                            background: '#ececea',
                            color: '#4a4a46',
                          }}
                        >
                          ⏱ {loja.tempo_entrega} min
                        </div>
                      )}
                      {loja.taxa_entrega === 0 && (
                        <div
                          style={{
                            padding: '2px 7px',
                            borderRadius: 20,
                            fontSize: 8,
                            background: 'rgba(79,176,37,0.12)',
                            color: '#4fb025',
                          }}
                        >
                          Frete grátis
                        </div>
                      )}
                    </div>

                    {/* CTA */}
                    <div
                      style={{
                        padding: '6px 12px',
                        borderRadius: 20,
                        background: '#c1f148',
                        color: '#18181b',
                        fontSize: 9,
                        fontWeight: 700,
                        textAlign: 'center',
                        cursor: 'pointer',
                      }}
                    >
                      Ver cardápio completo →
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Share actions */}
            <div className="px-5 pb-5 pt-1 space-y-2">
              {urlLoja && urlLojaCompleta ? (
                <>
                  <BotaoCopiarLink url={urlLojaCompleta} urlDisplay={urlLoja} />
                  <a
                    href={urlLojaCompleta}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between w-full px-4 py-2.5 rounded-xl text-xs font-semibold hover:opacity-80 transition-opacity"
                    style={{ border: '1px solid var(--line)', color: 'var(--ink-2)' }}
                  >
                    <span>Abrir loja web</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </>
              ) : (
                <Link
                  href="/configuracoes"
                  className="flex items-center justify-between w-full px-4 py-2.5 rounded-xl text-xs font-bold hover:opacity-90 transition-opacity"
                  style={{ background: 'var(--brick)', color: 'var(--brick-ink)' }}
                >
                  <span>Configurar slug da loja</span>
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Info cards grid */}
      <div className="px-9 pb-9 grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Informações */}
        <Card>
          <SectionHeader icon={Store} label="Informações" href="/configuracoes" />
          {loja.descricao ? (
            <p className="text-sm text-ink-2 leading-relaxed mb-4">{loja.descricao}</p>
          ) : (
            <p className="text-sm text-ink-3 italic mb-4">
              Sem descrição. Adicione uma para atrair mais clientes.
            </p>
          )}
          <div className="space-y-2.5">
            {loja.telefone && <InfoRow icon={Phone} text={loja.telefone} />}
            {temEndereco && (
              <InfoRow
                icon={MapPin}
                text={`${endereco!.rua}, ${endereco!.numero}${endereco!.bairro ? ` — ${endereco!.bairro}` : ''}, ${endereco!.cidade}`}
              />
            )}
            {!loja.telefone && !temEndereco && (
              <p className="text-xs text-ink-3">Nenhum contato ou endereço cadastrado.</p>
            )}
          </div>
        </Card>

        {/* Horários */}
        <Card>
          <SectionHeader
            icon={Clock}
            label="Horários de funcionamento"
            href="/configuracoes?aba=horarios"
          />
          {Object.keys(horarios).length === 0 ? (
            <p className="text-sm text-ink-3 italic">Horários não configurados.</p>
          ) : (
            <div className="space-y-1.5">
              {DIAS_ORDEM.map((dia) => {
                const h = horarios[dia]
                return (
                  <div key={dia} className="flex items-center justify-between text-sm">
                    <span className={`font-medium w-8 ${h ? 'text-ink' : 'text-ink-3'}`}>
                      {DIAS_LABELS[dia]}
                    </span>
                    {h ? (
                      <span className="text-ink-2">
                        {h.abre} – {h.fecha}
                      </span>
                    ) : (
                      <span className="text-ink-3 text-xs">Fechado</span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        {/* Entrega */}
        <Card>
          <SectionHeader
            icon={Truck}
            label="Configurações de entrega"
            href="/configuracoes?aba=entrega"
          />
          <div className="grid grid-cols-3 gap-3 mb-4">
            <MetricChip label="Taxa" val={formatarReais(loja.taxa_entrega)} />
            <MetricChip
              label="Tempo"
              val={loja.tempo_entrega ? `${loja.tempo_entrega} min` : '—'}
            />
            <MetricChip
              label="Raio"
              val={loja.raio_entrega_km ? `${loja.raio_entrega_km} km` : '—'}
            />
          </div>
          <div
            className="flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm"
            style={{ background: 'var(--bg-2)' }}
          >
            <Truck className="w-3.5 h-3.5 flex-shrink-0 text-ink-3" />
            <span className="text-ink-2">
              {loja.usa_entregadores_proprios
                ? 'Usando meus próprios entregadores'
                : 'Usando pool de entregadores da plataforma'}
            </span>
          </div>
        </Card>

        {/* Pagamentos */}
        <Card>
          <SectionHeader
            icon={CreditCard}
            label="Métodos de pagamento"
            href="/configuracoes?aba=pagamentos"
          />
          <div className="flex flex-wrap gap-2">
            {metodosPagamento.map((m) => (
              <span
                key={m.key}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
                style={
                  m.ativo
                    ? {
                        background: 'rgba(193,241,72,0.15)',
                        color: 'var(--brick-dk)',
                        border: '1px solid var(--brick)',
                      }
                    : {
                        background: 'var(--bg-2)',
                        color: 'var(--ink-3)',
                        border: '1px solid var(--line)',
                      }
                }
              >
                {m.ativo ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                {m.label}
              </span>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

function SectionHeader({
  icon: Icon,
  label,
  href,
}: {
  icon: React.ElementType
  label: string
  href: string
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-ink-3" />
        <span className="text-sm font-semibold text-ink">{label}</span>
      </div>
      <Link
        href={href}
        className="text-xs font-medium hover:underline"
        style={{ color: 'var(--brick-dk)' }}
      >
        Editar
      </Link>
    </div>
  )
}

function InfoRow({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className="flex items-start gap-2.5 text-sm">
      <Icon className="w-4 h-4 text-ink-3 mt-0.5 flex-shrink-0" />
      <span className="text-ink-2">{text}</span>
    </div>
  )
}

function MetricChip({ label, val }: { label: string; val: string }) {
  return (
    <div className="rounded-xl px-3 py-2.5 text-center" style={{ background: 'var(--bg-2)' }}>
      <p className="text-xs text-ink-3">{label}</p>
      <p className="font-semibold text-ink text-sm mt-0.5">{val}</p>
    </div>
  )
}
