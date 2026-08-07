# 31 — Logística de Entrega (Carga · Veículo · Despacho · Rotas)

### Plataforma Delivery Divinópolis

*Versão 1.1 — 07/08/2026*

-----

## VISAO GERAL

Este arquivo define o **motor logístico** da plataforma: como a carga de um
pedido é classificada, qual veículo pode transportá-la, como o entregador é
escolhido automaticamente, e como pedidos próximos são agrupados em uma única
rota multi-parada.

O que existia antes deste módulo (arquivos 19-22) resolvia **uma entrega por
vez, escolhida manualmente pelo lojista**. Este módulo é aditivo: nada do
fluxo atual é quebrado, e o despacho manual permanece como fallback permanente.

**Quatro capacidades novas:**

1. **Separação de carga** — cada pedido ganha um perfil (porte, peso, volume,
   refrigeração, fragilidade) calculado a partir dos itens
1. **Veículo certo para cada carga** — matriz de compatibilidade decide quem
   pode atender cada pedido
1. **Despacho automático** — o sistema oferece a entrega ao melhor entregador
   disponível, em cascata, sem depender do lojista escolher
1. **Agrupamento e rota** — pedidos para o mesmo endereço ou endereços próximos
   viram uma rota com sequência otimizada

-----

## 1. SEPARACAO DE CARGA

### 1.1 Cadastro em cascata (decisão central)

O nível certo da informação de carga varia por tipo de comércio. Uma açaiteria
ou pizzaria tem carga **homogênea** — obrigá-la a preencher peso e volume item
a item gera atrito e dado ruim. Um supermercado ou pet shop tem carga
**heterogênea** — é no produto (fardo de refrigerante, ração 15 kg) que a
informação decide o veículo.

Por isso o cadastro é em **cascata de precedência**. O sistema busca o atributo
no nível mais específico que estiver preenchido:

```
atributo do PRODUTO (se preenchido — exceções e itens grandes)
  → senão, default da CATEGORIA (ex: "Bebidas 2L" já traz 2.200 g)
    → senão, PERFIL PADRAO DA LOJA (item médio, cadastrado uma única vez)
```

|Nível             |Quem preenche / quando                                                                                  |Exemplo                                                        |
|------------------|--------------------------------------------------------------------------------------------------------|---------------------------------------------------------------|
|**Loja** (base)   |Uma única vez, no onboarding — 3 campos: peso e volume do *item médio* + flags. Cobre 100% do cardápio de carga homogênea.|Açaiteria: 700 g / 1 L, refrigerado. Pizzaria: 1.100 g / 8 L. |
|**Categoria**     |Defaults sugeridos pela plataforma nas categorias globais; lojista ajusta nas próprias se quiser.        |"Rações grandes": 15.000 g. "Bebidas — fardo": 12.000 g.       |
|**Produto** (override)|Só nas exceções e nos comércios de carga heterogênea. Campos visíveis conforme o segmento da loja.   |Pote de açaí 10 L numa loja cujo padrão é P.                   |

> **Sem decisão extra no onboarding.** O lojista não escolhe um "modo de
> cadastro": o segmento da loja define o comportamento. Alimentação → só o
> perfil da loja é pedido. Mercado/pet/bebidas → campos de carga aparecem no
> cadastro de produto, pré-preenchidos pelos defaults de categoria. O override
> por produto está sempre disponível para qualquer segmento.

> **O perfil da loja descreve o *item médio*, não o pedido.** O porte do pedido
> continua sendo calculado pela soma dos itens × quantidades (§1.3). Um pedido
> de 8 pizzas numa loja de perfil P resulta corretamente em carga M/G.

### 1.2 Atributos de carga (mesmos campos nos três níveis)

|Campo          |Tipo             |Uso                                                            |
|---------------|-----------------|---------------------------------------------------------------|
|`peso_g`       |INTEGER (gramas) |Soma define o porte da carga do pedido                         |
|`volume_ml`    |INTEGER (ml)     |Aproximação de volume para capacidade da bag/baú               |
|`refrigerado`  |BOOLEAN          |Exige bag térmica / cadeia fria                                |
|`fragil`       |BOOLEAN          |Bolos, ovos, floricultura, vidros — restringe agrupamento      |

