/**
 * MOFA GLOW — Google Apps Script Web App (SpaceSeller sync)
 * يستقبل الطلبات من متجرنا ويكتبها مباشرة في ورقة Google بالمطابقة مع قالب SpaceSeller
 *
 * الخطوات:
 * 1. انسخ قالب SpaceSeller (Our sheet) إلى داخلك أو أنشئ ورقة بنفس أسماء الأعمدة
 * 2. Extensions ← Apps Script ← الصق هذا الملف
 * 3. غيّر SECRET_TOKEN إلى قيمة عشوائية طويلة
 * 4. Deploy ← New deployment ← Web app ← Execute as Me ← Anyone with the link ← Deploy ← انسخ رابط /exec
 * 5. ضع الرابط في CONFIG.sheetUrl والتوكن نفسه في CONFIG.sheetToken في index.html
 * 6. في صفحة SpaceSeller Integrations: ألصق الـ Sheet ID والاسم (راجع README.md)
 */

var SECRET_TOKEN = 'CHANGE_ME_TO_A_LONG_RANDOM_STRING';
var ORDERS_SHEET = ''; // leave empty for the active sheet, or set e.g. 'Our sheet'
var LOG_SHEET = 'SYNC_LOG';
var FREE_SHIP = 400;
var SHIP_FEE = 35;
var PHONE_RE = /^(0|212)[5-7][0-9]{8}$/;

// SpaceSeller SKU → supplier unit price (MAD). أي تغيير لاحق يتم هنا حصرياً.
var PRODUCT_PRICES = {
  colon30: 160,
  'ear-ringing': 161,
  'joint-oil': 160,
  gainpro250g: 220,
  ejacontrol: 155,
  'collagen-prodre': 220,
  iode30: 154,
  'fem-boost250g': 229,
  melatonine30: 166,
  'huile-épilation': 162,
  'vitiligo-noir': 158,
  'creme-retanol': 157,
  'gut-balance30': 157,
  niacinamide: 172,
  'cidre-pomme': 155,
  'migra-relief30': 162
};
var PROMO_CODE = 'GLOW2026';
var PROMO_PCT = 0.15;

function getOrdersSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (ORDERS_SHEET) {
    var s = ss.getSheetByName(ORDERS_SHEET);
    if (s) return s;
  }
  return ss.getSheets()[0]; // أول ورقة = قالب SpaceSeller
}

function initLog_(ss) {
  var sh = ss.getSheetByName(LOG_SHEET);
  if (!sh) { sh = ss.insertSheet(LOG_SHEET); sh.appendRow(['timestamp','order_id','action','status','detail']); }
  if (sh.getLastRow() === 0) sh.appendRow(['timestamp','order_id','action','status','detail']);
  return sh;
}

function normalizePhone_(p) {
  var digits = String(p).replace(/[\s.\-()]/g, '');
  if (digits.indexOf('+212') === 0) digits = '0' + digits.slice(4);
  else if (digits.indexOf('212') === 0 && digits.length === 12) digits = '0' + digits.slice(3);
  return digits;
}

function normalizeDate_(iso) {
  try { var d = new Date(iso || Date.now()); if (!isNaN(d)) { var pad=function(n){return String(n).padStart(2,'0');}; return pad(d.getDate())+'/'+pad(d.getMonth()+1)+'/'+d.getFullYear()+' '+pad(d.getHours())+':'+pad(d.getMinutes())+':'+pad(d.getSeconds()); } } catch (e) {}
  return new Date().toLocaleString();
}

function recompute_(items) {
  var subtotal = 0, lines = [];
  for (var i = 0; i < items.length; i++) {
    var it = items[i];
    var price = PRODUCT_PRICES[it.id];
    var qty = Math.max(1, Math.min(20, parseInt(it.qty, 10) || 1));
    if (price == null) return { ok: false, error: 'invalid_product:' + it.id };
    subtotal += price * qty;
    lines.push({ sku: it.id, qty: qty, unit: price, line: price * qty });
  }
  return { ok: true, subtotal: subtotal, lines: lines };
}

