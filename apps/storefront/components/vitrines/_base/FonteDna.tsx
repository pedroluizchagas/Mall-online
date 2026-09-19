/**
 * Fonte de DNA de uma vitrine (Archivo Black do forno, Shrikhand da ritual,
 * Baloo 2 + Caveat da horta): NÃO é token do tema — é a voz do layout, igual
 * em toda loja que veste a vitrine. Carregada só quando a vitrine renderiza,
 * pelo mesmo mecanismo do tema (Google Fonts css2, `display=swap`).
 *
 * `familias`: [['Archivo Black', [400]], ['Caveat', [700]]].
 */
export function FonteDna({ familias }: { familias: ReadonlyArray<readonly [string, readonly number[]]> }) {
  if (familias.length === 0) return null
  const partes = familias.map(
    ([familia, pesos]) =>
      `family=${familia.replace(/ /g, '+')}:wght@${[...pesos].sort((a, b) => a - b).join(';')}`,
  )
  const href = `https://fonts.googleapis.com/css2?${partes.join('&')}&display=swap`
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="stylesheet" href={href} />
    </>
  )
}
