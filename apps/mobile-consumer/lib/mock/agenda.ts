/**
 * Disponibilidade de agendamento para o modo demonstração.
 *
 * Espelha, em memória, o contrato da edge function
 * `supabase/functions/agenda-disponibilidade` — a única parte do PDP de
 * services que não passa pelo client mock (é um `fetch` direto, autenticado).
 * Com `EXPO_PUBLIC_USE_MOCK=true` a sessão é falsa, o token não vale, e sem
 * este módulo toda loja de serviço mostraria "Erro ao buscar horários".
 *
 * Tudo é derivado de `date_from` + hash determinístico das chaves
 * (store_id, product_id, inicio_at, staff_id): a mesma loja/serviço/dia
 * devolve sempre a mesma grade — a demo não pisca a cada render.
 * Sem `Math.random()`, sem `Date.now()`.
 */

/** Slot livre — mesmo shape de `SlotApi` no ModalProduto. */
export interface SlotMock {
  inicio_at: string
  fim_at: string
  staff_ids_livres: string[]
}

export interface StaffMock {
  id: string
  nome: string
  cor: string | null
}

/** Mesmo shape de `SlotsResponse` no ModalProduto. */
export interface SlotsMockResponse {
  duracao_min: number
  staff: StaffMock[]
  slots: SlotMock[]
}

// ── Regras da grade ─────────────────────────────────────────────
/** Horário comercial da loja fictícia (minutos desde a meia-noite local). */
const ABRE_MIN = 9 * 60
const FECHA_MIN = 18 * 60
/** Sábado é meio-expediente; domingo não abre. */
const FECHA_SABADO_MIN = 13 * 60
/** Almoço: ninguém atende — garante slots totalmente ocupados na grade. */
const ALMOCO_INICIO_MIN = 12 * 60
const ALMOCO_FIM_MIN = 13 * 60
/**
 * Teto de duração para o almoço valer. O passo da grade é a duração do
 * serviço, então uma sessão longa (tatuagem de 200 min gera só 09:00–12:20 e
 * 12:20–15:40) tem TODOS os slots cruzando o meio-dia — respeitar o almoço
 * zeraria o dia inteiro, e o serviço nunca teria horário. Sessão longa é
 * bloco fechado que atravessa o meio-dia mesmo; o almoço só separa
 * atendimentos que cabem em meio período.
 */
const ALMOCO_DURACAO_MAX_MIN = 120
/** Serviço sem `metadata.duracao_min` cai aqui. */
const DURACAO_PADRAO_MIN = 60
/** Guarda de duração (evita grade absurda vinda de metadata ruim). */
const DURACAO_MIN_ACEITA = 15
const DURACAO_MAX_ACEITA = 240
/** Mesma janela máxima da edge function. */
const MAX_DIAS = 14
/** % de slots que caem como "já agendado" para cada profissional. */
const OCUPACAO_PCT = 32

/**
 * Equipe possível. Cada loja recebe uma fatia contígua (2 ou 3 pessoas)
 * escolhida pelo hash do store_id — nomes e cores estáveis por loja.
 */
const EQUIPE: Array<{ nome: string; cor: string }> = [
  { nome: 'Juliana Prado', cor: '#E0567A' },
  { nome: 'Marcelo Tavares', cor: '#2F7DD1' },
  { nome: 'Renata Vilela', cor: '#3FA88A' },
  { nome: 'Otávio Bastos', cor: '#E08A2F' },
  { nome: 'Cristiane Muniz', cor: '#8B5CD6' },
  { nome: 'Wesley Andrade', cor: '#D2483F' },
]

