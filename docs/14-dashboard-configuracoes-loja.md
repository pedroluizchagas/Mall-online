# 14 — Dashboard — Configurações da Loja

### Plataforma Delivery Divinópolis

*Versão 1.0 — 23/03/2026*

-----

## VISAO GERAL

O módulo de configurações permite ao lojista gerenciar todos os aspectos
operacionais da sua loja: dados de exibição, horários de funcionamento,
taxas e raio de entrega, métodos de pagamento aceitos e a configuração
de entregadores. Há também uma seção de conta de recebimentos (Pagar.me)
para o lojista verificar o status do recipient e atualizar dados bancários.

As configurações são divididas em abas na mesma página para evitar
navegação fragmentada.

-----

## SERVER ACTIONS — CONFIGURACOES

### lib/actions/lojas.ts

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServer } from '@/lib/supabase/server'
import { z } from 'zod'
import type { HorariosFuncionamento } from '@mallevo/types'

const schemaDadosLoja = z.object({
  nome: z.string().min(2, 'Nome obrigatório'),
  descricao: z.string().optional(),
  telefone: z.string().min(10, 'Telefone inválido').optional(),
  taxa_entrega: z.number().int().min(0),
  tempo_entrega: z.number().int().min(1).max(180).optional(),
  raio_entrega_km: z.number().min(0).max(50).optional(),
  aceita_dinheiro: z.boolean(),
  aceita_pix: z.boolean(),
  aceita_cartao_maquininha: z.boolean(),
  aceita_cartao_online: z.boolean(),
  usa_entregadores_proprios: z.boolean(),
})

// Buscar dados da loja
export async function getDadosLoja() {
  const supabase = createSupabaseServer()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, nome_responsavel, email, telefone, cpf_cnpj, pagarme_recipient_id, pagarme_onboarding_status')
    .single()

  if (!tenant) return null

  const { data: loja } = await supabase
    .from('stores')
    .select('*')
    .eq('tenant_id', tenant.id)
    .single()

  return { tenant, loja }
}

// Atualizar dados gerais da loja
export async function atualizarDadosLoja(formData: FormData) {
  const supabase = createSupabaseServer()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .single()

  if (!tenant) return { erro: 'Tenant não encontrado' }

  const { data: loja } = await supabase
    .from('stores')
    .select('id')
    .eq('tenant_id', tenant.id)
    .single()

  if (!loja) return { erro: 'Loja não encontrada' }

  const taxa_raw = formData.get('taxa_entrega')
  const tempo_raw = formData.get('tempo_entrega')
  const raio_raw = formData.get('raio_entrega_km')

  const dados = schemaDadosLoja.safeParse({
    nome: formData.get('nome'),
    descricao: formData.get('descricao') || undefined,
    telefone: formData.get('telefone') || undefined,
    taxa_entrega: taxa_raw
      ? Math.round(parseFloat(String(taxa_raw)) * 100)
      : 0,
    tempo_entrega: tempo_raw ? parseInt(String(tempo_raw)) : undefined,
    raio_entrega_km: raio_raw ? parseFloat(String(raio_raw)) : undefined,
    aceita_dinheiro: formData.get('aceita_dinheiro') === 'true',
    aceita_pix: formData.get('aceita_pix') === 'true',
    aceita_cartao_maquininha: formData.get('aceita_cartao_maquininha') === 'true',
    aceita_cartao_online: formData.get('aceita_cartao_online') === 'true',
    usa_entregadores_proprios: formData.get('usa_entregadores_proprios') === 'true',
  })

  if (!dados.success) {
    return { erro: dados.error.errors[0].message }
  }

  const { error } = await supabase
    .from('stores')
    .update(dados.data)
    .eq('id', loja.id)
    .eq('tenant_id', tenant.id)

  if (error) return { erro: error.message }

  revalidatePath('/dashboard/configuracoes')
  return { sucesso: true }
}

