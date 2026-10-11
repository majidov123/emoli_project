import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";

const targets = await fetch("http://127.0.0.1:9222/json").then((response) => response.json());
const target = targets.find((entry) => entry.type === "page" && entry.url.startsWith("http://127.0.0.1:5173"));
assert.ok(target?.webSocketDebuggerUrl, "Local dashboard target was not found");

const socket = new WebSocket(target.webSocketDebuggerUrl);
const pending = new Map();
const runtimeErrors = [];
let sequence = 0;

await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});

socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.id) {
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    if (message.error) request.reject(new Error(message.error.message));
    else request.resolve(message.result);
    return;
  }
  if (message.method === "Runtime.exceptionThrown") {
    runtimeErrors.push(message.params.exceptionDetails.text);
  }
});

function send(method, params = {}) {
  sequence += 1;
  const id = sequence;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

async function evaluate(expression) {
  const result = await send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true
  });
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
  return result.result.value;
}

async function waitFor(expression, message, timeout = 10000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeout) {
    if (await evaluate(expression)) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(message);
}

async function screenshot(path) {
  const metrics = await send("Page.getLayoutMetrics");
  const width = Math.max(1, Math.ceil(metrics.cssContentSize.width));
  const height = Math.max(1, Math.ceil(metrics.cssContentSize.height));
  const capture = await send("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
    captureBeyondViewport: true,
    clip: { x: 0, y: 0, width, height, scale: 1 }
  });
  await writeFile(path, Buffer.from(capture.data, "base64"));
}

await send("Page.enable");
await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", {
  width: 1536,
  height: 960,
  deviceScaleFactor: 1,
  mobile: false
});
await send("Page.navigate", { url: "http://127.0.0.1:5173/" });
await waitFor("document.readyState === 'complete'", "Dashboard did not finish loading");
await waitFor("[...document.querySelectorAll('button')].some((button) => button.textContent.includes('Parametrlər'))", "Settings button was not rendered");
await waitFor("document.querySelector('.store-panel h1')?.textContent.trim() === 'Caspian Demo Market'", "Local store data did not load");

assert.equal(await evaluate("document.querySelector('.store-panel h1')?.textContent.trim()"), "Caspian Demo Market");
await evaluate("[...document.querySelectorAll('button')].find((button) => button.textContent.includes('Parametrlər')).click(); true");
await waitFor("Boolean(document.querySelector('.settings-shell[open]'))", "Settings drawer did not open");
await evaluate("[...document.querySelectorAll('.settings-primary-actions button')].find((button) => button.textContent.includes('İdarəetmə paneli')).click(); true");
await waitFor("Boolean(document.querySelector('.management-page'))", "Management dashboard did not open");
await waitFor("document.querySelector('.management-stat-card--action strong')?.textContent.trim() === '10'", "Overview order total did not load");

assert.deepEqual(
  await evaluate("[...document.querySelectorAll('.management-tabs button')].map((button) => button.textContent.trim())"),
  ["Ümumi", "Sifarişlər", "Götürülmə nöqtələri", "Analitika", "Hesabat"]
);
await screenshot("/tmp/emoli-orders-overview.png");

await evaluate("document.querySelector('.management-stat-card--action').click(); true");
await waitFor("Boolean(document.querySelector('.settings-order-dialog[open]'))", "All-orders modal did not open");

const expectedAllLabels = [
  "Hamısı", "Alıcı evdə olmayıb", "Geri qaytarma", "Qablaşdırmada", "Yeni",
  "Müştəri ilə dəqiqləşdirilir", "Müştəridən təsdiq alındı", "Təslimə hazırdır",
  "Çatdırılma üçün qəbul edildi", "Çatdırılma üçün qəbul edilmədi",
  "Bölüşdürmə mərkəzinə yoldadır", "Bölüşdürmə mərkəzindədir", "Çatdırılma planlaşdırılıb",
  "Kuryerdədir", "PUDO-ya yoldadır", "PUDO-dadır", "Çatdırıldı", "Qismən çatdırıldı",
  "Müştəri imtina etdi", "Logistika ləğv etdi", "Tamamlandı", "Müştəri ləğv etdi",
  "Market ləğv etdi", "Yenidən yönləndirilib", "STORAGE_AT_DC_PARTNER",
  "ON_THE_WAY_TO_DC_PARTNER", "Aralıq mərkəzə yoldadır", "Aralıq mərkəzdədir",
  "Yığılma üçün təsdiqlənib", "Yığılmada", "Yığılma tamamlandı", "Paketləndi", "OFFLINE_CREDIT"
];
assert.deepEqual(
  await evaluate("[...document.querySelector('.settings-order-dialog select').options].map((option) => option.textContent)"),
  expectedAllLabels
);
assert.equal(await evaluate("document.querySelectorAll('.settings-order-dialog__list > li').length"), 10);
assert.equal(await evaluate("document.querySelector('.settings-order-card h3')?.textContent.startsWith('#')"), true);
assert.equal(await evaluate("Boolean(document.querySelector('.settings-order-card__placeholder, .settings-order-card__image'))"), true);
assert.equal(
  await evaluate("Math.abs(document.querySelector('.settings-order-dialog h2').getBoundingClientRect().top - document.querySelector('.settings-order-dialog select').getBoundingClientRect().top) < 30"),
  true
);
await screenshot("/tmp/emoli-all-orders-modal.png");

