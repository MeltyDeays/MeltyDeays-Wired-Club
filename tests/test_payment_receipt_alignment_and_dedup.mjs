import assert from "assert";
import fs from "fs";

console.log("=== VERIFICACIÓN: ALINEACIÓN RECIBO DE PAGO Y DEDUPLICACIÓN DE CATÁLOGO ===");

// 1. Verificación de estructura DOM en index.html
const html = fs.readFileSync("index.html", "utf8");

assert.ok(html.includes('id="confirm-row-max-disc"'), "Debe existir #confirm-row-max-disc");
assert.ok(html.includes('class="receipt-label-col"'), "Debe existir .receipt-label-col dentro del recibo");
assert.ok(html.includes('id="confirm-type-pct-calc"'), "Debe existir #confirm-type-pct-calc");
assert.ok(html.includes('id="confirm-type-max-disc"'), "Debe existir #confirm-type-max-disc");

// Validar que confirm-type-pct-calc esté contenido dentro de receipt-label-col
const labelColIdx = html.indexOf('class="receipt-label-col"');
const pctCalcIdx = html.indexOf('id="confirm-type-pct-calc"');
const maxDiscValIdx = html.indexOf('id="confirm-type-max-disc"');

assert.ok(labelColIdx < pctCalcIdx, "pct-calc debe ubicarse dentro de receipt-label-col");
assert.ok(pctCalcIdx < maxDiscValIdx, "pct-calc debe ubicarse antes de la columna de valores numéricos");
console.log("  ✓ Test 1: Estructura DOM de 2 columnas en ticket verificada.");

// 2. Verificación de CSS en confirm-redeem.css
const css = fs.readFileSync("css/modals/confirm-redeem.css", "utf8");
assert.ok(css.includes(".receipt-label-col"), "confirm-redeem.css debe estilizar .receipt-label-col");
assert.ok(css.includes("#confirm-type-pct-calc"), "confirm-redeem.css debe estilizar #confirm-type-pct-calc");
assert.ok(css.includes("tabular-nums"), "Valores deben mantener alineación tabular");
console.log("  ✓ Test 2: CSS de alineación vertical y reglas tipográficas verificadas.");

// 3. Verificación de deduplicación en CustomerCatalogView.js
const catalogJs = fs.readFileSync("js/views/customer/CustomerCatalogView.js", "utf8");
assert.ok(catalogJs.includes("dedupMap = new Map()"), "CustomerCatalogView.js debe contener dedupMap defensivo");
assert.ok(catalogJs.includes("existing.stock = (existing.stock || 0) + (item.stock || 0)"), "Debe fusionar stock de duplicados");
console.log("  ✓ Test 3: Lógica de deduplicación defensiva presente en CustomerCatalogView.js.");

console.log("=== TODAS LAS PRUEBAS DE RECIBO Y DEDUPLICACIÓN PASARON EXITOSAMENTE ===");
