/**
 * Períodos do relatório — a implementação vive em @mallevo/lib
 * (src/relatorios/periodo.ts), compartilhada com o Partner App.
 * Este módulo re-exporta para manter os imports locais estáveis.
 */
export {
  PERIODOS_VALIDOS,
  ROTULOS_PERIODO,
  periodoValido,
  intervaloPeriodo,
  intervaloAnterior,
} from '@mallevo/lib'
export type { Periodo, IntervaloDatas } from '@mallevo/lib'
