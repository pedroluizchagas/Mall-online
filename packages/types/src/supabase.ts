export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      plans: {
        Row: {
          id: string
          nome: string
          descricao: string | null
          preco_mensal: number
          max_lojas: number
          max_produtos: number
          max_entregadores: number
          tem_estoque: boolean
          tem_relatorios: boolean
          tem_antecipacao: boolean
          ativo: boolean
          stripe_product_id: string | null
          stripe_price_id: string | null
          criado_em: string
          atualizado_em: string
        }
        Insert: {
          id?: string
          nome: string
          descricao?: string | null
          preco_mensal: number
          max_lojas?: number
          max_produtos?: number
          max_entregadores?: number
          tem_estoque?: boolean
          tem_relatorios?: boolean
          tem_antecipacao?: boolean
          ativo?: boolean
          stripe_product_id?: string | null
          stripe_price_id?: string | null
          criado_em?: string
          atualizado_em?: string
        }
        Update: {
          id?: string
          nome?: string
          descricao?: string | null
          preco_mensal?: number
          max_lojas?: number
          max_produtos?: number
          max_entregadores?: number
          tem_estoque?: boolean
          tem_relatorios?: boolean
          tem_antecipacao?: boolean
          ativo?: boolean
          stripe_product_id?: string | null
          stripe_price_id?: string | null
          criado_em?: string
          atualizado_em?: string
        }
        Relationships: []
      }
      tenants: {
        Row: {
          id: string
          user_id: string
          nome_responsavel: string
          cpf_cnpj: string | null
          telefone: string | null
          email: string
          slug: string | null
          stripe_customer_id: string | null
          stripe_account_id: string | null
          stripe_onboarding_ok: boolean
          ativo: boolean
          criado_em: string
          atualizado_em: string
        }
        Insert: {
          id?: string
          user_id: string
          nome_responsavel: string
          cpf_cnpj?: string | null
          telefone?: string | null
          email: string
          slug?: string | null
          stripe_customer_id?: string | null
          stripe_account_id?: string | null
          stripe_onboarding_ok?: boolean
          ativo?: boolean
          criado_em?: string
          atualizado_em?: string
        }
        Update: {
          id?: string
          user_id?: string
          nome_responsavel?: string
          cpf_cnpj?: string | null
          telefone?: string | null
          email?: string
          slug?: string | null
          stripe_customer_id?: string | null
          stripe_account_id?: string | null
          stripe_onboarding_ok?: boolean
          ativo?: boolean
          criado_em?: string
          atualizado_em?: string
        }
        Relationships: []
      }
      tenant_subscriptions: {
        Row: {
          id: string
          tenant_id: string
          plan_id: string
          billing_status: Database["public"]["Enums"]["billing_status"]
          stripe_subscription_id: string | null
          stripe_price_id: string | null
          trial_termina_em: string | null
          periodo_inicio: string | null
          periodo_fim: string | null
          cancelado_em: string | null
          criado_em: string
          atualizado_em: string
        }
        Insert: {
          id?: string
          tenant_id: string
          plan_id: string
          billing_status?: Database["public"]["Enums"]["billing_status"]
          stripe_subscription_id?: string | null
          stripe_price_id?: string | null
          trial_termina_em?: string | null
          periodo_inicio?: string | null
          periodo_fim?: string | null
          cancelado_em?: string | null
          criado_em?: string
          atualizado_em?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          plan_id?: string
          billing_status?: Database["public"]["Enums"]["billing_status"]
          stripe_subscription_id?: string | null
          stripe_price_id?: string | null
          trial_termina_em?: string | null
          periodo_inicio?: string | null
          periodo_fim?: string | null
          cancelado_em?: string | null
          criado_em?: string
          atualizado_em?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          id: string
          tenant_id: string
          nome: string
          descricao: string | null
          slug: string | null
          logo_url: string | null
          banner_url: string | null
          telefone: string | null
          endereco: Json | null
          horarios: Json | null
          taxa_entrega: number
          tempo_entrega: number | null
          raio_entrega_km: number | null
          aceita_dinheiro: boolean
          aceita_pix: boolean
          aceita_cartao_maquininha: boolean
          aceita_cartao_online: boolean
          usa_entregadores_proprios: boolean
          ativo: boolean
          theme: Json | null
          criado_em: string
          atualizado_em: string
        }
        Insert: {
          id?: string
          tenant_id: string
          nome: string
          descricao?: string | null
          slug?: string | null
          logo_url?: string | null
          banner_url?: string | null
          telefone?: string | null
          endereco?: Json | null
          horarios?: Json | null
          taxa_entrega?: number
          tempo_entrega?: number | null
          raio_entrega_km?: number | null
          aceita_dinheiro?: boolean
          aceita_pix?: boolean
          aceita_cartao_maquininha?: boolean
          aceita_cartao_online?: boolean
          usa_entregadores_proprios?: boolean
          ativo?: boolean
          theme?: Json | null
          criado_em?: string
          atualizado_em?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          nome?: string
          descricao?: string | null
          slug?: string | null
          logo_url?: string | null
          banner_url?: string | null
          telefone?: string | null
          endereco?: Json | null
          horarios?: Json | null
          taxa_entrega?: number
          tempo_entrega?: number | null
          raio_entrega_km?: number | null
          aceita_dinheiro?: boolean
          aceita_pix?: boolean
          aceita_cartao_maquininha?: boolean
          aceita_cartao_online?: boolean
          usa_entregadores_proprios?: boolean
          ativo?: boolean
          theme?: Json | null
          criado_em?: string
          atualizado_em?: string
        }
        Relationships: [
          {
            foreignKeyName: "stores_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          id: string
          tenant_id: string | null
          store_id: string | null
          nome: string
          descricao: string | null
          icone: string | null
          ordem: number
          ativa: boolean
          criado_em: string
          atualizado_em: string
        }
        Insert: {
          id?: string
          tenant_id?: string | null
          store_id?: string | null
          nome: string
          descricao?: string | null
          icone?: string | null
          ordem?: number
          ativa?: boolean
          criado_em?: string
          atualizado_em?: string
        }
        Update: {
          id?: string
          tenant_id?: string | null
          store_id?: string | null
          nome?: string
          descricao?: string | null
          icone?: string | null
          ordem?: number
          ativa?: boolean
          criado_em?: string
          atualizado_em?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          id: string
          store_id: string
          tenant_id: string
          category_id: string | null
          nome: string
          descricao: string | null
          preco: number
          preco_promocional: number | null
          foto_url: string | null
          disponivel: boolean
          track_stock: boolean
          stock_quantity: number | null
          stock_minimo: number | null
          ordem: number
          criado_em: string
          atualizado_em: string
        }
        Insert: {
          id?: string
          store_id: string
          tenant_id: string
          category_id?: string | null
          nome: string
          descricao?: string | null
          preco: number
          preco_promocional?: number | null
          foto_url?: string | null
          disponivel?: boolean
          track_stock?: boolean
          stock_quantity?: number | null
          stock_minimo?: number | null
          ordem?: number
          criado_em?: string
          atualizado_em?: string
        }
        Update: {
          id?: string
          store_id?: string
          tenant_id?: string
          category_id?: string | null
          nome?: string
          descricao?: string | null
          preco?: number
          preco_promocional?: number | null
          foto_url?: string | null
          disponivel?: boolean
          track_stock?: boolean
          stock_quantity?: number | null
          stock_minimo?: number | null
          ordem?: number
          criado_em?: string
          atualizado_em?: string
        }
        Relationships: [
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
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      consumers: {
        Row: {
          id: string
          user_id: string
          nome: string
          telefone: string | null
          foto_url: string | null
          enderecos: Json
          criado_em: string
          atualizado_em: string
        }
        Insert: {
          id?: string
          user_id: string
          nome: string
          telefone?: string | null
          foto_url?: string | null
          enderecos?: Json
          criado_em?: string
          atualizado_em?: string
        }
        Update: {
          id?: string
          user_id?: string
          nome?: string
          telefone?: string | null
          foto_url?: string | null
          enderecos?: Json
          criado_em?: string
          atualizado_em?: string
        }
        Relationships: []
      }
      couriers: {
        Row: {
          id: string
          user_id: string
          tenant_id: string | null
          tipo: Database["public"]["Enums"]["courier_type"]
          nome: string
          cpf: string | null
          telefone: string | null
          foto_url: string | null
          cnh_numero: string | null
          cnh_foto_url: string | null
          veiculo_tipo: string | null
          veiculo_placa: string | null
          status: Database["public"]["Enums"]["courier_status"]
          online: boolean
          stripe_account_id: string | null
          stripe_onboarding_ok: boolean
          aprovado_em: string | null
          aprovado_por: string | null
          criado_em: string
          atualizado_em: string
        }
        Insert: {
          id?: string
          user_id: string
          tenant_id?: string | null
          tipo?: Database["public"]["Enums"]["courier_type"]
          nome: string
          cpf?: string | null
          telefone?: string | null
          foto_url?: string | null
          cnh_numero?: string | null
          cnh_foto_url?: string | null
          veiculo_tipo?: string | null
          veiculo_placa?: string | null
          status?: Database["public"]["Enums"]["courier_status"]
          online?: boolean
          stripe_account_id?: string | null
          stripe_onboarding_ok?: boolean
          aprovado_em?: string | null
          aprovado_por?: string | null
          criado_em?: string
          atualizado_em?: string
        }
        Update: {
          id?: string
          user_id?: string
          tenant_id?: string | null
          tipo?: Database["public"]["Enums"]["courier_type"]
          nome?: string
          cpf?: string | null
          telefone?: string | null
          foto_url?: string | null
          cnh_numero?: string | null
          cnh_foto_url?: string | null
          veiculo_tipo?: string | null
          veiculo_placa?: string | null
          status?: Database["public"]["Enums"]["courier_status"]
          online?: boolean
          stripe_account_id?: string | null
          stripe_onboarding_ok?: boolean
          aprovado_em?: string | null
          aprovado_por?: string | null
          criado_em?: string
          atualizado_em?: string
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
      orders: {
        Row: {
          id: string
          consumer_id: string
          store_id: string
          tenant_id: string
          status: Database["public"]["Enums"]["order_status"]
          payment_status: Database["public"]["Enums"]["payment_status"]
          forma_pagamento: string
          subtotal: number
          taxa_entrega: number
          total: number
          platform_fee_amount: number | null
          troco_para: number | null
          endereco_entrega: Json
          observacoes: string | null
          stripe_payment_intent_id: string | null
          cancelado_em: string | null
          motivo_cancelamento: string | null
          criado_em: string
          atualizado_em: string
        }
        Insert: {
          id?: string
          consumer_id: string
          store_id: string
          tenant_id: string
          status?: Database["public"]["Enums"]["order_status"]
          payment_status?: Database["public"]["Enums"]["payment_status"]
          forma_pagamento: string
          subtotal: number
          taxa_entrega?: number
          total: number
          platform_fee_amount?: number | null
          troco_para?: number | null
          endereco_entrega: Json
          observacoes?: string | null
          stripe_payment_intent_id?: string | null
          cancelado_em?: string | null
          motivo_cancelamento?: string | null
          criado_em?: string
          atualizado_em?: string
        }
        Update: {
          id?: string
          consumer_id?: string
          store_id?: string
          tenant_id?: string
          status?: Database["public"]["Enums"]["order_status"]
          payment_status?: Database["public"]["Enums"]["payment_status"]
          forma_pagamento?: string
          subtotal?: number
          taxa_entrega?: number
          total?: number
          platform_fee_amount?: number | null
          troco_para?: number | null
          endereco_entrega?: Json
          observacoes?: string | null
          stripe_payment_intent_id?: string | null
          cancelado_em?: string | null
          motivo_cancelamento?: string | null
          criado_em?: string
          atualizado_em?: string
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
      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string | null
          nome: string
          preco_unit: number
          quantidade: number
          subtotal: number
          observacoes: string | null
          criado_em: string
        }
        Insert: {
          id?: string
          order_id: string
          product_id?: string | null
          nome: string
          preco_unit: number
          quantidade?: number
          subtotal: number
          observacoes?: string | null
          criado_em?: string
        }
        Update: {
          id?: string
          order_id?: string
          product_id?: string | null
          nome?: string
          preco_unit?: number
          quantidade?: number
          subtotal?: number
          observacoes?: string | null
          criado_em?: string
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
      delivery_assignments: {
        Row: {
          id: string
          order_id: string
          courier_id: string
          tenant_id: string
          status: Database["public"]["Enums"]["delivery_status"]
          valor_entrega: number
          aceito_em: string | null
          coletado_em: string | null
          entregue_em: string | null
          cancelado_em: string | null
          comprovante_url: string | null
          codigo_confirmacao: string | null
          criado_em: string
          atualizado_em: string
        }
        Insert: {
          id?: string
          order_id: string
          courier_id: string
          tenant_id: string
          status?: Database["public"]["Enums"]["delivery_status"]
          valor_entrega?: number
          aceito_em?: string | null
          coletado_em?: string | null
          entregue_em?: string | null
          cancelado_em?: string | null
          comprovante_url?: string | null
          codigo_confirmacao?: string | null
          criado_em?: string
          atualizado_em?: string
        }
        Update: {
          id?: string
          order_id?: string
          courier_id?: string
          tenant_id?: string
          status?: Database["public"]["Enums"]["delivery_status"]
          valor_entrega?: number
          aceito_em?: string | null
          coletado_em?: string | null
          entregue_em?: string | null
          cancelado_em?: string | null
          comprovante_url?: string | null
          codigo_confirmacao?: string | null
          criado_em?: string
          atualizado_em?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_assignments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_assignments_courier_id_fkey"
            columns: ["courier_id"]
            isOneToOne: false
            referencedRelation: "couriers"
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
      courier_locations: {
        Row: {
          id: string
          courier_id: string
          assignment_id: string | null
          latitude: number
          longitude: number
          precisao_m: number | null
          atualizado_em: string
        }
        Insert: {
          id?: string
          courier_id: string
          assignment_id?: string | null
          latitude: number
          longitude: number
          precisao_m?: number | null
          atualizado_em?: string
        }
        Update: {
          id?: string
          courier_id?: string
          assignment_id?: string | null
          latitude?: number
          longitude?: number
          precisao_m?: number | null
          atualizado_em?: string
        }
        Relationships: [
          {
            foreignKeyName: "courier_locations_courier_id_fkey"
            columns: ["courier_id"]
            isOneToOne: true
            referencedRelation: "couriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courier_locations_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "delivery_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      payouts: {
        Row: {
          id: string
          tipo: string
          tenant_id: string | null
          courier_id: string | null
          valor_bruto: number
          taxa_antecipacao: number
          valor_liquido: number
          total_pedidos: number
          status: Database["public"]["Enums"]["payout_status"]
          antecipado: boolean
          data_referencia: string
          data_prevista: string
          stripe_transfer_id: string | null
          erro_mensagem: string | null
          processado_em: string | null
          criado_em: string
          atualizado_em: string
        }
        Insert: {
          id?: string
          tipo: string
          tenant_id?: string | null
          courier_id?: string | null
          valor_bruto: number
          taxa_antecipacao?: number
          valor_liquido: number
          total_pedidos?: number
          status?: Database["public"]["Enums"]["payout_status"]
          antecipado?: boolean
          data_referencia: string
          data_prevista: string
          stripe_transfer_id?: string | null
          erro_mensagem?: string | null
          processado_em?: string | null
          criado_em?: string
          atualizado_em?: string
        }
        Update: {
          id?: string
          tipo?: string
          tenant_id?: string | null
          courier_id?: string | null
          valor_bruto?: number
          taxa_antecipacao?: number
          valor_liquido?: number
          total_pedidos?: number
          status?: Database["public"]["Enums"]["payout_status"]
          antecipado?: boolean
          data_referencia?: string
          data_prevista?: string
          stripe_transfer_id?: string | null
          erro_mensagem?: string | null
          processado_em?: string | null
          criado_em?: string
          atualizado_em?: string
        }
        Relationships: [
          {
            foreignKeyName: "payouts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payouts_courier_id_fkey"
            columns: ["courier_id"]
            isOneToOne: false
            referencedRelation: "couriers"
            referencedColumns: ["id"]
          },
        ]
      }
      payout_advance_requests: {
        Row: {
          id: string
          tenant_id: string
          payout_id: string | null
          total_pedidos: number
          taxa_total: number
          valor_estimado: number
          status: string
          solicitado_em: string
          processado_em: string | null
          criado_em: string
        }
        Insert: {
          id?: string
          tenant_id: string
          payout_id?: string | null
          total_pedidos: number
          taxa_total: number
          valor_estimado: number
          status?: string
          solicitado_em?: string
          processado_em?: string | null
          criado_em?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          payout_id?: string | null
          total_pedidos?: number
          taxa_total?: number
          valor_estimado?: number
          status?: string
          solicitado_em?: string
          processado_em?: string | null
          criado_em?: string
        }
        Relationships: [
          {
            foreignKeyName: "payout_advance_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payout_advance_requests_payout_id_fkey"
            columns: ["payout_id"]
            isOneToOne: false
            referencedRelation: "payouts"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          id: string
          product_id: string
          tenant_id: string
          order_id: string | null
          tipo: Database["public"]["Enums"]["stock_movement_type"]
          quantidade: number
          quantidade_anterior: number
          quantidade_posterior: number
          motivo: string | null
          criado_por: string | null
          criado_em: string
        }
        Insert: {
          id?: string
          product_id: string
          tenant_id: string
          order_id?: string | null
          tipo: Database["public"]["Enums"]["stock_movement_type"]
          quantidade: number
          quantidade_anterior: number
          quantidade_posterior: number
          motivo?: string | null
          criado_por?: string | null
          criado_em?: string
        }
        Update: {
          id?: string
          product_id?: string
          tenant_id?: string
          order_id?: string | null
          tipo?: Database["public"]["Enums"]["stock_movement_type"]
          quantidade?: number
          quantidade_anterior?: number
          quantidade_posterior?: number
          motivo?: string | null
          criado_por?: string | null
          criado_em?: string
        }
        Relationships: [
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
          {
            foreignKeyName: "stock_movements_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      push_tokens: {
        Row: {
          id: string
          user_id: string | null
          courier_id: string | null
          token: string
          plataforma: string
          app: string
          ativo: boolean
          criado_em: string
          atualizado_em: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          courier_id?: string | null
          token: string
          plataforma: string
          app: string
          ativo?: boolean
          criado_em?: string
          atualizado_em?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          courier_id?: string | null
          token?: string
          plataforma?: string
          app?: string
          ativo?: boolean
          criado_em?: string
          atualizado_em?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      order_status:
        | "novo"
        | "confirmado"
        | "em_preparo"
        | "aguardando_entregador"
        | "saiu_para_entrega"
        | "entregue"
        | "cancelado"
      payment_status: "pendente" | "pago" | "estornado" | "em_disputa"
      delivery_status: "pendente" | "aceita" | "coletada" | "entregue" | "cancelada"
      payout_status: "agendado" | "processando" | "concluido" | "falhou"
      billing_status: "trial" | "ativa" | "em_atraso" | "cancelada" | "suspensa"
      courier_status: "pendente" | "aprovado" | "reprovado" | "suspenso"
      courier_type: "proprio" | "autonomo"
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

// Helper types for convenience
type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never
