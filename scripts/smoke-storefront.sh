#!/usr/bin/env bash
# Smoke do storefront contra o Supabase REAL, sem Docker.
#
# O `.env.local` do storefront aponta para produção e a loja só é lida pelas
# views públicas, então dá para exercitar as 18 vitrines, o saguão e o preview
# com dados de verdade. É leitura pura: nada aqui escreve no banco.
#
# O que prova:
#   - apex, loja e preview respondem;
#   - cada uma das 18 vitrines devolve HTML DIFERENTE das outras (md5), que é o
#     que mostra que o gate `preset × categoria` realmente troca o layout;
#   - o rascunho hostil do `/preview` não injeta script (achado A-01);
#   - a CSP do checkout e do preview está como esperado (achado A-13);
#   - host desconhecido responde 404 em vez do saguão (achado A-21).
#
# Uso: pnpm smoke:storefront            (ou PORT=3013 bash scripts/smoke-storefront.sh)
set -uo pipefail
cd "$(dirname "$0")/.."

PORT="${PORT:-3012}"
LOJA="${LOJA:-guaimbe}"
BASE="http://localhost:${PORT}"
HOST_LOJA="${LOJA}.mallevo.localhost"
TMP="$(mktemp -d)"
FALHAS=0

limpar() { fuser -k "${PORT}/tcp" >/dev/null 2>&1 || true; rm -rf "$TMP"; }
trap limpar EXIT

ok()   { printf '  \033[32m✔\033[0m %s\n' "$1"; }
erro() { printf '  \033[31m✘\033[0m %s\n' "$1"; FALHAS=$((FALHAS + 1)); }

# `next start` exige build. Reaproveita o .next existente se houver.
if [ ! -d apps/storefront/.next ]; then
  echo "▶ build do storefront (.next ausente)"
  (cd apps/storefront && npx next build >"$TMP/build.log" 2>&1) || {
    tail -20 "$TMP/build.log"; echo "build falhou"; exit 1
  }
fi

echo "▶ subindo o storefront na porta ${PORT} (override de QA ligado)"
fuser -k "${PORT}/tcp" >/dev/null 2>&1 || true
(cd apps/storefront && STOREFRONT_ALLOW_PREVIEW_OVERRIDE=true npx next start -p "$PORT" >"$TMP/server.log" 2>&1 &)
if ! curl -s --retry 90 --retry-delay 1 --retry-connrefused --max-time 60 -o /dev/null "$BASE/robots.txt"; then
  tail -20 "$TMP/server.log"; echo "servidor não subiu"; exit 1
fi

# rota | host | esperado
checar() {
  local rota="$1" host="$2" esperado="$3"
  local code
  code=$(curl -s -o "$TMP/r.html" -w '%{http_code}' --max-time 90 -H "Host: $host" "$BASE$rota")
  if [ "$code" = "$esperado" ]; then ok "$host$rota → $code"; else erro "$host$rota → $code (esperado $esperado)"; fi
}

echo
echo "── apex (saguão) ──"
# Atenção: /piso usa o slug do PISO (casa-vida, praca-alimentacao…), não o da
# categoria. /piso/floricultura-plantas dando 404 é o comportamento correto.
checar /                        "localhost:${PORT}" 200
checar /explorar                "localhost:${PORT}" 200
checar /piso/casa-vida          "localhost:${PORT}" 200
checar /piso/nao-existe         "localhost:${PORT}" 404
checar /saguao                  "localhost:${PORT}" 308
checar /sitemap.xml             "localhost:${PORT}" 200
checar /robots.txt              "localhost:${PORT}" 200
checar /                        "www.mallevo.localhost" 200
# Host fora dos domínios da Mallevo não serve o saguão (A-21): 404 seco, a
# menos que NEXT_PUBLIC_ALLOW_UNKNOWN_HOST=true (previews da Vercel).
checar /                        "dominio-de-terceiro.example" 404

echo
echo "── loja (${HOST_LOJA}) ──"
checar /          "$HOST_LOJA" 200
checar /checkout  "$HOST_LOJA" 200
checar /entrar    "$HOST_LOJA" 200
checar /explorar  "$HOST_LOJA" 404   # rota do saguão não existe no host de loja
checar /          "nao-existe-xyz.mallevo.localhost" 404

# O id sai do sitemap, não da home: a maioria das vitrines abre o produto em
# modal (ProdutoModalHost), então não há link `/produto/<id>` no HTML.
curl -s --max-time 60 -H "Host: $HOST_LOJA" "$BASE/sitemap.xml" -o "$TMP/sitemap.xml"
PRODUTO=$(grep -oE '/produto/[0-9a-f-]{36}' "$TMP/sitemap.xml" | head -1 || true)
if [ -n "$PRODUTO" ]; then checar "$PRODUTO" "$HOST_LOJA" 200; else erro "sitemap da loja sem nenhum /produto/<id>"; fi

