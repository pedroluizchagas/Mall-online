import { expect, test, type Page } from '@playwright/test'

/**
 * Fase 1 da convergência — o lojista produz o que as vitrines leem.
 * Dados: supabase/seed.sql (lojista qa@mallevo.local, loja "Forno Demo",
 * arquétipo slice em alimentos-bebidas → vitrine Forno).
 */
const QA = { email: 'qa@mallevo.local', senha: 'mallevo-qa-2026' }
const PRODUTO_MARGHERITA = '10000000-0000-4000-8000-000000000001'

async function entrar(page: Page) {
  await page.goto('/entrar')
  await page.getByPlaceholder('hi@mallevo.com').fill(QA.email)
  await page.locator('input[name="senha"]').fill(QA.senha)
  await page.getByRole('button', { name: /entrar na conta/i }).click()
  await page.waitForURL((url) => !url.pathname.startsWith('/entrar'), { timeout: 60_000 })
}

/** O tour de boas-vindas (tenant novo) é modal e bloqueia cliques: dispensa se aparecer. */
async function dispensarTutorial(page: Page) {
  const pular = page.getByRole('button', { name: /pular tutorial/i })
  if (await pular.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await pular.click()
    await expect(page.getByRole('dialog')).toBeHidden()
  }
}

test.describe('Minha Loja', () => {
  test('avisa a vitrine ativada e persiste o conteúdo da vitrine', async ({ page }) => {
    await entrar(page)
    await page.goto('/minha-loja')
    await dispensarTutorial(page)

    // Badge lê a mesma tabela VITRINES do consumer/storefront.
    await expect(page.getByText('Vitrine ativada: Forno')).toBeVisible()

    // Seção nova, com o conteúdo do seed carregado.
    await expect(page.getByText('CONTEÚDO DA VITRINE', { exact: true })).toBeVisible()
    const titulo = page.getByPlaceholder('A manchete da sua vitrine')
    await expect(titulo).toHaveValue('Pizza em dobro às terças')

    // Edita, publica, recarrega — o que vejo é o que ficou gravado.
    const novoTitulo = `Pizza em dobro (${Date.now().toString().slice(-4)})`
    await titulo.fill(novoTitulo)
    await page.getByRole('button', { name: /publicar alterações/i }).click()
    await expect(page.getByRole('button', { name: /publicado!|publicar alterações/i })).toBeEnabled()
    await expect(page.getByText('Vitrine publicada', { exact: true })).toBeVisible()

    await page.reload()
    await expect(page.getByPlaceholder('A manchete da sua vitrine')).toHaveValue(novoTitulo)

    // Destaques do seed aparecem no seletor, na ordem.
    await expect(page.getByRole('listitem').filter({ hasText: 'Margherita' })).toBeVisible()

    // Preview = o storefront REAL (iframe) vestindo o rascunho: a vitrine Forno
    // usa o título da campanha como wordmark, então o novo título já aparece
    // lá antes de qualquer publicação — e o fecho prova que é a loja inteira.
    const iframe = page.locator('iframe[title="Preview da loja"]')
    await expect(iframe).toHaveAttribute('src', /\/preview\?draft=/)
    const preview = page.frameLocator('iframe[title="Preview da loja"]')
    await expect(preview.getByText('Uma loja do Mallevo')).toBeVisible({ timeout: 60_000 })
    // O wordmark do Forno parte o título em linhas (spans sem espaço entre si).
    await expect(preview.getByRole('heading', { level: 1 })).toContainText(/pizza\s*em dobro/i)
    await page.locator('div').filter({ hasText: /^Preview ao vivo/ }).last().screenshot({
      path: 'test-results/shots/minha-loja-preview.png',
    })

    // Moldura "App Mallevo": a mesma página com `?app=1`, e o storefront veste
    // o chrome do app — a barra de menu Início/Explorar/Pedidos/Perfil.
    await page.getByRole('button', { name: 'App Mallevo' }).click()
    await expect(iframe).toHaveAttribute('src', /[?&]app=1/)
    const menuApp = preview.getByRole('navigation', { name: 'Menu do app' })
    await expect(menuApp.getByText('Explorar')).toBeVisible({ timeout: 60_000 })
    await expect(preview.getByRole('heading', { level: 1 })).toContainText(/pizza\s*em dobro/i)
    await page.locator('div').filter({ hasText: /^Preview ao vivo/ }).last().screenshot({
      path: 'test-results/shots/minha-loja-preview-app.png',
    })
    // O shell do dashboard rola num contêiner interno: `fullPage` não alcança
    // o que está abaixo da dobra, então a evidência visual é o bloco em si.
    await page.screenshot({ path: 'test-results/shots/minha-loja.png' })
    const secaoConteudo = page.getByText('CONTEÚDO DA VITRINE', { exact: true }).locator('..')
    await secaoConteudo.scrollIntoViewIfNeeded()
    await secaoConteudo.screenshot({ path: 'test-results/shots/minha-loja-conteudo.png' })
  })
})

test.describe('Produto', () => {
  test('mostra Mídia e vitrine com a galeria do seed e persiste a ficha técnica', async ({ page }) => {
    await entrar(page)
    await page.goto(`/produtos/${PRODUTO_MARGHERITA}`)
    await dispensarTutorial(page)

    const bloco = page.locator('div').filter({ hasText: /^Mídia e vitrine/ }).first()
    await expect(page.getByText('Mídia e vitrine')).toBeVisible()
    // Galeria do seed: 2 fotos mantidas (botões "Remover foto").
    await expect(page.getByRole('button', { name: 'Remover foto' })).toHaveCount(2)
    // Recorte do seed.
    await expect(page.getByRole('button', { name: 'Remover recorte' })).toBeVisible()
    // Ficha técnica do seed.
    await expect(page.getByPlaceholder('Rótulo').first()).toHaveValue('Tamanho')

    // Adiciona uma linha e salva.
    await page.getByRole('button', { name: /adicionar linha/i }).click()
    const rotulos = page.getByPlaceholder('Rótulo')
    const valores = page.getByPlaceholder('Valor')
    const n = await rotulos.count()
    await rotulos.nth(n - 1).fill('Origem')
    await valores.nth(n - 1).fill('Farinha italiana tipo 00')
    await page.getByRole('button', { name: /salvar|atualizar/i }).click()
    await page.waitForURL(/\/produtos(\?|$)/, { timeout: 60_000 })

    await page.goto(`/produtos/${PRODUTO_MARGHERITA}`)
    await expect(page.getByPlaceholder('Rótulo').nth(2)).toHaveValue('Origem')
    await expect(page.getByPlaceholder('Valor').nth(2)).toHaveValue('Farinha italiana tipo 00')
    await page.screenshot({ path: 'test-results/shots/produto-midia.png' })
    const secaoMidia = page.getByText('Mídia e vitrine', { exact: true }).locator('xpath=ancestor::div[contains(@class,"rounded-xl")][1]')
    await secaoMidia.scrollIntoViewIfNeeded()
    await secaoMidia.screenshot({ path: 'test-results/shots/produto-midia-bloco.png' })
    void bloco
  })
})
