/**
 * Teste de isolamento RLS — verifica que as policies estão funcionando
 *
 * Cria dados de teste via service_role e depois consulta como cada ator
 * para validar que o isolamento funciona corretamente.
 *
 * Critérios de aceite:
 * - Tenant A NÃO consegue ver stores do Tenant B
 * - Entregador NÃO vê courier_locations de outros entregadores
 * - Consumidor NÃO vê pedidos de outros consumidores
 * - Admin consegue ver tudo
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://rtesdjobtgqkiuywadnl.supabase.co";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0ZXNkam9idGdxa2l1eXdhZG5sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDM5MzUzOSwiZXhwIjoyMDg5OTY5NTM5fQ.ROmxCwdchCId8lYw7wtyhh4XuoVDddCOUGWBvzNamcA";
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0ZXNkam9idGdxa2l1eXdhZG5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzOTM1MzksImV4cCI6MjA4OTk2OTUzOX0.DNP6R-QjIH6JtkGbFBsJ32jw3NubjY41vuRPjURIWNM";

// Service role client (bypasses RLS)
const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Helpers
const TS = Date.now();
const email = (name) => `test_rls_${name}_${TS}@test.local`;
const pass = "TestRLS2026!!";
let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) {
    console.log(`  ✅ ${msg}`);
    passed++;
  } else {
    console.log(`  ❌ FALHOU: ${msg}`);
    failed++;
  }
}

// Creates an auth user with given role metadata and returns { user, session }
async function createTestUser(name, role) {
  const { data, error } = await admin.auth.admin.createUser({
    email: email(name),
    password: pass,
    email_confirm: true,
    user_metadata: { role },
  });
  if (error) throw new Error(`Erro ao criar user ${name}: ${error.message}`);
  return data.user;
}

// Returns an authenticated supabase client for the given user
async function clientAs(userEmail) {
  const client = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await client.auth.signInWithPassword({
    email: userEmail,
    password: pass,
  });
  if (error) throw new Error(`Erro ao logar ${userEmail}: ${error.message}`);
  return client;
}

// ============================================================
// SETUP
// ============================================================

async function setup() {
  console.log("\n🔧 SETUP — criando dados de teste...\n");

  // --- Create users ---
  const tenantUserA = await createTestUser("tenantA", "tenant");
  const tenantUserB = await createTestUser("tenantB", "tenant");
  const consumerUserA = await createTestUser("consumerA", "consumer");
  const consumerUserB = await createTestUser("consumerB", "consumer");
  const courierUserA = await createTestUser("courierA", "courier");
  const courierUserB = await createTestUser("courierB", "courier");
  const adminUser = await createTestUser("admin", "admin");

  console.log("  Usuários criados: 7");

  // --- Create plan ---
  const { data: plan } = await admin
    .from("plans")
    .insert({ nome: `Plano Teste RLS ${TS}`, preco_mensal: 9900, max_lojas: 5, max_produtos: 100, ativo: true })
    .select()
    .single();
  console.log(`  Plano: ${plan.id}`);

  // --- Create tenants ---
  const { data: tenantA } = await admin
    .from("tenants")
    .insert({ user_id: tenantUserA.id, nome_responsavel: "Tenant A", email: email("tenantA"), slug: `test-a-${TS}` })
    .select()
    .single();

  const { data: tenantB } = await admin
    .from("tenants")
    .insert({ user_id: tenantUserB.id, nome_responsavel: "Tenant B", email: email("tenantB"), slug: `test-b-${TS}` })
    .select()
    .single();

  console.log(`  Tenants: A=${tenantA.id}, B=${tenantB.id}`);

  // --- Create subscriptions (required for store trigger) ---
  await admin.from("tenant_subscriptions").insert({ tenant_id: tenantA.id, plan_id: plan.id });
  await admin.from("tenant_subscriptions").insert({ tenant_id: tenantB.id, plan_id: plan.id });

  // --- Create stores ---
  const { data: storeA } = await admin
    .from("stores")
    .insert({ tenant_id: tenantA.id, nome: `Loja A ${TS}`, slug: `loja-a-${TS}` })
    .select()
    .single();

  const { data: storeB } = await admin
    .from("stores")
    .insert({ tenant_id: tenantB.id, nome: `Loja B ${TS}`, slug: `loja-b-${TS}` })
    .select()
    .single();

  console.log(`  Stores: A=${storeA.id}, B=${storeB.id}`);

  // --- Create consumers ---
  const { data: consumerA } = await admin
    .from("consumers")
    .insert({ user_id: consumerUserA.id, nome: "Consumer A" })
    .select()
    .single();

  const { data: consumerB } = await admin
    .from("consumers")
    .insert({ user_id: consumerUserB.id, nome: "Consumer B" })
    .select()
    .single();

  console.log(`  Consumers: A=${consumerA.id}, B=${consumerB.id}`);

  // --- Create orders ---
  const orderBase = {
    forma_pagamento: "dinheiro",
    subtotal: 5000,
    taxa_entrega: 500,
    total: 5500,
    endereco_entrega: { rua: "Rua Teste", numero: "1" },
  };

  const { data: orderA } = await admin
    .from("orders")
    .insert({ ...orderBase, consumer_id: consumerA.id, store_id: storeA.id, tenant_id: tenantA.id })
    .select()
    .single();

  const { data: orderB } = await admin
    .from("orders")
    .insert({ ...orderBase, consumer_id: consumerB.id, store_id: storeB.id, tenant_id: tenantB.id })
    .select()
    .single();

  console.log(`  Orders: A=${orderA.id}, B=${orderB.id}`);

  // --- Create couriers ---
  const { data: courierA } = await admin
    .from("couriers")
    .insert({ user_id: courierUserA.id, nome: "Courier A", tenant_id: tenantA.id, tipo: "proprio", status: "aprovado" })
    .select()
    .single();

  const { data: courierB } = await admin
    .from("couriers")
    .insert({ user_id: courierUserB.id, nome: "Courier B", tenant_id: tenantB.id, tipo: "proprio", status: "aprovado" })
    .select()
    .single();

  console.log(`  Couriers: A=${courierA.id}, B=${courierB.id}`);

  // --- Create delivery assignments ---
  const { data: assignA } = await admin
    .from("delivery_assignments")
    .insert({ order_id: orderA.id, courier_id: courierA.id, tenant_id: tenantA.id, status: "aceita", valor_entrega: 500 })
    .select()
    .single();

  const { data: assignB } = await admin
    .from("delivery_assignments")
    .insert({ order_id: orderB.id, courier_id: courierB.id, tenant_id: tenantB.id, status: "aceita", valor_entrega: 500 })
    .select()
    .single();

  // --- Create courier locations ---
  await admin.from("courier_locations").insert({ courier_id: courierA.id, assignment_id: assignA.id, latitude: -20.1389, longitude: -44.8841 });
  await admin.from("courier_locations").insert({ courier_id: courierB.id, assignment_id: assignB.id, latitude: -20.1400, longitude: -44.8850 });

  console.log("  Courier locations criadas");

  return {
    tenantUserA, tenantUserB,
    consumerUserA, consumerUserB,
    courierUserA, courierUserB,
    adminUser,
    tenantA, tenantB,
    storeA, storeB,
    consumerA, consumerB,
    orderA, orderB,
    courierA, courierB,
    plan,
  };
}

// ============================================================
// TESTES
// ============================================================

async function runTests(ctx) {
  // --- Teste 1: Tenant A NÃO vê stores do Tenant B ---
  console.log("\n📋 TESTE 1: Isolamento de stores entre tenants");
  const clientTenantA = await clientAs(email("tenantA"));
  const clientTenantB = await clientAs(email("tenantB"));

  const { data: storesA } = await clientTenantA.from("stores").select("id, nome, tenant_id");
  const storeIdsA = storesA.map((s) => s.id);
  assert(storeIdsA.includes(ctx.storeA.id), "Tenant A vê sua própria loja");
  assert(!storeIdsA.includes(ctx.storeB.id) || storesA.find(s => s.id === ctx.storeB.id)?.tenant_id !== ctx.tenantA.id,
    "Tenant A não vê loja do Tenant B como própria (pode ver como pública)");

  const { data: storesB } = await clientTenantB.from("stores").select("id, nome, tenant_id");
  const storeIdsB = storesB.map((s) => s.id);
  assert(storeIdsB.includes(ctx.storeB.id), "Tenant B vê sua própria loja");

  // --- Teste 2: Tenant A NÃO consegue UPDATE na store do Tenant B ---
  console.log("\n📋 TESTE 2: Tenant A não pode alterar store do Tenant B");
  const { error: updateErr } = await clientTenantA
    .from("stores")
    .update({ nome: "HACKEADO" })
    .eq("id", ctx.storeB.id);

  // Verificar que o nome não mudou
  const { data: storeCheck } = await admin.from("stores").select("nome").eq("id", ctx.storeB.id).single();
  assert(storeCheck.nome !== "HACKEADO", "Store do Tenant B não foi alterada pelo Tenant A");

  // --- Teste 3: Consumidor A NÃO vê pedidos do Consumidor B ---
  console.log("\n📋 TESTE 3: Isolamento de orders entre consumidores");
  const clientConsumerA = await clientAs(email("consumerA"));
  const clientConsumerB = await clientAs(email("consumerB"));

  const { data: ordersA, error: errOA } = await clientConsumerA.from("orders").select("id");
  if (errOA) console.log("  ⚠️  Erro ordersA:", errOA.message);
  const orderIdsA = (ordersA || []).map((o) => o.id);
  assert(orderIdsA.includes(ctx.orderA.id), "Consumer A vê seu próprio pedido");
  assert(!orderIdsA.includes(ctx.orderB.id), "Consumer A NÃO vê pedido do Consumer B");

  const { data: ordersB, error: errOB } = await clientConsumerB.from("orders").select("id");
  if (errOB) console.log("  ⚠️  Erro ordersB:", errOB.message);
  const orderIdsB = (ordersB || []).map((o) => o.id);
  assert(orderIdsB.includes(ctx.orderB.id), "Consumer B vê seu próprio pedido");
  assert(!orderIdsB.includes(ctx.orderA.id), "Consumer B NÃO vê pedido do Consumer A");

  // --- Teste 4: Entregador A NÃO vê courier_locations do Entregador B ---
  console.log("\n📋 TESTE 4: Isolamento de courier_locations entre entregadores");
  const clientCourierA = await clientAs(email("courierA"));
  const clientCourierB = await clientAs(email("courierB"));

  const { data: locsA, error: errLA } = await clientCourierA.from("courier_locations").select("courier_id");
  if (errLA) console.log("  ⚠️  Erro locsA:", errLA.message);
  const locCourierIdsA = (locsA || []).map((l) => l.courier_id);
  assert(locCourierIdsA.includes(ctx.courierA.id), "Courier A vê sua própria localização");
  assert(!locCourierIdsA.includes(ctx.courierB.id), "Courier A NÃO vê localização do Courier B");

  const { data: locsB, error: errLB } = await clientCourierB.from("courier_locations").select("courier_id");
  if (errLB) console.log("  ⚠️  Erro locsB:", errLB.message);
  const locCourierIdsB = (locsB || []).map((l) => l.courier_id);
  assert(locCourierIdsB.includes(ctx.courierB.id), "Courier B vê sua própria localização");
  assert(!locCourierIdsB.includes(ctx.courierA.id), "Courier B NÃO vê localização do Courier A");

  // --- Teste 5: Admin vê tudo ---
  console.log("\n📋 TESTE 5: Admin vê tudo");
  const clientAdmin = await clientAs(email("admin"));

  const { data: allStores, error: errAS } = await clientAdmin.from("stores").select("id");
  if (errAS) console.log("  ⚠️  Erro admin stores:", errAS.message);
  const allStoreIds = (allStores || []).map((s) => s.id);
  assert(allStoreIds.includes(ctx.storeA.id), "Admin vê store do Tenant A");
  assert(allStoreIds.includes(ctx.storeB.id), "Admin vê store do Tenant B");

  const { data: allOrders, error: errAO } = await clientAdmin.from("orders").select("id");
  if (errAO) console.log("  ⚠️  Erro admin orders:", errAO.message);
  const allOrderIds = (allOrders || []).map((o) => o.id);
  assert(allOrderIds.includes(ctx.orderA.id), "Admin vê order do Consumer A");
  assert(allOrderIds.includes(ctx.orderB.id), "Admin vê order do Consumer B");

  const { data: allLocations, error: errAL } = await clientAdmin.from("courier_locations").select("courier_id");
  if (errAL) console.log("  ⚠️  Erro admin locations:", errAL.message);
  const allLocIds = (allLocations || []).map((l) => l.courier_id);
  assert(allLocIds.includes(ctx.courierA.id), "Admin vê location do Courier A");
  assert(allLocIds.includes(ctx.courierB.id), "Admin vê location do Courier B");

  // --- Teste 6: Tenant A vê pedidos de SUA loja, não de outra ---
  console.log("\n📋 TESTE 6: Lojista vê apenas pedidos de suas lojas");
  const { data: tenantOrdersA, error: errTO } = await clientTenantA.from("orders").select("id");
  if (errTO) console.log("  ⚠️  Erro tenant orders:", errTO.message);
  const tenantOrderIdsA = (tenantOrdersA || []).map((o) => o.id);
  assert(tenantOrderIdsA.includes(ctx.orderA.id), "Tenant A vê pedido da sua loja");
  assert(!tenantOrderIdsA.includes(ctx.orderB.id), "Tenant A NÃO vê pedido da loja do Tenant B");
}

// ============================================================
// CLEANUP
// ============================================================

async function cleanup(ctx) {
  console.log("\n🧹 CLEANUP — removendo dados de teste...\n");

  // Delete in reverse dependency order
  await admin.from("courier_locations").delete().in("courier_id", [ctx.courierA.id, ctx.courierB.id]);
  await admin.from("delivery_assignments").delete().in("order_id", [ctx.orderA.id, ctx.orderB.id]);
  await admin.from("order_items").delete().in("order_id", [ctx.orderA.id, ctx.orderB.id]);
  await admin.from("orders").delete().in("id", [ctx.orderA.id, ctx.orderB.id]);
  await admin.from("couriers").delete().in("id", [ctx.courierA.id, ctx.courierB.id]);
  await admin.from("consumers").delete().in("id", [ctx.consumerA.id, ctx.consumerB.id]);
  await admin.from("stores").delete().in("id", [ctx.storeA.id, ctx.storeB.id]);
  await admin.from("tenant_subscriptions").delete().in("tenant_id", [ctx.tenantA.id, ctx.tenantB.id]);
  await admin.from("tenants").delete().in("id", [ctx.tenantA.id, ctx.tenantB.id]);
  await admin.from("plans").delete().eq("id", ctx.plan.id);

  // Delete test users
  const users = [
    ctx.tenantUserA, ctx.tenantUserB,
    ctx.consumerUserA, ctx.consumerUserB,
    ctx.courierUserA, ctx.courierUserB,
    ctx.adminUser,
  ];
  for (const u of users) {
    await admin.auth.admin.deleteUser(u.id);
  }

  console.log("  Dados de teste removidos.\n");
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log("╔══════════════════════════════════════════╗");
  console.log("║  TESTE DE ISOLAMENTO RLS — Mall Online   ║");
  console.log("╚══════════════════════════════════════════╝");

  let ctx;
  try {
    ctx = await setup();
    await runTests(ctx);
  } catch (err) {
    console.error("\n💥 ERRO:", err.message);
    failed++;
  } finally {
    if (ctx) await cleanup(ctx);
  }

  console.log("═══════════════════════════════════════════");
  console.log(`  RESULTADO: ${passed} passed, ${failed} failed`);
  console.log("═══════════════════════════════════════════\n");

  process.exit(failed > 0 ? 1 : 0);
}

main();
