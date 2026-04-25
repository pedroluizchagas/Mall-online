import { z } from 'zod'

export const schemaDadosResponsavel = z.object({
  nome_responsavel: z.string().min(3, 'Nome completo obrigatório'),
  cpf_cnpj: z
    .string()
    .min(11, 'CPF ou CNPJ inválido')
    .max(18, 'CPF ou CNPJ inválido')
    .regex(/^[\d.\-\/]+$/, 'Apenas números e pontuação'),
  telefone: z
    .string()
    .min(10, 'Telefone inválido')
    .max(15, 'Telefone inválido'),
  email: z.string().email('Email inválido'),
  senha: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres'),
})

export const schemaDadosLoja = z.object({
  nome_loja: z.string().min(2, 'Nome da loja obrigatório'),
  categoria_id: z.string().uuid('Selecione uma categoria'),
  endereco: z.object({
    cep: z.string().length(8, 'CEP inválido'),
    rua: z.string().min(3, 'Rua obrigatória'),
    numero: z.string().min(1, 'Número obrigatório'),
    complemento: z.string().optional(),
    bairro: z.string().min(2, 'Bairro obrigatório'),
    cidade: z.string().min(2, 'Cidade obrigatória'),
    estado: z.string().length(2, 'Estado inválido'),
  }),
})

export const schemaEscolhaPlano = z.object({
  plan_id: z.string().uuid('Selecione um plano'),
})

export type DadosResponsavel = z.infer<typeof schemaDadosResponsavel>
export type DadosLoja = z.infer<typeof schemaDadosLoja>
export type EscolhaPlano = z.infer<typeof schemaEscolhaPlano>