Defaults de fallback (quando nem loja nem categoria nem produto informam):
`800 g` e `1.500 ml` por item — calibrados para o item típico de alimentação,
que é o segmento de maior volume na plataforma.

### 1.3 Perfil de carga do pedido (calculado)

No checkout, a function `calcular_perfil_carga_pedido(order_id)` consolida os
itens — resolvendo cada atributo pela cascata — e grava o perfil no pedido.

|Porte      |Critério (soma dos itens)|Exemplo típico                          |Comporta em            |
|-----------|-------------------------|----------------------------------------|-----------------------|
|**P**      |até 4 kg e 20 L          |Lanche, açaí, farmácia                  |Qualquer modal         |
|**M**      |até 10 kg e 45 L         |Pizza família, compra pequena de mercado|Moto com baú, carro    |
|**G**      |até 25 kg e 120 L        |Compra semanal, fardo de bebidas        |Carro                  |
|**XG**     |acima de G               |Compra de mês, múltiplos fardos         |Utilitário (Fase 3)    |

**Flags herdadas dos itens:** `REFRIGERADO` · `FRAGIL` · `ALTO VALOR`
(total > R$ 300 → exige confirmação por código, não aceita foto).

### 1.4 Separação física na loja

- Etiqueta do pedido exibe porte + flags (ex: **"G · REFRIGERADO · 2 volumes"**)
- Campo `volumes` preenchido pelo lojista na separação — o entregador confere
  volume a volume na coleta
- Pedidos `REFRIGERADO` só entram em rota com entregador com `bag_termica = true`

-----

## 2. VEICULO CERTO PARA CADA CARGA

O campo livre `couriers.veiculo_tipo` passa a ser o ENUM `vehicle_type`, com
capacidade operacional associada. O cadastro ganha `bag_termica`,
`capacidade_peso_g`, `capacidade_volume_ml` e `raio_max_km`.

|Veículo      |Carga máx.|Raio operacional|Portes    |Vocação em Divinópolis                      |
|-------------|----------|----------------|----------|--------------------------------------------|
|`a_pe`       |4 kg      |1,5 km          |P         |Hipercentro; picos de almoço                |
|`bicicleta`  |6 kg      |3 km            |P         |Centro expandido; sem custo de combustível  |
|`moto`       |12 kg     |10 km           |P, M      |**Espinha dorsal da frota**                 |
|`carro`      |80 kg     |sem limite urbano|P, M, G  |Mercado, pet, bebidas, chuva, multi-drop    |
|`utilitario` |300 kg    |regional        |todos + XG|Fase 3 — atacarejo, B2B, expansão           |

**Regra de elegibilidade** (`courier_elegivel_para_rota`): um entregador é
elegível quando **(1)** porte da carga ∈ portes do veículo; **(2)** peso e
volume totais ≤ capacidade restante; **(3)** flags atendidas (refrigerado →
bag térmica); **(4)** distância total ≤ raio do modal; **(5)** aprovado,
online e sem rota em andamento acima do limite de paradas.

**Fallback de frota:** sem veículo compatível online, o pedido entra em fila
com alerta ao lojista e ao admin — aguardar, dividir em duas entregas M, ou
usar entregador próprio.

-----

## 3. MOTOR DE DESPACHO

### 3.1 Fluxo

```
Pedido pago → status "em_preparo" (lojista confirma)
   │
   ├─ Perfil de carga calculado (§1)  ·  tempo de preparo estimado
   │
   ▼
JANELA DE CONSOLIDACAO (§4): aguarda até N min por vizinhos agrupáveis
   │        (N = 0 alimentação quente; 5-10 min demais segmentos)
   ▼
RANQUEAMENTO de elegíveis por score:
   40% proximidade da loja + 20% adequação do veículo
 + 15% taxa de aceitação   + 15% avaliação média + 10% tempo ocioso
   Entregadores PROPRIOS do lojista têm prioridade absoluta se online
   ▼
OFERTA EM CASCATA: top-1 recebe push com 45 s para aceitar
   → recusou/expirou → próximo → após 3 ciclos, broadcast num raio de 5 km
   → 10 min sem aceite → alerta ao lojista (override manual) e ao admin
   ▼
Aceite → rota aceita → coleta → entrega (fluxo dos arquivos 20-21 preservado)
```

### 3.2 Regras