function out_(payload, callback) {
  var json = JSON.stringify(payload);
  if (callback) json = callback + '(' + json + ');';
  var mime = callback ? ContentService.MimeType.JAVASCRIPT : ContentService.MimeType.JSON;
  return ContentService.createTextOutput(json).setMimeType(mime);
}

function handle_(raw) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var log = initLog_(ss);
  var orderId = (raw.id && String(raw.id).slice(0, 64)) || 'MG-unknown';
  try {
    if (!raw.token || raw.token !== SECRET_TOKEN) { log.appendRow([new Date(), orderId, 'REJECT', 'UNAUTHORIZED', 'token mismatch']); return out_({ ok: false, error: 'unauthorized' }, raw.callback); }
    var name = String(raw.name || '').trim().slice(0, 120);
    var phone = normalizePhone_(raw.phone || '');
    var address = String(raw.address || '').trim().slice(0, 300);
    if (name.length < 3 || address.length < 8) { log.appendRow([new Date(), orderId, 'REJECT', 'INVALID_INPUT', 'name/address']); return out_({ ok: false, error: 'invalid_name_address' }, raw.callback); }
    if (!PHONE_RE.test(phone)) { log.appendRow([new Date(), orderId, 'REJECT', 'INVALID_INPUT', 'phone']); return out_({ ok: false, error: 'invalid_phone' }, raw.callback); }
    var items = Array.isArray(raw.items) ? raw.items : [];
    if (!items.length || items.length > 20) { log.appendRow([new Date(), orderId, 'REJECT', 'INVALID_INPUT', 'items']); return out_({ ok: false, error: 'invalid_items' }, raw.callback); }
    var calc = recompute_(items);
    if (!calc.ok) { log.appendRow([new Date(), orderId, 'REJECT', 'INVALID_PRODUCT', calc.error]); return out_({ ok: false, error: calc.error }, raw.callback); }
    var promo = raw.promo || '';
    var discount = (promo === PROMO_CODE) ? Math.round(calc.subtotal * PROMO_PCT) : 0;
    var shipping = calc.subtotal >= FREE_SHIP ? 0 : SHIP_FEE;
    var total = calc.subtotal - discount + shipping;

    // حساب التكرار: عمود order_id غير المرئي (J)
    var orders = getOrdersSheet_();
    var lastRow = orders.getLastRow();
    if (lastRow >= 2) {
      var ids = orders.getRange(2, 10, lastRow - 1, 1).getValues();
      for (var r = 0; r < ids.length; r++) { if (String(ids[r][0]).trim() === orderId) { log.appendRow([new Date(), orderId, 'DUPLICATE', 'SKIPPED', 'already exists']); return out_({ ok: true, dup: true }, raw.callback); } }
    }

    var dateOrder = normalizeDate_(raw.createdAt);
    var note = 'Order ' + orderId;
    var deliveryNote = '';
    calc.lines.forEach(function (li) {
      orders.appendRow([dateOrder, name, phone, address, li.sku, li.qty, li.unit, note, deliveryNote, orderId]);
    });
    // سجل المبالغ الإجمالية (لا يؤثر على تكامل SpaceSeller)
    log.appendRow([new Date(), orderId, 'ORDER_CREATED', 'OK', 'total=' + total + ' subtotal=' + calc.subtotal]);
    return out_({ ok: true, id: orderId, total: total }, raw.callback);
  } catch (err) {
    log.appendRow([new Date(), orderId, 'ERROR', 'EXCEPTION', String(err)]);
    return out_({ ok: false, error: 'server_error' }, raw.callback);
  }
}

function doPost(e) {
  var raw = {};
  try { raw = e && e.postData && e.postData.contents ? JSON.parse(e.postData.contents) : {}; } catch (err) { raw = {}; }
  return handle_(raw);
}

function doGet(e) {
  var raw = {};
  try { raw = e && e.parameter && e.parameter.data ? JSON.parse(e.parameter.data) : {}; } catch (err) { raw = {}; }
  raw.callback = (e && e.parameter && e.parameter.callback) ? String(e.parameter.callback).replace(/[^a-zA-Z0-9_$]/g, '') : '';
  return handle_(raw);
}
