/**
 * Gradientes inline (PNG 1px de largura, data URI) usados pelas vitrines de
 * arquétipo — evitam dependência de gradiente nativo.
 *
 * - GRADIENTE_HERO: perfil de DUAS bandas (topo p/ ícones, base p/ texto),
 *   específico de hero full-bleed que ocupa o quadro inteiro.
 * - SCRIM_TOPO: rampa ÚNICA (denso em cima → alpha 0 exato na base) para
 *   faixas de topo — usar o hero rotacionado aqui criaria uma linha de corte.
 */
export const GRADIENTE_HERO =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAABgCAYAAADcvRh2AAAAs0lEQVR42rXQMQtBYRTG8SMiF4m4KZESEbldqVvqllKEKGVQBmUwKIPBYFAGg+EOBotvy/8t5xt46/2N55znERFZfr8sYAYTGMEQBuBDHzzoQRccaEMT6lCFCpShCAXIQxbSkAQLYhCBkPzhmaFh3RHVlXFIQEqvykAObD3cRChpLBOwBg1oQQdcLcfTwnwt0dQ5hinM5df9CtawgS3sYA8HOMIJznCBK9zgDg8I4AkveH8AulgR2ymJR9MAAAAASUVORK5CYII='

export const SCRIM_TOPO =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAABACAYAAADbER1AAAAAhElEQVR42k3EXWeCYQCA4adPfViWKUmSTJJIIiORSEQkIiIiIqKDGKOD2A+v6+TVzX2FEML/6/DAHX/4xQ1XXHDGCUccsMcOW2ywxgpLLDDHDFNMMMYIPxhigD566KKDNlr4RhMN1FFDFRWUUcIXivhEAR/II4csMkgjhSQSEXHEIt56AnLKDLBZxh60AAAAAElFTkSuQmCC'