- **Oferta ≠ atribuição.** Antes, a linha em `delivery_assignments` nascia já
  com entregador definido. Agora existe `dispatch_offers` (uma linha por
  oferta, com expiração) e o assignment só é criado **no aceite** — isso
  preserva o histórico de recusas, que alimenta o score.
- **Anti-afogamento:** um entregador não recebe nova oferta enquanto tem
  oferta pendente; o limite de paradas por rota (§4.3) limita sobrecarga.
- **Recusa sem punição imediata:** taxa de aceitação entra no score com peso
  15% — recusar muito reduz prioridade, sem bloquear.
- **Implementação:** Edge Function `dispatch-order` disparada na mudança para
  `aguardando_entregador` + `pg_cron` a cada 30 s (`processar_fila_despacho()`)
  para expirar ofertas e reofertar. Sem infra nova.

-----

## 4. AGRUPAMENTO DE ENTREGAS

### 4.1 Cenários

|# |Cenário                                  |Fase   |Regra                                                                       |
|--|-----------------------------------------|-------|----------------------------------------------------------------------------|
|A |Mesma loja → **mesmo endereço**          |Fase 1 |Sempre que as janelas de preparo coincidirem. 1 coleta, 1 deslocamento.     |
|B |Mesma loja → **endereços próximos**      |Fase 1 |Drops a ≤ 800 m entre si *ou* desvio total ≤ 15%. 1 coleta, N drops.       |
|C |**Lojas próximas** → endereços próximos  |Fase 2 |Coletas a ≤ 600 m entre si (praça de alimentação, mesmo corredor).         |
|D |**Rota de zona** por bairro              |Fase 3 |Janela de 15-20 min para segmentos não urgentes; frete "entrega econômica". |

### 4.2 Condições para juntar dois pedidos (todas precisam valer)

1. **Proximidade:** Haversine entre drops ≤ 800 m *ou* desvio de rota ≤ 15%
1. **Capacidade:** soma de peso/volume cabe no veículo candidato (§2)
1. **SLA:** ETA do último drop ≤ 45 min do fim do preparo do primeiro pedido;
   alimentação quente: máximo **2 drops** e desvio ≤ 10%
1. **Compatibilidade:** `FRAGIL` limita a 2 drops; `REFRIGERADO` não agrupa com
   rota longa (> 20 min totais)
1. **Janela de consolidação:** o pedido só espera vizinho **enquanto está em
   preparo** — a espera de matching nunca atrasa a saída

### 4.3 Limites operacionais

|Veículo         |Máx. paradas/rota|Máx. pedidos alimentação|
|----------------|-----------------|------------------------|
|A pé / bicicleta|2                |2                       |
|Moto            |3                |2                       |
|Carro           |5                |3                       |

> **Proteção da experiência.** O consumidor de um pedido agrupado nunca deve
> perceber piora: o app mostra o rastreio individual e o ETA do *seu* drop. Se
> o agrupamento estimar atraso acima do limite, o motor não agrupa — na dúvida,
> entrega individual. Métrica de guarda: avaliação de pedidos agrupados ≥
> pedidos individuais.

-----

## 5. ROTEIRIZACAO

|Nível  |Técnica                                    |Detalhe                                                                                              |
|-------|-------------------------------------------|-----------------------------------------------------------------------------------------------------|
|Fase 1 |Haversine × fator viário 1,3 + vizinho-mais-próximo|Para ≤ 5 paradas o ótimo é alcançável por enumeração (5! = 120). Sem custo de API. Suficiente para Divinópolis.|
|Fase 2 |OSRM self-hosted (OpenStreetMap)           |Distância e tempo reais de rua. Container único cobre MG; ~US$ 10-20/mês, zero por requisição.       |
|Fase 3 |Google Routes API / Mapbox                 |Trânsito em tempo real, se os KPIs justificarem o custo por chamada.                                  |

**Experiência do entregador:** a tela "Em rota" lista as paradas em sequência
(coletas primeiro, depois drops), com a próxima em destaque — o fluxo atual de
1 entrega vira o caso particular de rota com 2 paradas. Deep link do Google
Maps com waypoints (`&waypoints=lat1,lng1|lat2,lng2`). Cada parada tem
confirmação própria (coleta: conferência de volumes; drop: código/foto — o
mecanismo do arquivo 20 é preservado).