await evaluate("const select = document.querySelector('.settings-order-dialog select'); select.value = 'NEW'; select.dispatchEvent(new Event('change', { bubbles: true })); true");
await waitFor("document.querySelectorAll('.settings-order-dialog__list > li').length === 1", "All-orders status filter did not apply");
await evaluate("document.querySelector('.settings-order-dialog button[aria-label=\"Sifariş siyahısını bağla\"]').click(); true");
await waitFor("!document.querySelector('.settings-order-dialog')", "All-orders modal did not close");

await evaluate("document.querySelector('#management-tab-orders').click(); true");
await waitFor("Boolean(document.querySelector('.orders-dashboard'))", "Orders tab did not open");
assert.equal(await evaluate("document.querySelector('#management-tab-orders').getAttribute('aria-selected')"), "true");
assert.deepEqual(
  await evaluate("[...document.querySelectorAll('.orders-kpi-card > strong')].map((node) => Number(node.textContent))"),
  [1, 2, 4, 3]
);
assert.equal(await evaluate("document.querySelectorAll('.orders-table tbody tr').length"), 10);
await screenshot("/tmp/emoli-orders-dashboard.png");

const modalExpectations = [
  [0, "Yeni sifarişlər", 4],
  [1, "Çatdırılan sifarişlər", 4],
  [2, "Çatdırılmada olanlar", 14],
  [3, "Ləğv edilən sifarişlər", 6]
];
for (const [index, title, optionCount] of modalExpectations) {
  await evaluate(`document.querySelectorAll('.orders-kpi-card')[${index}].click(); true`);
  await waitFor("Boolean(document.querySelector('.settings-order-dialog[open]'))", `${title} modal did not open`);
  assert.equal(await evaluate("document.querySelector('.settings-order-dialog h2').textContent.trim()"), title);
  assert.equal(await evaluate("document.querySelector('.settings-order-dialog select').options.length"), optionCount);
  if (index === 0) await screenshot("/tmp/emoli-new-orders-modal.png");
  await evaluate("document.querySelector('.settings-order-dialog button[aria-label=\"Sifariş siyahısını bağla\"]').click(); true");
  await waitFor("!document.querySelector('.settings-order-dialog')", `${title} modal did not close`);
}

await evaluate("[...document.querySelectorAll('.orders-quick-filters button')].find((button) => button.textContent.includes('Ləğv edilən')).click(); true");
await waitFor("document.querySelectorAll('.orders-table tbody tr').length === 3", "Cancelled quick filter did not apply");
await evaluate("document.querySelector('.orders-filter-reset').click(); true");
await waitFor("document.querySelectorAll('.orders-table tbody tr').length === 10", "Reset did not restore orders");

await evaluate("const selects = document.querySelectorAll('.orders-filter-grid select'); selects[1].value = 'DELIVERED'; selects[1].dispatchEvent(new Event('change', { bubbles: true })); document.querySelector('.orders-filter-apply').click(); true");
await waitFor("document.querySelectorAll('.orders-table tbody tr').length === 3", "Subsequent-status filter did not use history");
await evaluate("document.querySelector('.orders-filter-reset').click(); true");

await evaluate("const input = document.querySelectorAll('.orders-filter-grid input[type=date]')[0]; input.value = '2026-09-03'; input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true })); true");
await new Promise((resolve) => setTimeout(resolve, 100));
await evaluate("const input = document.querySelectorAll('.orders-filter-grid input[type=date]')[1]; input.value = '2026-09-03'; input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true })); true");
await new Promise((resolve) => setTimeout(resolve, 100));
await evaluate("document.querySelector('.orders-filter-apply').click(); true");
await waitFor("document.querySelectorAll('.orders-table tbody tr').length === 1", "Inclusive date filters did not apply");
await evaluate("document.querySelector('.orders-filter-reset').click(); true");

await evaluate("const select = document.querySelector('.orders-pagination select'); select.value = '5'; select.dispatchEvent(new Event('change', { bubbles: true })); true");
await waitFor("document.querySelectorAll('.orders-table tbody tr').length === 5", "Page size control did not apply");
assert.equal(await evaluate("document.querySelector('.orders-pagination button[aria-label=\"Növbəti səhifə\"]').disabled"), false);
await evaluate("document.querySelector('.orders-pagination button[aria-label=\"Növbəti səhifə\"]').click(); true");
await waitFor("document.querySelector('.orders-pagination').textContent.includes('Səhifə 2 / 2')", "Next-page control did not apply");

await evaluate("document.querySelector('.orders-load-button').click(); true");
await waitFor("document.querySelector('.orders-inline-feedback.is-success')?.textContent.includes('yenidən oxundu')", "Local reload feedback did not appear");

await send("Emulation.setDeviceMetricsOverride", {
  width: 390,
  height: 844,
  deviceScaleFactor: 1,
  mobile: true
});
await evaluate("window.scrollTo(0, 0); true");
await new Promise((resolve) => setTimeout(resolve, 200));
assert.equal(await evaluate("getComputedStyle(document.querySelector('.orders-kpi-grid')).gridTemplateColumns.split(' ').length"), 1);
await screenshot("/tmp/emoli-orders-mobile.png");

assert.deepEqual(runtimeErrors, []);
console.log(JSON.stringify({
  overview: "/tmp/emoli-orders-overview.png",
  allOrders: "/tmp/emoli-all-orders-modal.png",
  orders: "/tmp/emoli-orders-dashboard.png",
  newOrders: "/tmp/emoli-new-orders-modal.png",
  mobile: "/tmp/emoli-orders-mobile.png",
  checks: "overview, all-orders filter, full status list, four KPI modals, quick/history/date filters, reset, pagination, reload, responsive grid",
  runtimeErrors
}, null, 2));

socket.close();
