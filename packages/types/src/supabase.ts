import type { StoreTheme } from './domain'

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      categories: {
        Row: {
          ativa: boolean
          atualizado_em: string
          criado_em: string
          descricao: string | null
          icone: string | null
          id: string
          nome: string
          ordem: number
          store_id: string | null
          tenant_id: string | null
        }
        Insert: {
          ativa?: boolean
          atualizado_em?: string
          criado_em?: string
          descricao?: string | null
          icone?: string | null
          id?: string
          nome: string
          ordem?: number
          store_id?: string | null
          tenant_id?: string | null
        }
        Update: {
          ativa?: boolean
          atualizado_em?: string
          criado_em?: string
          descricao?: string | null
          icone?: string | null
          id?: string
          nome?: string
          ordem?: number
          store_id?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      consumers: {
        Row: {
          atualizado_em: string
          criado_em: string
          enderecos: Json | null
          foto_url: string | null
          id: string
          nome: string
          telefone: string | null
          user_id: string
        }
        Insert: {
          atualizado_em?: string
          criado_em?: string
          enderecos?: Json | null
          foto_url?: string | null
          id?: string
          nome: string
          telefone?: string | null
          user_id: string
        }
        Update: {
          atualizado_em?: string
          criado_em?: string
          enderecos?: Json | null
          foto_url?: string | null
          id?: string
          nome?: string
          telefone?: string | null
          user_id?: string
        }
        Relationships: []
      }
      courier_invites: {
        Row: {
          criada_em: string
          email: string | null
          expira_em: string
          nome: string
          telefone: string
          tenant_id: string
          token: string
          usado_em: string | null
          usado_por_courier_id: string | null
        }
        Insert: {
          criada_em?: string
          email?: string | null
          expira_em?: string
          nome: string
          telefone: string
          tenant_id: string
          token?: string
          usado_em?: string | null
          usado_por_courier_id?: string | null
        }
        Update: {
          criada_em?: string
          email?: string | null
          expira_em?: string
          nome?: string
          telefone?: string
          tenant_id?: string
          token?: string
          usado_em?: string | null
          usado_por_courier_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "courier_invites_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courier_invites_usado_por_courier_id_fkey"
            columns: ["usado_por_courier_id"]
            isOneToOne: false
            referencedRelation: "couriers"
            referencedColumns: ["id"]
          },
        ]
      }
      courier_locations: {
        Row: {
          assignment_id: string | null
          atualizado_em: string
          courier_id: string
          id: string
          latitude: number
          longitude: number
          precisao_m: number | null
        }
        Insert: {
          assignment_id?: string | null
          atualizado_em?: string
          courier_id: string
          id?: string
          latitude: number
          longitude: number
          precisao_m?: number | null
        }
        Update: {
          assignment_id?: string | null
          atualizado_em?: string
          courier_id?: string
          id?: string
          latitude?: number
          longitude?: number
          precisao_m?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "courier_locations_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "delivery_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courier_locations_courier_id_fkey"
            columns: ["courier_id"]
            isOneToOne: true
            referencedRelation: "couriers"
            referencedColumns: ["id"]
          },
        ]
      }
      couriers: {
        Row: {
          aprovado_em: string | null
          aprovado_por: string | null
          atualizado_em: string
          cnh_foto_url: string | null
          cnh_numero: string | null
          cpf: string | null
          criado_em: string
          foto_url: string | null
          id: string
          nome: string
          online: boolean
          pagarme_onboarding_status: string
          pagarme_recipient_id: string | null
          status: Database["public"]["Enums"]["courier_status"]
          telefone: string | null
          tenant_id: string | null
          tipo: Database["public"]["Enums"]["courier_type"]
          user_id: string
          veiculo_placa: string | null
          veiculo_tipo: string | null
        }
        Insert: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          atualizado_em?: string
          cnh_foto_url?: string | null
          cnh_numero?: string | null
          cpf?: string | null
          criado_em?: string
          foto_url?: string | null
          id?: string
          nome: string
          online?: boolean
          pagarme_onboarding_status?: string
          pagarme_recipient_id?: string | null
          status?: Database["public"]["Enums"]["courier_status"]
          telefone?: string | null
          tenant_id?: string | null
          tipo?: Database["public"]["Enums"]["courier_type"]
          user_id: string
          veiculo_placa?: string | null
          veiculo_tipo?: string | null
        }
        Update: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          atualizado_em?: string
          cnh_foto_url?: string | null
          cnh_numero?: string | null
          cpf?: string | null
          criado_em?: string
          foto_url?: string | null
          id?: string
          nome?: string
          online?: boolean
          pagarme_onboarding_status?: string
          pagarme_recipient_id?: string | null
          status?: Database["public"]["Enums"]["courier_status"]
          telefone?: string | null
          tenant_id?: string | null
          tipo?: Database["public"]["Enums"]["courier_type"]
          user_id?: string
          veiculo_placa?: string | null
          veiculo_tipo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "couriers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_assignments: {
        Row: {
          aceito_em: string | null
          atualizado_em: string
          cancelado_em: string | null
          codigo_confirmacao: string | null
          coletado_em: string | null
          comprovante_url: string | null
          courier_id: string
          criado_em: string
          entregue_em: string | null
          id: string
          order_id: string
          pagarme_transfer_id: string | null
          status: Database["public"]["Enums"]["delivery_status"]
          tenant_id: string
          valor_entrega: number
        }
        Insert: {
          aceito_em?: string | null
          atualizado_em?: string
          cancelado_em?: string | null
          codigo_confirmacao?: string | null
          coletado_em?: string | null
          comprovante_url?: string | null
          courier_id: string
          criado_em?: string
          entregue_em?: string | null
          id?: string
          order_id: string
          pagarme_transfer_id?: string | null
          status?: Database["public"]["Enums"]["delivery_status"]
          tenant_id: string
          valor_entrega?: number
        }
        Update: {
          aceito_em?: string | null
          atualizado_em?: string
          cancelado_em?: string | null
          codigo_confirmacao?: string | null
          coletado_em?: string | null
          comprovante_url?: string | null
          courier_id?: string
          criado_em?: string
          entregue_em?: string | null
          id?: string
          order_id?: string
          pagarme_transfer_id?: string | null
          status?: Database["public"]["Enums"]["delivery_status"]
          tenant_id?: string
          valor_entrega?: number
        }
        Relationships: [
          {
            foreignKeyName: "delivery_assignments_courier_id_fkey"
            columns: ["courier_id"]
            isOneToOne: false
            referencedRelation: "couriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_assignments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_assignments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      message_threads: {
        Row: {
          arquivada: boolean
          consumer_id: string | null
          criada_em: string
          id: string
          nao_lidas_consumer: number
          nao_lidas_lojista: number
          order_id: string | null
          origem: string
          tenant_id: string
          ultima_em: string
        }
        Insert: {
          arquivada?: boolean
          consumer_id?: string | null
          criada_em?: string
          id?: string
          nao_lidas_consumer?: number
          nao_lidas_lojista?: number
          order_id?: string | null
          origem: string
          tenant_id: string
          ultima_em?: string
        }
        Update: {
          arquivada?: boolean
          consumer_id?: string | null
          criada_em?: string
          id?: string
          nao_lidas_consumer?: number
          nao_lidas_lojista?: number
          order_id?: string | null
          origem?: string
          tenant_id?: string
          ultima_em?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_threads_consumer_id_fkey"
            columns: ["consumer_id"]
            isOneToOne: false
            referencedRelation: "consumers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_threads_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_threads_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          autor_id: string | null
          autor_tipo: string
          corpo: string
          criada_em: string
          id: string
          metadados: Json | null
          thread_id: string
        }
        Insert: {
          autor_id?: string | null
          autor_tipo: string
          corpo: string
          criada_em?: string
          id?: string
          metadados?: Json | null
          thread_id: string
        }
        Update: {
          autor_id?: string | null
          autor_tipo?: string
          corpo?: string
          criada_em?: string
          id?: string
          metadados?: Json | null
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "message_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          criado_em: string
          id: string
          nome: string
          observacoes: string | null
          order_id: string
          preco_unit: number
          product_id: string | null
          quantidade: number
          subtotal: number
        }
        Insert: {
          criado_em?: string
          id?: string
          nome: string
          observacoes?: string | null
          order_id: string
          preco_unit: number
          product_id?: string | null
          quantidade?: number
          subtotal: number
        }
        Update: {
          criado_em?: string
          id?: string
          nome?: string
          observacoes?: string | null
          order_id?: string
          preco_unit?: number
          product_id?: string | null
          quantidade?: number
          subtotal?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          atualizado_em: string
          cancelado_em: string | null
          consumer_id: string
          criado_em: string
          endereco_entrega: Json
          forma_pagamento: string
          id: string
          motivo_cancelamento: string | null
          observacoes: string | null
          pagarme_charge_id: string | null
          pagarme_order_id: string | null
          pagarme_qr_code: string | null
          pagarme_qr_code_expires_at: string | null
          pagarme_qr_code_url: string | null
          payment_status: string
          platform_fee_amount: number
          status: Database["public"]["Enums"]["order_status"]
          store_id: string
          subtotal: number
          taxa_entrega: number
          tenant_id: string
          total: number
          troco_para: number | null
          valor_estornado: number
        }
        Insert: {
          atualizado_em?: string
          cancelado_em?: string | null
          consumer_id: string
          criado_em?: string
          endereco_entrega: Json
          forma_pagamento: string
          id?: string
          motivo_cancelamento?: string | null
          observacoes?: string | null
          pagarme_charge_id?: string | null
          pagarme_order_id?: string | null
          pagarme_qr_code?: string | null
          pagarme_qr_code_expires_at?: string | null
          pagarme_qr_code_url?: string | null
          payment_status?: string
          platform_fee_amount?: number
          status?: Database["public"]["Enums"]["order_status"]
          store_id: string
          subtotal: number
          taxa_entrega?: number
          tenant_id: string
          total: number
          troco_para?: number | null
          valor_estornado?: number
        }
        Update: {
          atualizado_em?: string
          cancelado_em?: string | null
          consumer_id?: string
          criado_em?: string
          endereco_entrega?: Json
          forma_pagamento?: string
          id?: string
          motivo_cancelamento?: string | null
          observacoes?: string | null
          pagarme_charge_id?: string | null
          pagarme_order_id?: string | null
          pagarme_qr_code?: string | null
          pagarme_qr_code_expires_at?: string | null
          pagarme_qr_code_url?: string | null
          payment_status?: string
          platform_fee_amount?: number
          status?: Database["public"]["Enums"]["order_status"]
          store_id?: string
          subtotal?: number
          taxa_entrega?: number
          tenant_id?: string
          total?: number
          troco_para?: number | null
          valor_estornado?: number
        }
        Relationships: [
          {
            foreignKeyName: "orders_consumer_id_fkey"
            columns: ["consumer_id"]
            isOneToOne: false
            referencedRelation: "consumers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payout_advance_requests: {
        Row: {
          criado_em: string
          id: string
          pagarme_anticipation_id: string | null
          payout_id: string | null
          processado_em: string | null
          solicitado_em: string
          status: string
          taxa_total: number
          tenant_id: string
          total_pedidos: number
          valor_estimado: number
        }
        Insert: {
          criado_em?: string
          id?: string
          pagarme_anticipation_id?: string | null
          payout_id?: string | null
          processado_em?: string | null
          solicitado_em?: string
          status?: string
          taxa_total: number
          tenant_id: string
          total_pedidos: number
          valor_estimado: number
        }
        Update: {
          criado_em?: string
          id?: string
          pagarme_anticipation_id?: string | null
          payout_id?: string | null
          processado_em?: string | null
          solicitado_em?: string
          status?: string
          taxa_total?: number
          tenant_id?: string
          total_pedidos?: number
          valor_estimado?: number
        }
        Relationships: [
          {
            foreignKeyName: "payout_advance_requests_payout_id_fkey"
            columns: ["payout_id"]
            isOneToOne: false
            referencedRelation: "payouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payout_advance_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payouts: {
        Row: {
          antecipado: boolean
          atualizado_em: string
          courier_id: string | null
          criado_em: string
          data_prevista: string
          data_referencia: string
          erro_mensagem: string | null
          id: string
          pagarme_anticipation_id: string | null
          pagarme_transfer_id: string | null
          processado_em: string | null
          status: Database["public"]["Enums"]["payout_status"]
          taxa_antecipacao: number
          tenant_id: string | null
          tipo: string
          total_pedidos: number
          valor_bruto: number
          valor_liquido: number
        }
        Insert: {
          antecipado?: boolean
          atualizado_em?: string
          courier_id?: string | null
          criado_em?: string
          data_prevista: string
          data_referencia: string
          erro_mensagem?: string | null
          id?: string
          pagarme_anticipation_id?: string | null
          pagarme_transfer_id?: string | null
          processado_em?: string | null
          status?: Database["public"]["Enums"]["payout_status"]
          taxa_antecipacao?: number
          tenant_id?: string | null
          tipo: string
          total_pedidos?: number
          valor_bruto: number
          valor_liquido: number
        }
        Update: {
          antecipado?: boolean
          atualizado_em?: string
          courier_id?: string | null
          criado_em?: string
          data_prevista?: string
          data_referencia?: string
          erro_mensagem?: string | null
          id?: string
          pagarme_anticipation_id?: string | null
          pagarme_transfer_id?: string | null
          processado_em?: string | null
          status?: Database["public"]["Enums"]["payout_status"]
          taxa_antecipacao?: number
          tenant_id?: string | null
          tipo?: string
          total_pedidos?: number
          valor_bruto?: number
          valor_liquido?: number
        }
        Relationships: [
          {
            foreignKeyName: "payouts_courier_id_fkey"
            columns: ["courier_id"]
            isOneToOne: false
            referencedRelation: "couriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payouts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          ativo: boolean
          atualizado_em: string
          criado_em: string
          descricao: string | null
          id: string
          max_entregadores: number
          max_lojas: number
          max_produtos: number
          nome: string
          preco_mensal: number
          stripe_price_id: string | null
          stripe_product_id: string | null
          tem_antecipacao: boolean
          tem_estoque: boolean
          tem_relatorios: boolean
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          descricao?: string | null
          id?: string
          max_entregadores?: number
          max_lojas?: number
          max_produtos?: number
          nome: string
          preco_mensal: number
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          tem_antecipacao?: boolean
          tem_estoque?: boolean
          tem_relatorios?: boolean
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          descricao?: string | null
          id?: string
          max_entregadores?: number
          max_lojas?: number
          max_produtos?: number
          nome?: string
          preco_mensal?: number
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          tem_antecipacao?: boolean
          tem_estoque?: boolean
          tem_relatorios?: boolean
        }
        Relationships: []
      }
      products: {
        Row: {
          atualizado_em: string
          category_id: string | null
          criado_em: string
          descricao: string | null
          disponivel: boolean
          foto_url: string | null
          id: string
          nome: string
          ordem: number
          preco: number
          preco_promocional: number | null
          stock_minimo: number | null
          stock_quantity: number | null
          store_id: string
          tenant_id: string
          track_stock: boolean
        }
        Insert: {
          atualizado_em?: string
          category_id?: string | null
          criado_em?: string
          descricao?: string | null
          disponivel?: boolean
          foto_url?: string | null
          id?: string
          nome: string
          ordem?: number
          preco: number
          preco_promocional?: number | null
          stock_minimo?: number | null
          stock_quantity?: number | null
          store_id: string
          tenant_id: string
          track_stock?: boolean
        }
        Update: {
          atualizado_em?: string
          category_id?: string | null
          criado_em?: string
          descricao?: string | null
          disponivel?: boolean
          foto_url?: string | null
          id?: string
          nome?: string
          ordem?: number
          preco?: number
          preco_promocional?: number | null
          stock_minimo?: number | null
          stock_quantity?: number | null
          store_id?: string
          tenant_id?: string
          track_stock?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      push_tokens: {
        Row: {
          app: string
          ativo: boolean
          atualizado_em: string
          courier_id: string | null
          criado_em: string
          id: string
          plataforma: string
          token: string
          user_id: string | null
        }
        Insert: {
          app: string
          ativo?: boolean
          atualizado_em?: string
          courier_id?: string | null
          criado_em?: string
          id?: string
          plataforma: string
          token: string
          user_id?: string | null
        }
        Update: {
          app?: string
          ativo?: boolean
          atualizado_em?: string
          courier_id?: string | null
          criado_em?: string
          id?: string
          plataforma?: string
          token?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "push_tokens_courier_id_fkey"
            columns: ["courier_id"]
            isOneToOne: false
            referencedRelation: "couriers"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          criado_em: string
          criado_por: string | null
          id: string
          motivo: string | null
          order_id: string | null
          product_id: string
          quantidade: number
          quantidade_anterior: number
          quantidade_posterior: number
          tenant_id: string
          tipo: Database["public"]["Enums"]["stock_movement_type"]
        }
        Insert: {
          criado_em?: string
          criado_por?: string | null
          id?: string
          motivo?: string | null
          order_id?: string | null
          product_id: string
          quantidade: number
          quantidade_anterior: number
          quantidade_posterior: number
          tenant_id: string
          tipo: Database["public"]["Enums"]["stock_movement_type"]
        }
        Update: {
          criado_em?: string
          criado_por?: string | null
          id?: string
          motivo?: string | null
          order_id?: string | null
          product_id?: string
          quantidade?: number
          quantidade_anterior?: number
          quantidade_posterior?: number
          tenant_id?: string
          tipo?: Database["public"]["Enums"]["stock_movement_type"]
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      store_reviews: {
        Row: {
          comentario: string | null
          consumer_id: string
          criada_em: string
          estrelas_entrega: number | null
          estrelas_loja: number
          id: string
          motivo_sinalizacao: string | null
          order_id: string
          respondida_em: string | null
          resposta_lojista: string | null
          sinalizada: boolean
          tenant_id: string
        }
        Insert: {
          comentario?: string | null
          consumer_id: string
          criada_em?: string
          estrelas_entrega?: number | null
          estrelas_loja: number
          id?: string
          motivo_sinalizacao?: string | null
          order_id: string
          respondida_em?: string | null
          resposta_lojista?: string | null
          sinalizada?: boolean
          tenant_id: string
        }
        Update: {
          comentario?: string | null
          consumer_id?: string
          criada_em?: string
          estrelas_entrega?: number | null
          estrelas_loja?: number
          id?: string
          motivo_sinalizacao?: string | null
          order_id?: string
          respondida_em?: string | null
          resposta_lojista?: string | null
          sinalizada?: boolean
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_reviews_consumer_id_fkey"
            columns: ["consumer_id"]
            isOneToOne: false
            referencedRelation: "consumers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_reviews_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assunto: string
          atualizada_em: string
          autor_id: string
          criada_em: string
          id: string
          mensagem: string
          prioridade: string
          status: string
          tenant_id: string
        }
        Insert: {
          assunto: string
          atualizada_em?: string
          autor_id: string
          criada_em?: string
          id?: string
          mensagem: string
          prioridade?: string
          status?: string
          tenant_id: string
        }
        Update: {
          assunto?: string
          atualizada_em?: string
          autor_id?: string
          criada_em?: string
          id?: string
          mensagem?: string
          prioridade?: string
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          aceita_cartao_maquininha: boolean
          aceita_cartao_online: boolean
          aceita_dinheiro: boolean
          aceita_pix: boolean
          ativo: boolean
          atualizado_em: string
          banner_url: string | null
          categoria_id: string | null
          cf_dns_record_id: string | null
          criado_em: string
          descricao: string | null
          domain: string | null
          endereco: Json | null
          horarios: Json | null
          id: string
          logo_url: string | null
          nome: string
          raio_entrega_km: number | null
          slug: string | null
          taxa_entrega: number
          telefone: string | null
          tempo_entrega: number | null
          tenant_id: string
          theme: StoreTheme | null
          usa_entregadores_proprios: boolean
        }
        Insert: {
          aceita_cartao_maquininha?: boolean
          aceita_cartao_online?: boolean
          aceita_dinheiro?: boolean
          aceita_pix?: boolean
          ativo?: boolean
          atualizado_em?: string
          banner_url?: string | null
          categoria_id?: string | null
          cf_dns_record_id?: string | null
          criado_em?: string
          descricao?: string | null
          domain?: string | null
          endereco?: Json | null
          horarios?: Json | null
          id?: string
          logo_url?: string | null
          nome: string
          raio_entrega_km?: number | null
          slug?: string | null
          taxa_entrega?: number
          telefone?: string | null
          tempo_entrega?: number | null
          tenant_id: string
          theme?: StoreTheme | null
          usa_entregadores_proprios?: boolean
        }
        Update: {
          aceita_cartao_maquininha?: boolean
          aceita_cartao_online?: boolean
          aceita_dinheiro?: boolean
          aceita_pix?: boolean
          ativo?: boolean
          atualizado_em?: string
          banner_url?: string | null
          categoria_id?: string | null
          cf_dns_record_id?: string | null
          criado_em?: string
          descricao?: string | null
          domain?: string | null
          endereco?: Json | null
          horarios?: Json | null
          id?: string
          logo_url?: string | null
          nome?: string
          raio_entrega_km?: number | null
          slug?: string | null
          taxa_entrega?: number
          telefone?: string | null
          tempo_entrega?: number | null
          tenant_id?: string
          theme?: StoreTheme | null
          usa_entregadores_proprios?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "stores_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stores_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_subscriptions: {
        Row: {
          atualizado_em: string
          billing_status: string
          cancelado_em: string | null
          criado_em: string
          id: string
          periodo_fim: string | null
          periodo_inicio: string | null
          plan_id: string
          stripe_price_id: string | null
          stripe_subscription_id: string | null
          tenant_id: string
          trial_termina_em: string | null
        }
        Insert: {
          atualizado_em?: string
          billing_status?: string
          cancelado_em?: string | null
          criado_em?: string
          id?: string
          periodo_fim?: string | null
          periodo_inicio?: string | null
          plan_id: string
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          tenant_id: string
          trial_termina_em?: string | null
        }
        Update: {
          atualizado_em?: string
          billing_status?: string
          cancelado_em?: string | null
          criado_em?: string
          id?: string
          periodo_fim?: string | null
          periodo_inicio?: string | null
          plan_id?: string
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          tenant_id?: string
          trial_termina_em?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          ativo: boolean
          atualizado_em: string
          cpf_cnpj: string | null
          criado_em: string
          email: string
          id: string
          nome_responsavel: string
          pagarme_kyc_link: string | null
          pagarme_onboarding_status: string
          pagarme_recipient_id: string | null
          slug: string | null
          stripe_customer_id: string | null
          telefone: string | null
          user_id: string
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          cpf_cnpj?: string | null
          criado_em?: string
          email: string
          id?: string
          nome_responsavel: string
          pagarme_kyc_link?: string | null
          pagarme_onboarding_status?: string
          pagarme_recipient_id?: string | null
          slug?: string | null
          stripe_customer_id?: string | null
          telefone?: string | null
          user_id: string
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          cpf_cnpj?: string | null
          criado_em?: string
          email?: string
          id?: string
          nome_responsavel?: string
          pagarme_kyc_link?: string | null
          pagarme_onboarding_status?: string
          pagarme_recipient_id?: string | null
          slug?: string | null
          stripe_customer_id?: string | null
          telefone?: string | null
          user_id?: string
        }
        Relationships: []
      }
      webhook_events_log: {
        Row: {
          error_message: string | null
          event_id: string
          event_type: string
          id: string
          payload: Json
          processado_em: string | null
          recebido_em: string
          source: string
          status: string
        }
        Insert: {
          error_message?: string | null
          event_id: string
          event_type: string
          id?: string
          payload: Json
          processado_em?: string | null
          recebido_em?: string
          source: string
          status?: string
        }
        Update: {
          error_message?: string | null
          event_id?: string
          event_type?: string
          id?: string
          payload?: Json
          processado_em?: string | null
          recebido_em?: string
          source?: string
          status?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      consumer_has_order_with_tenant: {
        Args: { p_consumer_id: string }
        Returns: boolean
      }
      consumer_tracking_courier: {
        Args: { p_courier_id: string }
        Returns: boolean
      }
      courier_assigned_to_order: {
        Args: { p_order_id: string }
        Returns: boolean
      }
      courier_has_active_delivery: {
        Args: { p_courier_id: string; p_statuses: string[] }
        Returns: boolean
      }
      get_user_id_by_email: { Args: { p_email: string }; Returns: string }
      is_admin: { Args: never; Returns: boolean }
      my_consumer_id: { Args: never; Returns: string }
      my_courier_id: { Args: never; Returns: string }
      my_tenant_id: { Args: never; Returns: string }
      order_belongs_to_consumer: {
        Args: { p_order_id: string }
        Returns: boolean
      }
      order_belongs_to_tenant: {
        Args: { p_order_id: string }
        Returns: boolean
      }
      tenant_tracking_courier: {
        Args: { p_courier_id: string }
        Returns: boolean
      }
    }
    Enums: {
      courier_status: "pendente" | "aprovado" | "reprovado" | "suspenso"
      courier_type: "proprio" | "autonomo"
      delivery_status:
        | "pendente"
        | "aceita"
        | "coletada"
        | "entregue"
        | "cancelada"
      order_status:
        | "novo"
        | "confirmado"
        | "em_preparo"
        | "aguardando_entregador"
        | "saiu_para_entrega"
        | "entregue"
        | "cancelado"
      payout_status: "agendado" | "processando" | "concluido" | "falhou"
      stock_movement_type:
        | "entrada"
        | "saida_pedido"
        | "ajuste_positivo"
        | "ajuste_negativo"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      courier_status: ["pendente", "aprovado", "reprovado", "suspenso"],
      courier_type: ["proprio", "autonomo"],
      delivery_status: [
        "pendente",
        "aceita",
        "coletada",
        "entregue",
        "cancelada",
      ],
      order_status: [
        "novo",
        "confirmado",
        "em_preparo",
        "aguardando_entregador",
        "saiu_para_entrega",
        "entregue",
        "cancelado",
      ],
      payout_status: ["agendado", "processando", "concluido", "falhou"],
      stock_movement_type: [
        "entrada",
        "saida_pedido",
        "ajuste_positivo",
        "ajuste_negativo",
      ],
    },
  },
} as const