// Atualizar imagens da loja (logo e banner)
export async function atualizarImagensLoja(formData: FormData) {
  const supabase = createSupabaseServer()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .single()

  if (!tenant) return { erro: 'Tenant não encontrado' }

  const { data: loja } = await supabase
    .from('stores')
    .select('id, logo_url, banner_url')
    .eq('tenant_id', tenant.id)
    .single()

  if (!loja) return { erro: 'Loja não encontrada' }

  const atualizacao: Record<string, string> = {}

  // Upload do logo
  const logo = formData.get('logo') as File | null
  if (logo && logo.size > 0) {
    const ext = logo.name.split('.').pop()
    const caminho = `${tenant.id}/logo.${ext}`

    const { error } = await supabase.storage
      .from('product-images')
      .upload(caminho, logo, {
        contentType: logo.type,
        upsert: true,
      })

    if (!error) {
      const { data: url } = supabase.storage
        .from('product-images')
        .getPublicUrl(caminho)
      atualizacao.logo_url = `${url.publicUrl}?t=${Date.now()}`
    }
  }

  // Upload do banner
  const banner = formData.get('banner') as File | null
  if (banner && banner.size > 0) {
    const ext = banner.name.split('.').pop()
    const caminho = `${tenant.id}/banner.${ext}`

    const { error } = await supabase.storage
      .from('product-images')
      .upload(caminho, banner, {
        contentType: banner.type,
        upsert: true,
      })

    if (!error) {
      const { data: url } = supabase.storage
        .from('product-images')
        .getPublicUrl(caminho)
      atualizacao.banner_url = `${url.publicUrl}?t=${Date.now()}`
    }
  }

  if (Object.keys(atualizacao).length === 0) {
    return { erro: 'Nenhuma imagem enviada' }
  }

  const { error } = await supabase
    .from('stores')
    .update(atualizacao)
    .eq('id', loja.id)
    .eq('tenant_id', tenant.id)

  if (error) return { erro: error.message }

  revalidatePath('/dashboard/configuracoes')
  return { sucesso: true }
}

// Atualizar horários de funcionamento
export async function atualizarHorarios(horarios: HorariosFuncionamento) {
  const supabase = createSupabaseServer()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .single()

  if (!tenant) return { erro: 'Tenant não encontrado' }

  const { error } = await supabase
    .from('stores')
    .update({ horarios })
    .eq('tenant_id', tenant.id)

  if (error) return { erro: error.message }

  revalidatePath('/dashboard/configuracoes')
  return { sucesso: true }
}

// Atualizar endereço da loja
export async function atualizarEndereco(formData: FormData) {
  const supabase = createSupabaseServer()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .single()

  if (!tenant) return { erro: 'Tenant não encontrado' }

  const endereco = {
    rua: formData.get('rua'),
    numero: formData.get('numero'),
    complemento: formData.get('complemento') || undefined,
    bairro: formData.get('bairro'),
    cidade: formData.get('cidade'),
    estado: formData.get('estado'),
    cep: formData.get('cep'),
  }

  const { error } = await supabase
    .from('stores')
    .update({ endereco })
    .eq('tenant_id', tenant.id)

  if (error) return { erro: error.message }

  revalidatePath('/dashboard/configuracoes')
  return { sucesso: true }
}
```

-----

## PAGINA DE CONFIGURACOES

### app/(dashboard)/configuracoes/page.tsx

```typescript
import { getDadosLoja } from '@/lib/actions/lojas'
import { ConfiguracoesAbas } from '@/components/dashboard/configuracoes-abas'