**ETA do consumidor** = fim estimado do preparo + soma das pernas anteriores +
4 min de handling por parada anterior. Recalculado a cada atualização de
posição (infra Realtime do arquivo 21). Exibido como faixa ("18h40 – 18h55").

-----

## 6. PRECIFICACAO E IMPACTO FINANCEIRO

### 6.1 Frete cobrado do consumidor

```
frete = base(veículo mínimo p/ porte) + km_rota × tarifa_km + adicionais

Referência inicial (parâmetros configuráveis, calibrar com a operação):
  base: a pé/bike R$ 4,00 · moto R$ 6,00 · carro R$ 9,00
  tarifa_km (acima de 2 km): R$ 1,20/km
  adicionais: refrigerado +R$ 2,00 · G/XG +R$ 3,00
```

### 6.2 Remuneração do entregador em rota agrupada

```
ganho_rota = base_veículo + km_total_rota × tarifa_km + R$ 2,50 × (drops − 1)
```

O entregador ganha **mais por rota** (menos km ociosos, adicional por drop) e
o consumidor paga **menos por pedido**. O excedente entre a soma dos fretes e
o ganho da rota é a margem de eficiência — proposta: **50/50 entre desconto ao
consumidor ("frete combinado") e resultado da plataforma**.

### 6.3 Compatibilidade com o split Pagar.me

> **Nenhuma mudança estrutural.** Estágio 1 (split Mallevo + lojista) intocado.
> Estágio 2 continua sendo **um transfer por pedido** ao recipient do
> entregador — numa rota com 3 pedidos, são 3 transfers cuja soma é o ganho da
> rota (base e km rateados por drop, adicional por drop integral). A Edge
> Function `transfer-to-courier` apenas passa a calcular o valor a partir da
> rota. Pedidos com pagamento na entrega seguem fora do gateway.

-----

## 7. MODELO DE DADOS

Evolução aditiva. `delivery_assignments` continua sendo a **unidade
financeira** (1 por pedido, `order_id UNIQUE`); a rota passa a ser a **unidade
operacional** (N assignments por rota).

```
-- 1) Carga em cascata: loja (base) → categoria (default) → produto (override)
stores      + carga_item_peso_g, carga_item_volume_ml,
              carga_refrigerada, carga_fragil
categories  + peso_g, volume_ml, refrigerado, fragil   -- NULL = herda da loja
products    + peso_g, volume_ml, refrigerado, fragil   -- NULL = herda categoria

-- Resolução por item (function resolver_carga_item):
--   COALESCE(product.peso_g, category.peso_g, store.carga_item_peso_g, 800)

-- 2) Pedido: perfil consolidado (trigger no checkout)
orders      + carga_porte (cargo_size), carga_peso_g, carga_volume_ml,
              carga_refrigerada, carga_fragil, carga_alto_valor, volumes,
              entrega_lat, entrega_lng, entrega_geohash7

-- 3) Entregador: veículo estruturado
couriers    + veiculo (vehicle_type), bag_termica, capacidade_peso_g,
              capacidade_volume_ml, raio_max_km

-- 4) Rota (unidade operacional)
delivery_routes  id · courier_id · status(route_status) · distancia_total_m
                 duracao_estimada_s · ganho_total · drops · tenant_id
route_stops      id · route_id · ordem · tipo(stop_type: coleta|entrega)
                 order_id · store_id · lat · lng · status(stop_status)
                 eta · concluida_em

-- 5) Assignment vira filho da rota (financeiro por pedido preservado)
delivery_assignments + route_id

-- 6) Ofertas de despacho (histórico e score)
dispatch_offers  id · route_id · courier_id · enviado_em · expira_em
                 respondido_em · resposta(offer_response)
```

Migrations: `20260807120000` (carga e veículo) · `20260807120001` (rotas e
despacho) · `20260807120002` (matching, score e agrupamento).

**RLS:** entregador vê apenas suas rotas/paradas/ofertas; lojista vê rotas que
tocam pedidos do seu tenant; consumidor vê apenas o stop do próprio pedido;
admin vê tudo.

-----

## 8. ROADMAP