echo
echo "── 18 vitrines pelo override de QA (md5 tem de ser único) ──"
PARES="editorial:vestuario-calcados raw:vestuario-calcados serene:beleza-cosmeticos
artisan:casa-decoracao noir:alimentos-bebidas volt:vestuario-calcados
clinic:farmacia-medicamentos roast:alimentos-bebidas smash:alimentos-bebidas
ritual:alimentos-bebidas magazine:outros garden:alimentos-bebidas
slice:alimentos-bebidas mono:vestuario-calcados heritage:alimentos-bebidas
market:mercado-conveniencia soft:saloes-estetica fresh:mercado-conveniencia"

: >"$TMP/md5s"
for par in $PARES; do
  preset="${par%%:*}"; categoria="${par##*:}"
  code=$(curl -s -o "$TMP/v.html" -w '%{http_code}' --max-time 90 -H "Host: $HOST_LOJA" \
    "$BASE/?preset=${preset}&categoria=${categoria}")
  # O `nonce` do Next muda a cada request e não faz parte do layout.
  md5=$(sed -E 's/nonce="[^"]*"//g' "$TMP/v.html" | md5sum | cut -c1-8)
  if [ "$code" = "200" ]; then printf '  %-10s %s\n' "$preset" "$md5"; else erro "$preset → $code"; fi
  echo "$md5" >>"$TMP/md5s"
done
UNICOS=$(sort -u "$TMP/md5s" | wc -l)
TOTAL=$(wc -l <"$TMP/md5s")
if [ "$UNICOS" = "$TOTAL" ]; then ok "$UNICOS layouts distintos em $TOTAL vitrines"
else erro "só $UNICOS layouts distintos em $TOTAL — duas vitrines renderizaram igual"; fi

echo
echo "── preview (rascunho e moldura do app) ──"
b64() { printf '%s' "$1" | base64 -w0 | tr '+/' '-_' | tr -d '='; }
DRAFT=$(b64 '{"theme":{"preset":"smash","palette":"smash-1"},"conteudo":{"v":1,"campanha":{"titulo":"Titulo do smoke"}},"categoria":"alimentos-bebidas"}')
curl -s --max-time 90 -H "Host: $HOST_LOJA" "$BASE/preview?draft=$DRAFT" -o "$TMP/p.html"
grep -q 'Titulo do smoke' "$TMP/p.html" && ok "rascunho aplicado (campanha)" || erro "campanha do rascunho não apareceu"
# A pele do rascunho é escrita depois da publicada e vence a cascata: o ÚLTIMO
# bloco :root é o que vale.
ACCENT=$(grep -oE -- '--accent:#[0-9A-Fa-f]{6}' "$TMP/p.html" | tail -1)
[ -n "$ACCENT" ] && ok "pele do rascunho no :root ($ACCENT)" || erro "nenhuma CSS var de accent no preview"

curl -s --max-time 90 -H "Host: $HOST_LOJA" "$BASE/preview?draft=$DRAFT&app=1" -o "$TMP/app.html"
ABAS=$(grep -oE '>(Início|Explorar|Pedidos|Perfil)<' "$TMP/app.html" | sort -u | wc -l)
[ "$ABAS" = "4" ] && ok "moldura App com as 4 abas" || erro "moldura App mostrou $ABAS abas (esperado 4)"

echo
echo "── segurança ──"
XSS=$(b64 '{"theme":{"preset":"smash","color":{"accent":"red}</style><script>window.__xss=1</script><style>"}}}')
curl -s --max-time 90 -H "Host: $HOST_LOJA" "$BASE/preview?draft=$XSS" -o "$TMP/x.html"
if grep -q 'window.__xss' "$TMP/x.html"; then erro "A-01: rascunho hostil injetou script no HTML da loja"
else ok "A-01: rascunho hostil não injeta script"; fi

SHAPE=$(b64 '{"theme":{"preset":"smash","shape":{"radius":"nope"}}}')
code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 90 -H "Host: $HOST_LOJA" "$BASE/preview?draft=$SHAPE")
[ "$code" = "200" ] && ok "A-02: shape inválido responde 200" || erro "A-02: shape inválido → $code"

csp_de() { curl -s -D - -o /dev/null --max-time 60 -H "Host: $HOST_LOJA" "$BASE$1" | tr -d '\r' | grep -i '^content-security-policy:' | head -1; }
CSP_CHECKOUT="$(csp_de /checkout)"
CSP_PREVIEW="$(csp_de /preview)"
echo "$CSP_CHECKOUT" | grep -q "frame-ancestors 'none'" && ok "A-13: checkout não é embutível" || erro "A-13: checkout sem frame-ancestors 'none' ($CSP_CHECKOUT)"
echo "$CSP_PREVIEW"  | grep -q "app.mallevo.com.br"     && ok "A-13: preview embutível pelo dashboard" || erro "A-13: preview sem o dashboard na CSP ($CSP_PREVIEW)"

echo
echo "── erros no servidor ──"
if grep -qiE '⨯|unhandledRejection|TypeError|Internal Server Error' "$TMP/server.log"; then
  erro "o servidor registrou erros:"; grep -iE '⨯|unhandledRejection|TypeError|Internal Server Error' "$TMP/server.log" | head -10
else ok "log do servidor limpo"; fi

echo
if [ "$FALHAS" = "0" ]; then echo "✔ smoke do storefront verde"; exit 0
else echo "✘ smoke do storefront com $FALHAS falha(s)"; exit 1; fi
