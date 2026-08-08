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
          fragil: boolean | null
          icone: string | null
          id: string
          nome: string
          ordem: number
          peso_g: number | null
          refrigerado: boolean | null
          slug: string | null
          store_id: string | null
          tenant_id: string | null
          volume_ml: number | null
        }
        Insert: {
          ativa?: boolean
          atualizado_em?: string
          criado_em?: string
          descricao?: string | null
          fragil?: boolean | null
          icone?: string | null
          id?: string
          nome: string
          ordem?: number
          peso_g?: number | null
          refrigerado?: boolean | null
          slug?: string | null
          store_id?: string | null
          tenant_id?: string | null
          volume_ml?: number | null
        }
        Update: {
          ativa?: boolean
          atualizado_em?: string
          criado_em?: string
          descricao?: string | null
          fragil?: boolean | null
          icone?: string | null
          id?: string
          nome?: string
          ordem?: number
          peso_g?: number | null
          refrigerado?: boolean | null
          slug?: string | null
          store_id?: string | null
          tenant_id?: string | null
          volume_ml?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "public_catalog_stores"
            referencedColumns: ["id"]
          },
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
          avaliacao_media: number | null
          bag_termica: boolean
          capacidade_peso_g: number | null
          capacidade_volume_ml: number | null
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
          raio_max_km: number | null
          status: Database["public"]["Enums"]["courier_status"]
          taxa_aceitacao: number
          telefone: string | null
          tenant_id: string | null
          tipo: Database["public"]["Enums"]["courier_type"]
          ultima_entrega_em: string | null
          user_id: string
          veiculo: Database["public"]["Enums"]["vehicle_type"] | null
          veiculo_placa: string | null
          veiculo_tipo: string | null
        }
        Insert: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          atualizado_em?: string
          avaliacao_media?: number | null
          bag_termica?: boolean
          capacidade_peso_g?: number | null
          capacidade_volume_ml?: number | null
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
          raio_max_km?: number | null
          status?: Database["public"]["Enums"]["courier_status"]
          taxa_aceitacao?: number
          telefone?: string | null
          tenant_id?: string | null
          tipo?: Database["public"]["Enums"]["courier_type"]
          ultima_entrega_em?: string | null
          user_id: string
          veiculo?: Database["public"]["Enums"]["vehicle_type"] | null
          veiculo_placa?: string | null
          veiculo_tipo?: string | null
        }
        Update: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          atualizado_em?: string
          avaliacao_media?: number | null
          bag_termica?: boolean
          capacidade_peso_g?: number | null
          capacidade_volume_ml?: number | null
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
          raio_max_km?: number | null
          status?: Database["public"]["Enums"]["courier_status"]
          taxa_aceitacao?: number
          telefone?: string | null
          tenant_id?: string | null
          tipo?: Database["public"]["Enums"]["courier_type"]
          ultima_entrega_em?: string | null
          user_id?: string
          veiculo?: Database["public"]["Enums"]["vehicle_type"] | null
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
          route_id: string | null
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
          route_id?: string | null
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
          route_id?: string | null
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
            foreignKeyName: "delivery_assignments_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "delivery_routes"
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
      delivery_routes: {
        Row: {
          aceita_em: string | null
          atualizado_em: string
          carga_fragil: boolean
          carga_peso_g: number
          carga_porte: Database["public"]["Enums"]["cargo_size"] | null
          carga_refrigerada: boolean
          carga_volume_ml: number
          ciclos_oferta: number
          coletas: number
          concluida_em: string | null
          courier_id: string | null
          criado_em: string
          distancia_total_m: number | null
          drops: number
          duracao_estimada_s: number | null
          ganho_total: number
          id: string
          status: Database["public"]["Enums"]["route_status"]
          tenant_id: string
        }
        Insert: {
          aceita_em?: string | null
          atualizado_em?: string
          carga_fragil?: boolean
          carga_peso_g?: number
          carga_porte?: Database["public"]["Enums"]["cargo_size"] | null
          carga_refrigerada?: boolean
          carga_volume_ml?: number
          ciclos_oferta?: number
          coletas?: number
          concluida_em?: string | null
          courier_id?: string | null
          criado_em?: string
          distancia_total_m?: number | null
          drops?: number
          duracao_estimada_s?: number | null
          ganho_total?: number
          id?: string
          status?: Database["public"]["Enums"]["route_status"]
          tenant_id: string
        }
        Update: {
          aceita_em?: string | null
          atualizado_em?: string
          carga_fragil?: boolean
          carga_peso_g?: number
          carga_porte?: Database["public"]["Enums"]["cargo_size"] | null
          carga_refrigerada?: boolean
          carga_volume_ml?: number
          ciclos_oferta?: number
          coletas?: number
          concluida_em?: string | null
          courier_id?: string | null
          criado_em?: string
          distancia_total_m?: number | null
          drops?: number
          duracao_estimada_s?: number | null
          ganho_total?: number
          id?: string
          status?: Database["public"]["Enums"]["route_status"]
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_routes_courier_id_fkey"
            columns: ["courier_id"]
            isOneToOne: false
            referencedRelation: "couriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_routes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      dispatch_offers: {
        Row: {
          ciclo: number
          courier_id: string
          enviado_em: string
          expira_em: string
          id: string
          respondido_em: string | null
          resposta: Database["public"]["Enums"]["offer_response"] | null
          route_id: string
          score: number | null
        }
        Insert: {
          ciclo?: number
          courier_id: string
          enviado_em?: string
          expira_em: string
          id?: string
          respondido_em?: string | null
          resposta?: Database["public"]["Enums"]["offer_response"] | null
          route_id: string
          score?: number | null
        }
        Update: {
          ciclo?: number
          courier_id?: string
          enviado_em?: string
          expira_em?: string
          id?: string
          respondido_em?: string | null
          resposta?: Database["public"]["Enums"]["offer_response"] | null
          route_id?: string
          score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "dispatch_offers_courier_id_fkey"
            columns: ["courier_id"]
            isOneToOne: false
            referencedRelation: "couriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispatch_offers_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "delivery_routes"
            referencedColumns: ["id"]
          },
        ]
      }
      logistica_config: {
        Row: {
          atualizado_em: string
          chave: string
          descricao: string | null
          valor: number
        }
        Insert: {
          atualizado_em?: string
          chave: string
          descricao?: string | null
          valor: number
        }
        Update: {
          atualizado_em?: string
          chave?: string
          descricao?: string | null
          valor?: number
        }
        Relationships: []
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
          modifiers: Json | null
          nome: string
          observacoes: string | null
          order_id: string
          preco_unit: number
          product_id: string | null
          quantidade: number
          subtotal: number
          variant_id: string | null
        }
        Insert: {
          criado_em?: string
          id?: string
          modifiers?: Json | null
          nome: string
          observacoes?: string | null
          order_id: string
          preco_unit: number
          product_id?: string | null
          quantidade?: number
          subtotal: number
          variant_id?: string | null
        }
        Update: {
          criado_em?: string
          id?: string
          modifiers?: Json | null
          nome?: string
          observacoes?: string | null
          order_id?: string
          preco_unit?: number
          product_id?: string | null
          quantidade?: number
          subtotal?: number
          variant_id?: string | null
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
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_catalog_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "public_catalog_product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          agendamento_fim_at: string | null
          agendamento_inicio_at: string | null
          atualizado_em: string
          cancelado_em: string | null
          carga_alto_valor: boolean
          carga_fragil: boolean
          carga_peso_g: number | null
          carga_porte: Database["public"]["Enums"]["cargo_size"] | null
          carga_refrigerada: boolean
          carga_volume_ml: number | null
          consumer_id: string
          criado_em: string
          endereco_entrega: Json
          entrega_geohash7: string | null
          entrega_lat: number | null
          entrega_lng: number | null
          forma_pagamento: string
          id: string
          motivo_cancelamento: string | null
          observacoes: string | null
          origem: string
          pagarme_charge_id: string | null
          pagarme_order_id: string | null
          pagarme_qr_code: string | null
          pagarme_qr_code_expires_at: string | null
          pagarme_qr_code_url: string | null
          payment_status: string
          platform_fee_amount: number
          staff_id: string | null
          status: Database["public"]["Enums"]["order_status"]
          store_id: string
          subtotal: number
          taxa_entrega: number
          tenant_id: string
          tipo: string
          total: number
          troco_para: number | null
          valor_estornado: number
          volumes: number
        }
        Insert: {
          agendamento_fim_at?: string | null
          agendamento_inicio_at?: string | null
          atualizado_em?: string
          cancelado_em?: string | null
          carga_alto_valor?: boolean
          carga_fragil?: boolean
          carga_peso_g?: number | null
          carga_porte?: Database["public"]["Enums"]["cargo_size"] | null
          carga_refrigerada?: boolean
          carga_volume_ml?: number | null
          consumer_id: string
          criado_em?: string
          endereco_entrega: Json
          entrega_geohash7?: string | null
          entrega_lat?: number | null
          entrega_lng?: number | null
          forma_pagamento: string
          id?: string
          motivo_cancelamento?: string | null
          observacoes?: string | null
          origem?: string
          pagarme_charge_id?: string | null
          pagarme_order_id?: string | null
          pagarme_qr_code?: string | null
          pagarme_qr_code_expires_at?: string | null
          pagarme_qr_code_url?: string | null
          payment_status?: string
          platform_fee_amount?: number
          staff_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          store_id: string
          subtotal: number
          taxa_entrega?: number
          tenant_id: string
          tipo?: string
          total: number
          troco_para?: number | null
          valor_estornado?: number
          volumes?: number
        }
        Update: {
          agendamento_fim_at?: string | null
          agendamento_inicio_at?: string | null
          atualizado_em?: string
          cancelado_em?: string | null
          carga_alto_valor?: boolean
          carga_fragil?: boolean
          carga_peso_g?: number | null
          carga_porte?: Database["public"]["Enums"]["cargo_size"] | null
          carga_refrigerada?: boolean
          carga_volume_ml?: number | null
          consumer_id?: string
          criado_em?: string
          endereco_entrega?: Json
          entrega_geohash7?: string | null
          entrega_lat?: number | null
          entrega_lng?: number | null
          forma_pagamento?: string
          id?: string
          motivo_cancelamento?: string | null
          observacoes?: string | null
          origem?: string
          pagarme_charge_id?: string | null
          pagarme_order_id?: string | null
          pagarme_qr_code?: string | null
          pagarme_qr_code_expires_at?: string | null
          pagarme_qr_code_url?: string | null
          payment_status?: string
          platform_fee_amount?: number
          staff_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          store_id?: string
          subtotal?: number
          taxa_entrega?: number
          tenant_id?: string
          tipo?: string
          total?: number
          troco_para?: number | null
          valor_estornado?: number
          volumes?: number
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
            foreignKeyName: "orders_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "service_staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "public_catalog_stores"
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
          max_posts: number | null
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
          max_posts?: number | null
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
          max_posts?: number | null
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
      product_modifier_groups: {
        Row: {
          created_at: string
          id: string
          max_select: number
          min_select: number
          nome: string
          obrigatorio: boolean | null
          ordem: number
          product_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          max_select?: number
          min_select?: number
          nome: string
          obrigatorio?: boolean | null
          ordem?: number
          product_id: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          max_select?: number
          min_select?: number
          nome?: string
          obrigatorio?: boolean | null
          ordem?: number
          product_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_modifier_groups_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_modifier_groups_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_catalog_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_modifier_groups_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_modifiers: {
        Row: {
          created_at: string
          disponivel: boolean
          group_id: string
          id: string
          nome: string
          ordem: number
          preco_extra: number
        }
        Insert: {
          created_at?: string
          disponivel?: boolean
          group_id: string
          id?: string
          nome: string
          ordem?: number
          preco_extra?: number
        }
        Update: {
          created_at?: string
          disponivel?: boolean
          group_id?: string
          id?: string
          nome?: string
          ordem?: number
          preco_extra?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_modifiers_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "product_modifier_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_modifiers_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "public_catalog_product_modifier_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      product_option_groups: {
        Row: {
          created_at: string
          id: string
          nome: string
          ordem: number
          product_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
          ordem?: number
          product_id: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          ordem?: number
          product_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_option_groups_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_option_groups_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_catalog_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_option_groups_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_options: {
        Row: {
          created_at: string
          group_id: string
          hex_color: string | null
          id: string
          ordem: number
          valor: string
        }
        Insert: {
          created_at?: string
          group_id: string
          hex_color?: string | null
          id?: string
          ordem?: number
          valor: string
        }
        Update: {
          created_at?: string
          group_id?: string
          hex_color?: string | null
          id?: string
          ordem?: number
          valor?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_options_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "product_option_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_options_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "public_catalog_product_option_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variant_options: {
        Row: {
          option_id: string
          variant_id: string
        }
        Insert: {
          option_id: string
          variant_id: string
        }
        Update: {
          option_id?: string
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variant_options_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "product_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variant_options_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "public_catalog_product_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variant_options_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variant_options_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "public_catalog_product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          created_at: string
          disponivel: boolean
          foto_url: string | null
          id: string
          ordem: number
          preco: number
          preco_promocional: number | null
          product_id: string
          sku: string | null
          stock_minimo: number | null
          stock_quantity: number | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          disponivel?: boolean
          foto_url?: string | null
          id?: string
          ordem?: number
          preco: number
          preco_promocional?: number | null
          product_id: string
          sku?: string | null
          stock_minimo?: number | null
          stock_quantity?: number | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          disponivel?: boolean
          foto_url?: string | null
          id?: string
          ordem?: number
          preco?: number
          preco_promocional?: number | null
          product_id?: string
          sku?: string | null
          stock_minimo?: number | null
          stock_quantity?: number | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_catalog_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          atualizado_em: string
          category_id: string | null
          criado_em: string
          descricao: string | null
          disponivel: boolean
          foto_url: string | null
          fragil: boolean | null
          id: string
          metadata: Json
          nome: string
          ordem: number
          peso_g: number | null
          preco: number
          preco_promocional: number | null
          refrigerado: boolean | null
          stock_minimo: number | null
          stock_quantity: number | null
          store_id: string
          tenant_id: string
          track_stock: boolean
          volume_ml: number | null
        }
        Insert: {
          atualizado_em?: string
          category_id?: string | null
          criado_em?: string
          descricao?: string | null
          disponivel?: boolean
          foto_url?: string | null
          fragil?: boolean | null
          id?: string
          metadata?: Json
          nome: string
          ordem?: number
          peso_g?: number | null
          preco: number
          preco_promocional?: number | null
          refrigerado?: boolean | null
          stock_minimo?: number | null
          stock_quantity?: number | null
          store_id: string
          tenant_id: string
          track_stock?: boolean
          volume_ml?: number | null
        }
        Update: {
          atualizado_em?: string
          category_id?: string | null
          criado_em?: string
          descricao?: string | null
          disponivel?: boolean
          foto_url?: string | null
          fragil?: boolean | null
          id?: string
          metadata?: Json
          nome?: string
          ordem?: number
          peso_g?: number | null
          preco?: number
          preco_promocional?: number | null
          refrigerado?: boolean | null
          stock_minimo?: number | null
          stock_quantity?: number | null
          store_id?: string
          tenant_id?: string
          track_stock?: boolean
          volume_ml?: number | null
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
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "public_catalog_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "public_catalog_stores"
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
      route_stops: {
        Row: {
          concluida_em: string | null
          criado_em: string
          endereco: string | null
          eta: string | null
          id: string
          lat: number | null
          lng: number | null
          ordem: number
          order_id: string
          route_id: string
          status: Database["public"]["Enums"]["stop_status"]
          store_id: string
          tipo: Database["public"]["Enums"]["stop_type"]
        }
        Insert: {
          concluida_em?: string | null
          criado_em?: string
          endereco?: string | null
          eta?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          ordem: number
          order_id: string
          route_id: string
          status?: Database["public"]["Enums"]["stop_status"]
          store_id: string
          tipo: Database["public"]["Enums"]["stop_type"]
        }
        Update: {
          concluida_em?: string | null
          criado_em?: string
          endereco?: string | null
          eta?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          ordem?: number
          order_id?: string
          route_id?: string
          status?: Database["public"]["Enums"]["stop_status"]
          store_id?: string
          tipo?: Database["public"]["Enums"]["stop_type"]
        }
        Relationships: [
          {
            foreignKeyName: "route_stops_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_stops_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "delivery_routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_stops_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "public_catalog_stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_stops_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      service_blocks: {
        Row: {
          criado_em: string
          fim_at: string
          id: string
          inicio_at: string
          motivo: string | null
          staff_id: string | null
          store_id: string
          tenant_id: string
        }
        Insert: {
          criado_em?: string
          fim_at: string
          id?: string
          inicio_at: string
          motivo?: string | null
          staff_id?: string | null
          store_id: string
          tenant_id: string
        }
        Update: {
          criado_em?: string
          fim_at?: string
          id?: string
          inicio_at?: string
          motivo?: string | null
          staff_id?: string | null
          store_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_blocks_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "service_staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_blocks_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "public_catalog_stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_blocks_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_blocks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      service_staff: {
        Row: {
          ativo: boolean
          cor: string | null
          criado_em: string
          foto_url: string | null
          id: string
          nome: string
          ordem: number
          store_id: string
          tenant_id: string
        }
        Insert: {
          ativo?: boolean
          cor?: string | null
          criado_em?: string
          foto_url?: string | null
          id?: string
          nome: string
          ordem?: number
          store_id: string
          tenant_id: string
        }
        Update: {
          ativo?: boolean
          cor?: string | null
          criado_em?: string
          foto_url?: string | null
          id?: string
          nome?: string
          ordem?: number
          store_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_staff_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "public_catalog_stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_staff_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_staff_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
          variant_id: string | null
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
          variant_id?: string | null
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
          variant_id?: string | null
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
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_catalog_products"
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
            foreignKeyName: "stock_movements_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "public_catalog_product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      store_categoria_changes: {
        Row: {
          categoria_anterior: string | null
          categoria_nova: string
          changed_at: string
          changed_by: string
          id: string
          motivo: string
          store_id: string
        }
        Insert: {
          categoria_anterior?: string | null
          categoria_nova: string
          changed_at?: string
          changed_by: string
          id?: string
          motivo: string
          store_id: string
        }
        Update: {
          categoria_anterior?: string | null
          categoria_nova?: string
          changed_at?: string
          changed_by?: string
          id?: string
          motivo?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_categoria_changes_categoria_anterior_fkey"
            columns: ["categoria_anterior"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_categoria_changes_categoria_anterior_fkey"
            columns: ["categoria_anterior"]
            isOneToOne: false
            referencedRelation: "public_catalog_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_categoria_changes_categoria_nova_fkey"
            columns: ["categoria_nova"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_categoria_changes_categoria_nova_fkey"
            columns: ["categoria_nova"]
            isOneToOne: false
            referencedRelation: "public_catalog_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_categoria_changes_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "public_catalog_stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_categoria_changes_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_posts: {
        Row: {
          altura: number | null
          atualizado_em: string
          bytes: number | null
          comentarios: number
          criado_em: string
          curtidas: number
          descricao: string | null
          duracao_seg: number | null
          id: string
          largura: number | null
          media_path: string
          media_url: string
          moderacao: string
          product_id: string | null
          publicado_em: string | null
          status: string
          store_id: string
          tags: string[]
          tenant_id: string
          thumb_path: string | null
          thumb_url: string | null
          tipo: string
          views: number
        }
        Insert: {
          altura?: number | null
          atualizado_em?: string
          bytes?: number | null
          comentarios?: number
          criado_em?: string
          curtidas?: number
          descricao?: string | null
          duracao_seg?: number | null
          id?: string
          largura?: number | null
          media_path: string
          media_url: string
          moderacao?: string
          product_id?: string | null
          publicado_em?: string | null
          status?: string
          store_id: string
          tags?: string[]
          tenant_id: string
          thumb_path?: string | null
          thumb_url?: string | null
          tipo?: string
          views?: number
        }
        Update: {
          altura?: number | null
          atualizado_em?: string
          bytes?: number | null
          comentarios?: number
          criado_em?: string
          curtidas?: number
          descricao?: string | null
          duracao_seg?: number | null
          id?: string
          largura?: number | null
          media_path?: string
          media_url?: string
          moderacao?: string
          product_id?: string | null
          publicado_em?: string | null
          status?: string
          store_id?: string
          tags?: string[]
          tenant_id?: string
          thumb_path?: string | null
          thumb_url?: string | null
          tipo?: string
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "store_posts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_posts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_catalog_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_posts_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "public_catalog_stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_posts_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_posts_tenant_id_fkey"
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
      stores: {
        Row: {
          aceita_cartao_maquininha: boolean
          aceita_cartao_online: boolean
          aceita_dinheiro: boolean
          aceita_pix: boolean
          ativo: boolean
          atualizado_em: string
          banner_url: string | null
          carga_fragil: boolean
          carga_item_peso_g: number | null
          carga_item_volume_ml: number | null
          carga_modo: string
          carga_refrigerada: boolean
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
          theme: Json | null
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
          carga_fragil?: boolean
          carga_item_peso_g?: number | null
          carga_item_volume_ml?: number | null
          carga_modo?: string
          carga_refrigerada?: boolean
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
          theme?: Json | null
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
          carga_fragil?: boolean
          carga_item_peso_g?: number | null
          carga_item_volume_ml?: number | null
          carga_modo?: string
          carga_refrigerada?: boolean
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
          theme?: Json | null
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
            foreignKeyName: "stores_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "public_catalog_categories"
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
          logistica_agrupamento: boolean
          logistica_automatica: boolean
          nome_responsavel: string
          pagarme_kyc_link: string | null
          pagarme_onboarding_status: string
          pagarme_recipient_id: string | null
          slug: string | null
          stripe_customer_id: string | null
          telefone: string | null
          tutorial_template_visto: boolean
          user_id: string
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          cpf_cnpj?: string | null
          criado_em?: string
          email: string
          id?: string
          logistica_agrupamento?: boolean
          logistica_automatica?: boolean
          nome_responsavel: string
          pagarme_kyc_link?: string | null
          pagarme_onboarding_status?: string
          pagarme_recipient_id?: string | null
          slug?: string | null
          stripe_customer_id?: string | null
          telefone?: string | null
          tutorial_template_visto?: boolean
          user_id: string
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          cpf_cnpj?: string | null
          criado_em?: string
          email?: string
          id?: string
          logistica_agrupamento?: boolean
          logistica_automatica?: boolean
          nome_responsavel?: string
          pagarme_kyc_link?: string | null
          pagarme_onboarding_status?: string
          pagarme_recipient_id?: string | null
          slug?: string | null
          stripe_customer_id?: string | null
          telefone?: string | null
          tutorial_template_visto?: boolean
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
      public_catalog_categories: {
        Row: {
          id: string | null
          nome: string | null
          ordem: number | null
          store_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "public_catalog_stores"
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
      public_catalog_product_modifier_groups: {
        Row: {
          id: string | null
          max_select: number | null
          min_select: number | null
          nome: string | null
          obrigatorio: boolean | null
          ordem: number | null
          product_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_modifier_groups_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_modifier_groups_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_catalog_products"
            referencedColumns: ["id"]
          },
        ]
      }
      public_catalog_product_modifiers: {
        Row: {
          disponivel: boolean | null
          group_id: string | null
          id: string | null
          nome: string | null
          ordem: number | null
          preco_extra: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_modifiers_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "product_modifier_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_modifiers_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "public_catalog_product_modifier_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      public_catalog_product_option_groups: {
        Row: {
          id: string | null
          nome: string | null
          ordem: number | null
          product_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_option_groups_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_option_groups_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_catalog_products"
            referencedColumns: ["id"]
          },
        ]
      }
      public_catalog_product_options: {
        Row: {
          group_id: string | null
          hex_color: string | null
          id: string | null
          ordem: number | null
          valor: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_options_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "product_option_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_options_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "public_catalog_product_option_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      public_catalog_product_variant_options: {
        Row: {
          option_id: string | null
          variant_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variant_options_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "product_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variant_options_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "public_catalog_product_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variant_options_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variant_options_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "public_catalog_product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      public_catalog_product_variants: {
        Row: {
          disponivel: boolean | null
          foto_url: string | null
          id: string | null
          ordem: number | null
          preco: number | null
          preco_promocional: number | null
          product_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_catalog_products"
            referencedColumns: ["id"]
          },
        ]
      }
      public_catalog_products: {
        Row: {
          category_id: string | null
          descricao: string | null
          disponivel: boolean | null
          foto_url: string | null
          id: string | null
          metadata: Json | null
          nome: string | null
          ordem: number | null
          preco: number | null
          preco_promocional: number | null
          store_id: string | null
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
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "public_catalog_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "public_catalog_stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      public_catalog_stores: {
        Row: {
          aceita_cartao_maquininha: boolean | null
          aceita_cartao_online: boolean | null
          aceita_dinheiro: boolean | null
          aceita_pix: boolean | null
          banner_url: string | null
          categoria_id: string | null
          categoria_slug: string | null
          descricao: string | null
          horarios: Json | null
          id: string | null
          logo_url: string | null
          nome: string | null
          slug: string | null
          taxa_entrega: number | null
          telefone: string | null
          tempo_entrega: number | null
          theme: Json | null
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
            foreignKeyName: "stores_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "public_catalog_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      public_explore_feed: {
        Row: {
          comentarios: number | null
          curtidas: number | null
          descricao: string | null
          duracao_seg: number | null
          id: string | null
          loja_inicial: string | null
          loja_nome: string | null
          loja_slug: string | null
          media_url: string | null
          produto: Json | null
          publicado_em: string | null
          tags: string[] | null
          thumb_url: string | null
          tipo: string | null
          views: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      aceitar_oferta_despacho: {
        Args: { p_offer_id: string }
        Returns: {
          motivo: string
          ok: boolean
          rota_id: string
        }[]
      }
      calcular_frete: {
        Args: {
          p_distancia_m: number
          p_porte: Database["public"]["Enums"]["cargo_size"]
          p_refrigerada: boolean
          p_veiculo: Database["public"]["Enums"]["vehicle_type"]
        }
        Returns: number
      }
      calcular_ganho_rota: {
        Args: {
          p_distancia_m: number
          p_drops: number
          p_veiculo: Database["public"]["Enums"]["vehicle_type"]
        }
        Returns: number
      }
      calcular_perfil_carga_pedido: {
        Args: { p_order_id: string }
        Returns: undefined
      }
      candidatos_agrupamento: {
        Args: { p_order_id: string }
        Returns: {
          distancia_drop_m: number
          order_id: string
        }[]
      }
      capacidade_do_veiculo: {
        Args: { v: Database["public"]["Enums"]["vehicle_type"] }
        Returns: {
          max_paradas: number
          peso_g: number
          raio_km: number
          volume_ml: number
        }[]
      }
      cfg: { Args: { p_chave: string }; Returns: number }
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
      courier_elegivel: {
        Args: {
          p_courier_id: string
          p_distancia_total_m: number
          p_paradas: number
          p_peso_g: number
          p_porte: Database["public"]["Enums"]["cargo_size"]
          p_refrigerada: boolean
          p_volume_ml: number
        }
        Returns: boolean
      }
      courier_has_active_delivery: {
        Args: { p_courier_id: string; p_statuses: string[] }
        Returns: boolean
      }
      distancia_m: {
        Args: { lat1: number; lat2: number; lng1: number; lng2: number }
        Returns: number
      }
      distancia_viaria_m: {
        Args: { lat1: number; lat2: number; lng1: number; lng2: number }
        Returns: number
      }
      geohash_encode: {
        Args: { p_lat: number; p_lng: number; p_precisao?: number }
        Returns: string
      }
      get_user_id_by_email: { Args: { p_email: string }; Returns: string }
      increment_post_view: { Args: { post_id: string }; Returns: undefined }
      is_admin: { Args: never; Returns: boolean }
      montar_rota: {
        Args: { p_agrupar?: boolean; p_order_id: string }
        Returns: string
      }
      my_consumer_id: { Args: never; Returns: string }
      my_courier_id: { Args: never; Returns: string }
      my_tenant_id: { Args: never; Returns: string }
      ofertar_rota: { Args: { p_route_id: string }; Returns: string }
      order_belongs_to_consumer: {
        Args: { p_order_id: string }
        Returns: boolean
      }
      order_belongs_to_tenant: {
        Args: { p_order_id: string }
        Returns: boolean
      }
      processar_fila_despacho: {
        Args: never
        Returns: {
          ofertas_expiradas: number
          rotas_processadas: number
        }[]
      }
      ranquear_couriers: {
        Args: { p_limite?: number; p_route_id: string }
        Returns: {
          courier_id: string
          proprio: boolean
          score: number
        }[]
      }
      recusar_oferta_despacho: {
        Args: { p_offer_id: string }
        Returns: boolean
      }
      resolver_carga_item: {
        Args: { p_product_id: string; p_store_id: string }
        Returns: {
          fragil: boolean
          peso_g: number
          refrigerado: boolean
          volume_ml: number
        }[]
      }
      score_courier: {
        Args: {
          p_courier_id: string
          p_distancia_ate_coleta_m: number
          p_porte: Database["public"]["Enums"]["cargo_size"]
        }
        Returns: number
      }
      sequenciar_drops: {
        Args: {
          p_order_ids: string[]
          p_origem_lat: number
          p_origem_lng: number
        }
        Returns: {
          distancia_perna_m: number
          ordem: number
          order_id: string
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      tenant_tracking_courier: {
        Args: { p_courier_id: string }
        Returns: boolean
      }
      veiculo_aceita_porte: {
        Args: {
          p: Database["public"]["Enums"]["cargo_size"]
          v: Database["public"]["Enums"]["vehicle_type"]
        }
        Returns: boolean
      }
    }
    Enums: {
      cargo_size: "P" | "M" | "G" | "XG"
      courier_status: "pendente" | "aprovado" | "reprovado" | "suspenso"
      courier_type: "proprio" | "autonomo"
      delivery_status:
        | "pendente"
        | "aceita"
        | "coletada"
        | "entregue"
        | "cancelada"
      offer_response: "aceita" | "recusada" | "expirada"
      order_status:
        | "novo"
        | "confirmado"
        | "em_preparo"
        | "aguardando_entregador"
        | "saiu_para_entrega"
        | "entregue"
        | "cancelado"
      payout_status: "agendado" | "processando" | "concluido" | "falhou"
      route_status:
        | "planejada"
        | "oferecida"
        | "aceita"
        | "em_andamento"
        | "concluida"
        | "cancelada"
      stock_movement_type:
        | "entrada"
        | "saida_pedido"
        | "ajuste_positivo"
        | "ajuste_negativo"
      stop_status: "pendente" | "no_local" | "concluida" | "falhou"
      stop_type: "coleta" | "entrega"
      vehicle_type: "a_pe" | "bicicleta" | "moto" | "carro" | "utilitario"
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
      cargo_size: ["P", "M", "G", "XG"],
      courier_status: ["pendente", "aprovado", "reprovado", "suspenso"],
      courier_type: ["proprio", "autonomo"],
      delivery_status: [
        "pendente",
        "aceita",
        "coletada",
        "entregue",
        "cancelada",
      ],
      offer_response: ["aceita", "recusada", "expirada"],
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
      route_status: [
        "planejada",
        "oferecida",
        "aceita",
        "em_andamento",
        "concluida",
        "cancelada",
      ],
      stock_movement_type: [
        "entrada",
        "saida_pedido",
        "ajuste_positivo",
        "ajuste_negativo",
      ],
      stop_status: ["pendente", "no_local", "concluida", "falhou"],
      stop_type: ["coleta", "entrega"],
      vehicle_type: ["a_pe", "bicicleta", "moto", "carro", "utilitario"],
    },
  },
} as const