/** FNV-1a 32 bits — barato, estável e bem espalhado para chaves curtas. */
function hash32(chave: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < chave.length; i++) {
    h ^= chave.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

function partesYmd(ymd: string): [number, number, number] {
  const [a, m, d] = ymd.split('-').map((s) => parseInt(s, 10))
  return [a, m, d]
}

function ymdDe(data: Date): string {
  const mes = String(data.getMonth() + 1).padStart(2, '0')
  const dia = String(data.getDate()).padStart(2, '0')
  return `${data.getFullYear()}-${mes}-${dia}`
}

/**
 * "YYYY-MM-DD" + minutos do dia → ISO UTC.
 * A data é montada no fuso do aparelho de propósito: o PDP formata o slot com
 * `new Date(iso).getHours()`, então 09:00 aqui é 09:00 na tela, seja qual for
 * o fuso do device rodando a demo.
 */
function isoLocal(ymd: string, minutosDoDia: number): string {
  const [ano, mes, dia] = partesYmd(ymd)
  const dt = new Date(ano, mes - 1, dia, 0, 0, 0, 0)
  dt.setMinutes(minutosDoDia)
  return dt.toISOString()
}

/** Dias do intervalo [date_from, date_to), no máximo MAX_DIAS. */
function listarDias(dateFrom: string, dateTo: string): string[] {
  const [aF, mF, dF] = partesYmd(dateFrom)
  const cursor = new Date(aF, mF - 1, dF)
  const [aT, mT, dT] = partesYmd(dateTo)
  const fim = new Date(aT, mT - 1, dT)
  const dias: string[] = []
  while (cursor < fim && dias.length < MAX_DIAS) {
    dias.push(ymdDe(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  // Chamador que passou date_to inválido (ou igual a date_from) ainda vê o
  // dia pedido — na demo é melhor mostrar horários do que uma tela vazia.
  return dias.length > 0 ? dias : [dateFrom]
}

/** Fecha do dia: domingo (0) fechado, sábado (6) meio-expediente. */
function fechamentoDoDia(ymd: string): number | null {
  const [ano, mes, dia] = partesYmd(ymd)
  const semana = new Date(ano, mes - 1, dia).getDay()
  if (semana === 0) return null
  if (semana === 6) return FECHA_SABADO_MIN
  return FECHA_MIN
}

function equipeDaLoja(storeId: string): StaffMock[] {
  const h = hash32(`equipe|${storeId}`)
  const inicio = h % EQUIPE.length
  const quantidade = 2 + ((h >>> 8) % 2) // 2 ou 3 profissionais
  const out: StaffMock[] = []
  for (let i = 0; i < quantidade; i++) {
    const idx = (inicio + i) % EQUIPE.length
    out.push({
      id: `agenda-staff-${storeId}-${idx}`,
      nome: EQUIPE[idx].nome,
      cor: EQUIPE[idx].cor,
    })
  }
  return out
}

/** Folga semanal fixa de cada profissional: 1 (seg) a 6 (sáb). */
function diaDeFolga(storeId: string, staffId: string): number {
  return (hash32(`folga|${storeId}|${staffId}`) % 6) + 1
}

function sobrepoeAlmoco(inicioMin: number, fimMin: number): boolean {
  return inicioMin < ALMOCO_FIM_MIN && fimMin > ALMOCO_INICIO_MIN
}

function normalizarDuracao(bruta: number | null | undefined): number {
  if (typeof bruta !== 'number' || !Number.isFinite(bruta) || bruta <= 0) {
    return DURACAO_PADRAO_MIN
  }
  return Math.min(DURACAO_MAX_ACEITA, Math.max(DURACAO_MIN_ACEITA, Math.round(bruta)))
}

/**
 * Grade de horários do serviço no intervalo [date_from, date_to).
 *
 * Disponibilidade de cada par (slot, profissional), nesta ordem:
 *   1. domingo fechado, sábado só até 13h;
 *   2. slot que encosta no almoço (12h–13h) não tem ninguém — é assim que
 *      aparecem os horários totalmente ocupados. Vale só para serviço de até
 *      ALMOCO_DURACAO_MAX_MIN: sessão longa é bloco fechado e atravessa o
 *      meio-dia, senão o dia inteiro ficaria sem horário;
 *   3. profissional de folga naquele dia da semana não atende;
 *   4. senão, ocupado quando hash(store_id, product_id, inicio_at, staff_id)
 *      cai nos primeiros OCUPACAO_PCT% — determinístico, logo estável.
 */
export function slotsMock(input: {
  store_id: string
  product_id: string
  date_from: string
  date_to: string
  duracao_min?: number | null
}): SlotsMockResponse {
  const { store_id, product_id, date_from, date_to } = input
  const duracao_min = normalizarDuracao(input.duracao_min)
  const staff = equipeDaLoja(store_id)
  const folgas = new Map(staff.map((s) => [s.id, diaDeFolga(store_id, s.id)]))
  const respeitaAlmoco = duracao_min <= ALMOCO_DURACAO_MAX_MIN

  const slots: SlotMock[] = []

  for (const dia of listarDias(date_from, date_to)) {
    const fechaMin = fechamentoDoDia(dia)
    if (fechaMin === null) continue // domingo: sem atendimento
    const [ano, mes, d] = partesYmd(dia)
    const diaSemana = new Date(ano, mes - 1, d).getDay()

    // Passo da grade = duração do serviço (slots encadeados, sem sobra).
    for (
      let inicioMin = ABRE_MIN;
      inicioMin + duracao_min <= fechaMin;
      inicioMin += duracao_min
    ) {
      const fimMin = inicioMin + duracao_min
      const inicio_at = isoLocal(dia, inicioMin)
      const fim_at = isoLocal(dia, fimMin)

      const livres: string[] = []
      if (!respeitaAlmoco || !sobrepoeAlmoco(inicioMin, fimMin)) {
        for (const s of staff) {
          if (folgas.get(s.id) === diaSemana) continue
          const sorte = hash32(`${store_id}|${product_id}|${inicio_at}|${s.id}`) % 100
          if (sorte < OCUPACAO_PCT) continue
          livres.push(s.id)
        }
      }

      // Slot sem ninguém livre é mantido de propósito: o PDP o desenha como
      // horário indisponível, o que dá leitura de agenda cheia na demo.
      slots.push({ inicio_at, fim_at, staff_ids_livres: livres })
    }
  }

  return { duracao_min, staff, slots }
}
