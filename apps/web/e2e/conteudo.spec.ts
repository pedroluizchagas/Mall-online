import { expect, test, type Page } from '@playwright/test'

/**
 * Fase 1c da convergência — o lojista gere e publica conteúdo do Explorar
 * pelo web. Dados: supabase/seed.sql (lojista qa@mallevo.local com
 * recebimentos ativos, loja "Forno Demo", um post de foto publicado).
 */
const QA = { email: 'qa@mallevo.local', senha: 'mallevo-qa-2026' }
const POST_SEED = '20000000-0000-4000-8000-000000000001'

// PNG 2×2 vermelho — o menor arquivo que o pipeline de foto aceita.
const PNG_MINIMO = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVQIW2P8z8DwnwEIGBkYGBgYAAAaAAP/8Yt3AAAAAElFTkSuQmCC',
  'base64',
)

async function entrar(page: Page) {
  await page.goto('/entrar')
  await page.getByPlaceholder('hi@mallevo.com').fill(QA.email)
  await page.locator('input[name="senha"]').fill(QA.senha)
  await page.getByRole('button', { name: /entrar na conta/i }).click()
  await page.waitForURL((url) => !url.pathname.startsWith('/entrar'), { timeout: 60_000 })
}

async function dispensarTutorial(page: Page) {
  const pular = page.getByRole('button', { name: /pular tutorial/i })
  if (await pular.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await pular.click()
    await expect(page.getByRole('dialog')).toBeHidden()
  }
}

test.describe('Conteúdo', () => {
  test('lista o post do seed com métricas e filtra por estado', async ({ page }) => {
    await entrar(page)
    await page.goto('/conteudo')
    await dispensarTutorial(page)

    await expect(page.getByRole('heading', { name: 'Conteúdo' })).toBeVisible()
    const grade = page.getByRole('list', { name: 'Publicações' })
    await expect(grade.getByRole('link', { name: /Foto, 340 visualizações, Publicado/ })).toBeVisible()

    // Métricas somam o que o consumer incrementou. O número aparece duas vezes
    // na página (KPI e pílula do cartaz), então a asserção é na região de
    // métricas, que tem nome acessível próprio.
    const metricas = page.getByRole('region', { name: 'Métricas do conteúdo' })
    await expect(metricas.getByText('Visualizações')).toBeVisible()
    await expect(metricas.getByText('340', { exact: true })).toBeVisible()

    // Filtro por estado "Ocultos" esconde o post publicado.
    await page.getByRole('button', { name: 'Ocultos' }).click()
    await expect(page).toHaveURL(/estado=ocultos/)
    await expect(page.getByText('Nada com esse filtro')).toBeVisible()
  })

  test('edita legenda e tags, oculta e volta a publicar', async ({ page }) => {
    await entrar(page)
    await page.goto(`/conteudo/${POST_SEED}`)
    await dispensarTutorial(page)

    // Idem: a legenda é sobrescrita aqui, então não afirmamos a do seed — só
    // que existe uma e que a edição sobrevive ao reload.
    const legenda = page.getByLabel('Legenda')
    await expect(legenda).not.toHaveValue('')
    const nova = `Margherita do forno (${Date.now().toString().slice(-4)})`
    await legenda.fill(nova)
    // O campo tem `<label for>` ("Tags · N/M"); "Adicionar tag…" é só o
    // placeholder, e `getByLabel` não olha para placeholder.
    // A tag pode ter sobrado de uma execução anterior: tira antes de pôr, para
    // o teste valer tanto no banco recém-semeado quanto num já usado.
    const removerTag = page.getByRole('button', { name: 'Remover tag fermentacao-natural' })
    if (await removerTag.count()) await removerTag.click()
    await page.getByPlaceholder('Adicionar tag…').fill('Fermentação Natural')
    await page.getByRole('button', { name: 'Adicionar tag' }).click()
    await expect(removerTag).toBeVisible()
    await page.getByRole('button', { name: /salvar alterações/i }).click()
    await expect(page.getByText('Alterações salvas')).toBeVisible()

    await page.reload()
    await expect(page.getByLabel('Legenda')).toHaveValue(nova)
    await expect(page.getByRole('button', { name: 'Remover tag fermentacao-natural' })).toBeVisible()

    // Visibilidade: ocultar tira do feed na hora; o badge do cabeçalho acompanha.
    const visivel = page.getByRole('switch', { name: 'Visível no Explorar' })
    await visivel.click()
    await expect(page.getByText('Post oculto do Explorar')).toBeVisible()
    await expect(page.getByText('Oculto', { exact: true }).first()).toBeVisible()
    await visivel.click()
    await expect(page.getByText('Post de volta ao Explorar')).toBeVisible()
  })

  test('publica uma foto pelo navegador e ela aparece na grade', async ({ page }) => {
    await entrar(page)
    await page.goto('/conteudo/novo')
    await dispensarTutorial(page)

    await page.getByLabel('Escolher foto ou vídeo').setInputFiles({
      name: 'post.png',
      mimeType: 'image/png',
      buffer: PNG_MINIMO,
    })
    await expect(page.getByText('Foto ·')).toBeVisible()

    const legenda = `Publicado pelo web ${Date.now().toString().slice(-5)}`
    await page.getByLabel('Legenda').fill(legenda)
    await page.getByRole('button', { name: /publicar no explorar/i }).click()
    await expect(page.getByRole('heading', { name: 'Publicado!' })).toBeVisible({ timeout: 30_000 })

    await page.getByRole('link', { name: 'Ver o post' }).click()
    await expect(page.getByLabel('Legenda')).toHaveValue(legenda)

    await page.goto('/conteudo')
    await expect(page.getByRole('list', { name: 'Publicações' }).getByRole('link', { name: new RegExp(legenda) })).toBeVisible()
  })
})