export default async function PaginaConfiguracoes() {
  const dadosLoja = await getDadosLoja()

  if (!dadosLoja?.loja) {
    return (
      <div className="p-6">
        <p className="text-gray-500">Loja não encontrada.</p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-[#1A4D3A] mb-6">
        Configurações
      </h1>
      <ConfiguracoesAbas
        loja={dadosLoja.loja}
        tenant={dadosLoja.tenant}
      />
    </div>
  )
}
```

-----

## COMPONENTE DE ABAS

### components/dashboard/configuracoes-abas.tsx

```typescript
'use client'

import { useState } from 'react'
import { AbaGeral } from './config/aba-geral'
import { AbaHorarios } from './config/aba-horarios'
import { AbaEntrega } from './config/aba-entrega'
import { AbaPagamentos } from './config/aba-pagamentos'
import { AbaRecebimentos } from './config/aba-recebimentos'

const ABAS = [
  { id: 'geral', label: 'Dados gerais' },
  { id: 'horarios', label: 'Horários' },
  { id: 'entrega', label: 'Entrega' },
  { id: 'pagamentos', label: 'Pagamentos' },
  { id: 'recebimentos', label: 'Conta de recebimentos' },
]

interface Props {
  loja: any
  tenant: any
}

export function ConfiguracoesAbas({ loja, tenant }: Props) {
  const [abaAtiva, setAbaAtiva] = useState('geral')

  return (
    <div>
      {/* Navegação por abas */}
      <div className="flex gap-1 border-b border-gray-100 mb-6 overflow-x-auto">
        {ABAS.map((aba) => (
          <button
            key={aba.id}
            onClick={() => setAbaAtiva(aba.id)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              abaAtiva === aba.id
                ? 'border-[#1A4D3A] text-[#1A4D3A]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {aba.label}
          </button>
        ))}
      </div>

      {abaAtiva === 'geral' && <AbaGeral loja={loja} />}
      {abaAtiva === 'horarios' && <AbaHorarios horarios={loja.horarios} />}
      {abaAtiva === 'entrega' && <AbaEntrega loja={loja} />}
      {abaAtiva === 'pagamentos' && <AbaPagamentos loja={loja} />}
      {abaAtiva === 'recebimentos' && (
        <AbaRecebimentos tenant={tenant} />
      )}
    </div>
  )
}
```

-----

## ABA DADOS GERAIS

### components/dashboard/config/aba-geral.tsx

```typescript
'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { useState } from 'react'
import { atualizarDadosLoja, atualizarImagensLoja } from '@/lib/actions/lojas'

function BotaoSalvar() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-[#1A4D3A] text-white px-6 py-2.5 rounded-lg text-sm
        font-medium disabled:opacity-50 hover:bg-[#163d2e] transition-colors"
    >
      {pending ? 'Salvando...' : 'Salvar'}
    </button>
  )
}

export function AbaGeral({ loja }: { loja: any }) {
  const [estadoGeral, dispatchGeral] = useFormState(atualizarDadosLoja, null)
  const [estadoImagens, dispatchImagens] = useFormState(atualizarImagensLoja, null)
  const [previewLogo, setPreviewLogo] = useState<string | null>(null)
  const [previewBanner, setPreviewBanner] = useState<string | null>(null)

  function handleImagemChange(
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (url: string) => void
  ) {
    const file = e.target.files?.[0]
    if (file) {
      const url = URL.createObjectURL(file)
      setter(url)
    }
  }

  return (
    <div className="space-y-8">
      {/* Imagens */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <h2 className="font-semibold text-gray-800 mb-4">Imagens da loja</h2>

        <form action={dispatchImagens} className="space-y-4">
          {estadoImagens?.erro && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
              {estadoImagens.erro}
            </p>
          )}
          {estadoImagens?.sucesso && (
            <p className="text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg">
              Imagens atualizadas com sucesso.
            </p>
          )}

          {/* Logo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Logo da loja
            </label>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0">
                {(previewLogo || loja.logo_url) ? (
                  <img
                    src={previewLogo || loja.logo_url}
                    alt="Logo"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center
                    text-gray-300 text-2xl">
                    ?
                  </div>
                )}
              </div>
              <div>
                <input
                  name="logo"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => handleImagemChange(e, setPreviewLogo)}
                  className="text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3
                    file:rounded-lg file:border-0 file:bg-gray-100 file:text-gray-700
                    file:text-sm file:cursor-pointer"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Recomendado: 400×400px. JPEG ou PNG.
                </p>
              </div>
            </div>
          </div>

          {/* Banner */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Banner da loja
            </label>
            <div className="space-y-2">
              <div className="w-full h-28 rounded-xl bg-gray-100 overflow-hidden">
                {(previewBanner || loja.banner_url) ? (
                  <img
                    src={previewBanner || loja.banner_url}
                    alt="Banner"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center
                    text-gray-300 text-sm">
                    Sem banner
                  </div>
                )}
              </div>
              <input
                name="banner"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => handleImagemChange(e, setPreviewBanner)}
                className="text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3
                  file:rounded-lg file:border-0 file:bg-gray-100 file:text-gray-700
                  file:text-sm file:cursor-pointer"
              />
              <p className="text-xs text-gray-400">
                Recomendado: 1200×400px. JPEG ou PNG.
              </p>
            </div>
          </div>

          <BotaoSalvar />
        </form>
      </div>

      {/* Dados gerais */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <h2 className="font-semibold text-gray-800 mb-4">Dados da loja</h2>

        <form action={dispatchGeral} className="space-y-4">
          {estadoGeral?.erro && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
              {estadoGeral.erro}
            </p>
          )}
          {estadoGeral?.sucesso && (
            <p className="text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg">
              Dados atualizados com sucesso.
            </p>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome da loja
            </label>
            <input
              name="nome"
              defaultValue={loja.nome}
              required
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5
                focus:outline-none focus:ring-2 focus:ring-[#4CAF82]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descrição
            </label>
            <textarea
              name="descricao"
              defaultValue={loja.descricao ?? ''}
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5
                focus:outline-none focus:ring-2 focus:ring-[#4CAF82] resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Telefone de contato
            </label>
            <input
              name="telefone"
              defaultValue={loja.telefone ?? ''}
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5
                focus:outline-none focus:ring-2 focus:ring-[#4CAF82]"
            />
          </div>

          {/* Campos ocultos necessários para a validação completa */}
          <input type="hidden" name="taxa_entrega"
            value={(loja.taxa_entrega / 100).toFixed(2)} />
          <input type="hidden" name="tempo_entrega"
            value={loja.tempo_entrega ?? ''} />
          <input type="hidden" name="raio_entrega_km"
            value={loja.raio_entrega_km ?? ''} />
          <input type="hidden" name="aceita_dinheiro"
            value={String(loja.aceita_dinheiro)} />
          <input type="hidden" name="aceita_pix"
            value={String(loja.aceita_pix)} />
          <input type="hidden" name="aceita_cartao_maquininha"
            value={String(loja.aceita_cartao_maquininha)} />
          <input type="hidden" name="aceita_cartao_online"
            value={String(loja.aceita_cartao_online)} />
          <input type="hidden" name="usa_entregadores_proprios"
            value={String(loja.usa_entregadores_proprios)} />

          <BotaoSalvar />
        </form>
      </div>
    </div>
  )
}
```

-----

## ABA HORARIOS

### components/dashboard/config/aba-horarios.tsx

```typescript
'use client'

import { useState, useTransition } from 'react'
import { atualizarHorarios } from '@/lib/actions/lojas'
import type { HorariosFuncionamento } from '@mallevo/types'

const DIAS = [
  { id: 'seg', label: 'Segunda-feira' },
  { id: 'ter', label: 'Terça-feira' },
  { id: 'qua', label: 'Quarta-feira' },
  { id: 'qui', label: 'Quinta-feira' },
  { id: 'sex', label: 'Sexta-feira' },
  { id: 'sab', label: 'Sábado' },
  { id: 'dom', label: 'Domingo' },
]

export function AbaHorarios({
  horarios: horariosSalvos,
}: {
  horarios: HorariosFuncionamento | null
}) {
  const [horarios, setHorarios] = useState<HorariosFuncionamento>(
    horariosSalvos ?? {}
  )
  const [isPending, startTransition] = useTransition()
  const [sucesso, setSucesso] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  function toggleDia(dia: string, ativo: boolean) {
    setHorarios((prev) => {
      if (!ativo) {
        const novo = { ...prev }
        delete (novo as any)[dia]
        return novo
      }
      return { ...prev, [dia]: { abre: '08:00', fecha: '18:00' } }
    })
  }

  function atualizarHorario(dia: string, campo: 'abre' | 'fecha', valor: string) {
    setHorarios((prev) => ({
      ...prev,
      [dia]: { ...(prev as any)[dia], [campo]: valor },
    }))
  }

  function handleSalvar() {
    setSucesso(false)
    setErro(null)
    startTransition(async () => {
      const resultado = await atualizarHorarios(horarios)
      if (resultado.erro) setErro(resultado.erro)
      else setSucesso(true)
    })
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <h2 className="font-semibold text-gray-800 mb-4">
        Horários de funcionamento
      </h2>

      {erro && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-4">
          {erro}
        </p>
      )}
      {sucesso && (
        <p className="text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg mb-4">
          Horários atualizados com sucesso.
        </p>
      )}

      <div className="space-y-3">
        {DIAS.map((dia) => {
          const horarioDia = (horarios as any)[dia.id]
          const ativo = !!horarioDia

          return (
            <div
              key={dia.id}
              className="flex items-center gap-4"
            >
              {/* Toggle do dia */}
              <div className="flex items-center gap-3 w-40">
                <button
                  type="button"
                  onClick={() => toggleDia(dia.id, !ativo)}
                  className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${
                    ativo ? 'bg-[#4CAF82]' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 bg-white rounded-full
                      shadow transition-transform ${
                      ativo ? 'translate-x-4' : 'translate-x-0.5'
                    }`}
                  />
                </button>
                <span
                  className={`text-sm ${
                    ativo ? 'text-gray-700 font-medium' : 'text-gray-400'
                  }`}
                >
                  {dia.label}
                </span>
              </div>

              {/* Inputs de horário */}
              {ativo ? (
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={horarioDia.abre}
                    onChange={(e) =>
                      atualizarHorario(dia.id, 'abre', e.target.value)
                    }
                    className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm
                      focus:outline-none focus:ring-2 focus:ring-[#4CAF82]"
                  />
                  <span className="text-gray-400 text-sm">até</span>
                  <input
                    type="time"
                    value={horarioDia.fecha}
                    onChange={(e) =>
                      atualizarHorario(dia.id, 'fecha', e.target.value)
                    }
                    className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm
                      focus:outline-none focus:ring-2 focus:ring-[#4CAF82]"
                  />
                </div>
              ) : (
                <span className="text-sm text-gray-400">Fechado</span>
              )}
            </div>
          )
        })}
      </div>

      <button
        onClick={handleSalvar}
        disabled={isPending}
        className="mt-6 bg-[#1A4D3A] text-white px-6 py-2.5 rounded-lg text-sm
          font-medium disabled:opacity-50 hover:bg-[#163d2e] transition-colors"
      >
        {isPending ? 'Salvando...' : 'Salvar horários'}
      </button>
    </div>
  )
}
```

-----

## ABA ENTREGA

### components/dashboard/config/aba-entrega.tsx

```typescript
'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { atualizarDadosLoja, atualizarEndereco } from '@/lib/actions/lojas'

function BotaoSalvar({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-[#1A4D3A] text-white px-6 py-2.5 rounded-lg text-sm
        font-medium disabled:opacity-50 hover:bg-[#163d2e] transition-colors"
    >
      {pending ? 'Salvando...' : label}
    </button>
  )
}

export function AbaEntrega({ loja }: { loja: any }) {
  const [estadoEntrega, dispatchEntrega] = useFormState(atualizarDadosLoja, null)
  const [estadoEndereco, dispatchEndereco] = useFormState(atualizarEndereco, null)

  return (
    <div className="space-y-6">

      {/* Configurações de entrega */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <h2 className="font-semibold text-gray-800 mb-4">
          Configurações de entrega
        </h2>

        <form action={dispatchEntrega} className="space-y-4">
          {estadoEntrega?.erro && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
              {estadoEntrega.erro}
            </p>
          )}
          {estadoEntrega?.sucesso && (
            <p className="text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg">
              Configurações atualizadas.
            </p>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Taxa de entrega (R$)
              </label>
              <input
                name="taxa_entrega"
                type="number"
                step="0.50"
                min="0"
                defaultValue={loja.taxa_entrega ? (loja.taxa_entrega / 100).toFixed(2) : '0'}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5
                  focus:outline-none focus:ring-2 focus:ring-[#4CAF82]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tempo médio (minutos)
              </label>
              <input
                name="tempo_entrega"
                type="number"
                min="5"
                max="180"
                defaultValue={loja.tempo_entrega ?? 45}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5
                  focus:outline-none focus:ring-2 focus:ring-[#4CAF82]"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Raio de entrega (km)
            </label>
            <input
              name="raio_entrega_km"
              type="number"
              step="0.5"
              min="0.5"
              max="50"
              defaultValue={loja.raio_entrega_km ?? 5}
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5
                focus:outline-none focus:ring-2 focus:ring-[#4CAF82]"
            />
          </div>

          {/* Tipo de entregador */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Entregadores
            </label>
            <div className="space-y-2">
              {[
                {
                  valor: 'false',
                  label: 'Pool da plataforma',
                  descricao: 'Pedidos são oferecidos para entregadores autônomos disponíveis',
                },
                {
                  valor: 'true',
                  label: 'Meus entregadores',
                  descricao: 'Apenas entregadores cadastrados na minha loja recebem pedidos',
                },
              ].map((opcao) => (
                <label
                  key={opcao.valor}
                  className={`flex items-start gap-3 p-3 border rounded-xl cursor-pointer
                    transition-colors ${
                    String(loja.usa_entregadores_proprios) === opcao.valor
                      ? 'border-[#4CAF82] bg-green-50'
                      : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <input
                    type="radio"
                    name="usa_entregadores_proprios"
                    value={opcao.valor}
                    defaultChecked={
                      String(loja.usa_entregadores_proprios) === opcao.valor
                    }
                    className="mt-0.5"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      {opcao.label}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {opcao.descricao}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Campos ocultos para campos não editados nesta aba */}
          <input type="hidden" name="nome" value={loja.nome} />
          <input type="hidden" name="descricao" value={loja.descricao ?? ''} />
          <input type="hidden" name="telefone" value={loja.telefone ?? ''} />
          <input type="hidden" name="aceita_dinheiro"
            value={String(loja.aceita_dinheiro)} />
          <input type="hidden" name="aceita_pix"
            value={String(loja.aceita_pix)} />
          <input type="hidden" name="aceita_cartao_maquininha"
            value={String(loja.aceita_cartao_maquininha)} />
          <input type="hidden" name="aceita_cartao_online"
            value={String(loja.aceita_cartao_online)} />

          <BotaoSalvar label="Salvar configurações" />
        </form>
      </div>

      {/* Endereço da loja */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <h2 className="font-semibold text-gray-800 mb-4">
          Endereço da loja
        </h2>

        <form action={dispatchEndereco} className="space-y-4">
          {estadoEndereco?.erro && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
              {estadoEndereco.erro}
            </p>
          )}
          {estadoEndereco?.sucesso && (
            <p className="text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg">
              Endereço atualizado.
            </p>
          )}

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rua
              </label>
              <input
                name="rua"
                defaultValue={loja.endereco?.rua ?? ''}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5
                  focus:outline-none focus:ring-2 focus:ring-[#4CAF82]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Número
              </label>
              <input
                name="numero"
                defaultValue={loja.endereco?.numero ?? ''}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5
                  focus:outline-none focus:ring-2 focus:ring-[#4CAF82]"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Complemento
            </label>
            <input
              name="complemento"
              defaultValue={loja.endereco?.complemento ?? ''}
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5
                focus:outline-none focus:ring-2 focus:ring-[#4CAF82]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bairro
              </label>
              <input
                name="bairro"
                defaultValue={loja.endereco?.bairro ?? ''}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5
                  focus:outline-none focus:ring-2 focus:ring-[#4CAF82]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                CEP
              </label>
              <input
                name="cep"
                defaultValue={loja.endereco?.cep ?? ''}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5
                  focus:outline-none focus:ring-2 focus:ring-[#4CAF82]"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cidade
              </label>
              <input
                name="cidade"
                defaultValue={loja.endereco?.cidade ?? 'Divinópolis'}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5
                  focus:outline-none focus:ring-2 focus:ring-[#4CAF82]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estado
              </label>
              <input
                name="estado"
                defaultValue={loja.endereco?.estado ?? 'MG'}
                maxLength={2}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5
                  focus:outline-none focus:ring-2 focus:ring-[#4CAF82] uppercase"
              />
            </div>
          </div>

          <BotaoSalvar label="Salvar endereço" />
        </form>
      </div>
    </div>
  )
}
```

-----

## ABA PAGAMENTOS

### components/dashboard/config/aba-pagamentos.tsx

```typescript
'use client'

import { useState, useTransition } from 'react'
import { atualizarDadosLoja } from '@/lib/actions/lojas'

const METODOS = [
  {
    id: 'aceita_dinheiro',
    label: 'Dinheiro na entrega',
    descricao: 'Entregador recebe em dinheiro e faz o troco',
  },
  {
    id: 'aceita_pix',
    label: 'PIX na entrega',
    descricao: 'Consumidor paga por PIX direto ao entregador',
  },
  {
    id: 'aceita_cartao_maquininha',
    label: 'Cartão na maquininha',
    descricao: 'Entregador leva a maquininha para o pagamento',
  },
  {
    id: 'aceita_cartao_online',
    label: 'Cartão ou PIX online',
    descricao: 'Pagamento via Pagar.me no app — necessário recipient ativo',
  },
]

export function AbaPagamentos({ loja }: { loja: any }) {
  const [metodos, setMetodos] = useState({
    aceita_dinheiro: loja.aceita_dinheiro,
    aceita_pix: loja.aceita_pix,
    aceita_cartao_maquininha: loja.aceita_cartao_maquininha,
    aceita_cartao_online: loja.aceita_cartao_online,
  })
  const [isPending, startTransition] = useTransition()
  const [sucesso, setSucesso] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  function handleSalvar() {
    setSucesso(false)
    setErro(null)

    const formData = new FormData()
    formData.set('nome', loja.nome)
    formData.set('descricao', loja.descricao ?? '')
    formData.set('telefone', loja.telefone ?? '')
    formData.set('taxa_entrega', (loja.taxa_entrega / 100).toFixed(2))
    formData.set('tempo_entrega', String(loja.tempo_entrega ?? 45))
    formData.set('raio_entrega_km', String(loja.raio_entrega_km ?? 5))
    formData.set('usa_entregadores_proprios',
      String(loja.usa_entregadores_proprios))

    Object.entries(metodos).forEach(([chave, valor]) => {
      formData.set(chave, String(valor))
    })

    startTransition(async () => {
      const resultado = await atualizarDadosLoja(formData)
      if (resultado.erro) setErro(resultado.erro)
      else setSucesso(true)
    })
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <h2 className="font-semibold text-gray-800 mb-4">
        Métodos de pagamento aceitos
      </h2>

      {erro && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-4">
          {erro}
        </p>
      )}
      {sucesso && (
        <p className="text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg mb-4">
          Métodos de pagamento atualizados.
        </p>
      )}

      <div className="space-y-3 mb-6">
        {METODOS.map((metodo) => (
          <label
            key={metodo.id}
            className="flex items-center gap-4 p-3 border border-gray-100
              rounded-xl cursor-pointer hover:border-gray-200 transition-colors"
          >
            <input
              type="checkbox"
              checked={(metodos as any)[metodo.id]}
              onChange={(e) =>
                setMetodos((prev) => ({
                  ...prev,
                  [metodo.id]: e.target.checked,
                }))
              }
              className="w-4 h-4 accent-[#1A4D3A]"
            />
            <div>
              <p className="text-sm font-medium text-gray-700">{metodo.label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{metodo.descricao}</p>
            </div>
          </label>
        ))}
      </div>

      <button
        onClick={handleSalvar}
        disabled={isPending}
        className="bg-[#1A4D3A] text-white px-6 py-2.5 rounded-lg text-sm
          font-medium disabled:opacity-50 hover:bg-[#163d2e] transition-colors"
      >
        {isPending ? 'Salvando...' : 'Salvar'}
      </button>
    </div>
  )
}
```

-----

## ABA RECEBIMENTOS (PAGAR.ME)

### components/dashboard/config/aba-recebimentos.tsx

```typescript
const LABELS_STATUS: Record<string, { label: string; cor: string; descricao: string }> = {
  registration: { label: 'Cadastro em análise', cor: 'bg-amber-400', descricao: 'Aguardando análise inicial dos seus dados.' },
  affiliation:  { label: 'Em afiliação', cor: 'bg-amber-400', descricao: 'Aguardando habilitação junto aos adquirentes.' },
  active:       { label: 'Conta ativa',  cor: 'bg-green-500', descricao: 'Você está pronto para receber pagamentos.' },
  refused:      { label: 'Cadastro recusado', cor: 'bg-red-500', descricao: 'Entre em contato com o suporte para revisar.' },
  suspended:    { label: 'Conta suspensa', cor: 'bg-red-500', descricao: 'Entre em contato com o suporte.' },
  blocked:      { label: 'Conta bloqueada', cor: 'bg-red-500', descricao: 'Entre em contato com o suporte.' },
}

interface Props {
  tenant: {
    pagarme_recipient_id: string | null
    pagarme_onboarding_status: string
  }
}

export function AbaRecebimentos({ tenant }: Props) {
  const status = LABELS_STATUS[tenant.pagarme_onboarding_status] ?? LABELS_STATUS.registration

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-6">
      <div>
        <h2 className="font-semibold text-gray-800 mb-1">
          Conta de recebimentos
        </h2>
        <p className="text-sm text-gray-500">
          Seu recipient no Pagar.me — recebe diretamente os splits dos pedidos.
        </p>
      </div>

      <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
        <div className={`w-3 h-3 rounded-full flex-shrink-0 ${status.cor}`} />
        <div>
          <p className="text-sm font-medium text-gray-700">{status.label}</p>
          <p className="text-xs text-gray-400 mt-0.5">{status.descricao}</p>
        </div>
      </div>

      {tenant.pagarme_recipient_id && (
        <div>
          <p className="text-xs text-gray-400 mb-1">ID do recipient (Pagar.me)</p>
          <p className="text-sm font-mono text-gray-600 bg-gray-50 px-3 py-2
            rounded-lg">
            {tenant.pagarme_recipient_id}
          </p>
        </div>
      )}

      <div className="space-y-2">
        {tenant.pagarme_onboarding_status !== 'active' && (
          <a
            href="/onboarding/recebimentos/kyc"
            className="block w-full text-center bg-[#F5A623] text-white py-2.5
              rounded-lg text-sm font-medium hover:bg-[#e09520] transition-colors"
          >
            Completar verificação (KYC)
          </a>
        )}

        <a
          href="/dashboard/configuracoes/recebimentos/dados-bancarios"
          className="block w-full text-center border border-gray-200 text-[#1A4D3A]
            py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          Atualizar dados bancários ou chave Pix
        </a>
      </div>

      <div className="text-xs text-gray-400 space-y-1">
        <p>
          Seus dados bancários são armazenados com segurança pelo Pagar.me.
          A plataforma não tem acesso direto aos dados da sua conta bancária.
        </p>
        <p>
          Liquidação automática: Pix instantâneo, cartão D+29+2 ou D+15 com
          antecipação automática. Configure seu plano de antecipação no painel
          financeiro.
        </p>
      </div>
    </div>
  )
}
```

-----

## CHECKLIST DO MODULO

- [ ] Bucket `product-images` aceita upload de logo e banner com `upsert: true`
- [ ] Cache busting na URL das imagens com `?t=Date.now()` para forçar atualização
- [ ] Horários salvos como JSONB — verificar tipo `HorariosFuncionamento` no arquivo 03
- [ ] Aba de entrega distingue pool da plataforma vs entregadores próprios
- [ ] Aba de pagamentos — `aceita_cartao_online` só deve ser habilitado se `pagarme_onboarding_status = 'active'`
- [ ] Aba de recebimentos exibe link para KYC se `pagarme_onboarding_status` ≠ `active`
- [ ] Atualização de dados bancários chama `PUT /core/v5/recipients/{id}/default-bank-account` via Server Action
- [ ] Campos ocultos preservam valores não editados em cada aba para não sobrescrever dados da loja
- [ ] Cidade padrão pré-preenchida como “Divinópolis” no campo de endereço

-----

*Arquivo 14 de 29 — Índice Mestre disponível no arquivo 00*
*Próximo: 15 — Consumer App — Auth e Estrutura*