|Fase       |Entregas                                                                                                                                                                                                 |Esforço |Critério de sucesso                                                        |
|-----------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|--------|---------------------------------------------------------------------------|
|**Fase 1** |Cadastro de carga em cascata + perfil do pedido; ENUM de veículo + matriz; despacho automático em cascata (`dispatch_offers` + Edge Function + pg_cron); agrupamento A e B; rota com vizinho-mais-próximo; tela de rota multi-parada; frete por km.|3-4 sem |≥ 80% dos pedidos despachados sem toque do lojista; zero regressão.        |
|**Fase 2** |OSRM self-hosted; multi-coleta (cenário C); ETA dinâmico; painel admin de monitoramento; ajuste dos pesos do score com dados reais.                                                                        |4-6 sem |≥ 20% dos pedidos em rotas agrupadas; erro de ETA < 6 min; custo −15%.     |
|**Fase 3** |Rotas de zona; previsão de demanda por horário/bairro; tarifa dinâmica; utilitários e XG; avaliação de Routes API; preparação multi-cidade.                                                                |contínuo|Expansão regional sem redesenho; entregas/hora 2× o baseline.              |

> **Implantação:** cada fase entra atrás de feature flag por tenant —
> lojistas-piloto primeiro (alimentação, mercado, farmácia), medição por 2
> semanas, depois rollout. O despacho manual permanece como fallback.

-----

## 9. KPIs

|KPI                                          |Meta inicial   |
|---------------------------------------------|---------------|
|Tempo pedido pago → aceite do entregador     |< 4 min (p90)  |
|% de despachos sem intervenção manual        |≥ 80%          |
|% de pedidos em rota agrupada                |≥ 20% (Fase 2) |
|Custo médio de frete por pedido              |−15% até Fase 2|
|Entregas/hora por entregador online          |+50% até Fase 2|
|Avaliação de pedidos agrupados vs individuais|≥ paridade     |
|Taxa de aceite da 1ª oferta                  |≥ 60%          |

-----

## 10. RISCOS E MITIGACAO

|Risco                                     |Mitigação                                                                                          |
|------------------------------------------|---------------------------------------------------------------------------------------------------|
|Comida fria em rota agrupada              |Alimentação: máx. 2 drops, desvio ≤ 10%, janela zero após o preparo; monitorar avaliação por segmento.|
|Frota pequena no início (poucos carros)   |Fallback de divisão de carga (§2); recrutamento dirigido por dados de demanda reprimida.           |
|Entregadores rejeitarem rotas agrupadas   |Adicional por drop + ganho total visível antes do aceite; acompanhar taxa de aceite por tipo de rota.|
|RLS complexa em rotas multi-tenant        |Cenário C (multi-loja) só na Fase 2, depois do RLS da Fase 1 estabilizado.                          |
|Endereços sem geocodificação confiável    |Geocodificar no cadastro do endereço com confirmação do pin; sem lat/lng → entrega individual.      |
|Custo de APIs de mapa                     |Fase 1 sem API; Fase 2 OSRM (custo fixo baixo); APIs pagas só na Fase 3 mediante KPIs.              |

-----

## CHECKLIST DO MODULO (Fase 1)

- [x] Migration `20260807120000` — carga em cascata (stores/categories/products)
- [x] Migration `20260807120000` — ENUM `vehicle_type` + capacidade do courier
- [x] Migration `20260807120000` — perfil de carga em `orders` + trigger
- [x] Migration `20260807120001` — `delivery_routes`, `route_stops`, `dispatch_offers`
- [x] Migration `20260807120001` — `delivery_assignments.route_id` + RLS
- [x] Migration `20260807120002` — haversine, elegibilidade, score, agrupamento
- [x] Migration `20260807120002` — `processar_fila_despacho()` para pg_cron
- [x] Edge Function `dispatch-order`
- [ ] `pg_cron` agendado a cada 30 s em produção (§3.2)
- [ ] Dashboard: campos de carga no cadastro de loja/produto por segmento
- [ ] Partner App: exibir porte + flags + campo `volumes` na separação
- [ ] Courier App: tela de rota multi-parada (substitui `ativa.tsx` de 1 entrega)
- [ ] Consumer App: ETA em faixa e rastreio por drop
- [ ] Geocodificação de endereço no cadastro do consumidor
- [ ] Feature flag por tenant + seleção dos lojistas-piloto

-----

*Arquivo 31 — Índice Mestre disponível no arquivo 00*
*Relacionados: 03 (schema) · 12 (gestão de pedidos) · 19-22 (entregador) · 30 (Pagar.me)*
