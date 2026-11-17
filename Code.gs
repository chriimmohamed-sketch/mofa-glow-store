/**
 * MOFA GLOW — Google Apps Script Web App
 * يربط المتجر بجدول Google Sheets مع تحقق كامل في الخادم (لا نثق بأسعار المتصفح أبداً).
 *
 * الإعداد:
 * 1. افتح https://sheets.new باسم "MOFA GLOW — الطلبات".
 * 2. Extensions ← Apps Script ← الصق هذا الملف.
 * 3. استبدل SECRET_TOKEN بقيمة عشوائية طويلة (مثال: اكتبها في Script Properties باسم TOKEN).
 * 4. Deploy ← New deployment ← Web app ← Execute as Me ← Anyone ← Deploy ← انسخ رابط /exec.
 * 5. ضع الرابط نفسه وSECRET_TOKEN نفسه في index.html داخل CONFIG.
 *
 * ملاحظات أمنية صادقة:
 * - SECRET_TOKEN في الجافاسكريبت مكشوف للزوار بطبيعته (موقع عام). قيمته: منع الإغراق الآلي العشوائي فقط،
 *   وليست حماية كاملة ضد مهاجم متعمّد. الحماية الحقيقية: منطق الخادم، فقد لا تُدخل أي بيانات لا تنطبق
 *   على REGION_PRICE_MAP، وتُسجّل كل محاولة مرفوضة في SYNC_LOG.
 * - لا يوجد طرق تمنع شخصاً متعمداً من تكرار الطلبات بتوجيه requests. الاعتماد على مراقبة SPAM/UsedIDs.
 */

var SECRET_TOKEN = 'CHANGE_ME_WITH_A_LONG_RANDOM_STRING'; // ← غيّرها قبل النشر
var ORDERS_SHEET = 'ORDERS';
var ITEMS_SHEET = 'ORDER_ITEMS';
var LOG_SHEET = 'SYNC_LOG';
var FREE_SHIP = 400;
var SHIP_FEE = 35;
var PHONE_RE = /^(0|212)[5-7][0-9]{8}$/;

// الأسعار الرسمية (درهم). غيّرها هنا حصرياً عند أي تغيير — لا تُقبل من المتصفح أبداً.
var PRODUCT_PRICES = {
  'retinol-100': 199,
  'retinol-airless': 215,
  'eclat': 195,
  'melasma': 205,
  'teeth': 179,
  'joints': 189,
  'homme': 209,
  'vitiligo': 219
};
var PROMO_CODE = 'GLOW2026';
var PROMO_PCT = 0.15;

function initSheets_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  [[ORDERS_SHEET, ['order_id','created_at','name','phone','city','address','promo','subtotal','discount','shipping','total','status','payment_method','payment_status','source','server_total','items_json']],
   [ITEMS_SHEET, ['order_id','product_id','qty','unit_price','line_total']],
   [LOG_SHEET, ['timestamp','order_id','action','status','detail']]].forEach(function(pair){
    var sh = ss.getSheetByName(pair[0]);
    if (!sh) { sh = ss.insertSheet(pair[0]); sh.appendRow(pair[1]); }
    if (sh.getLastRow() === 0) sh.appendRow(pair[1]);
  });
  return ss;
}

function out_(payload, callback) {
  var json = JSON.stringify(payload);
  if (callback) json = callback + '(' + json + ');';
  var mime = callback ? ContentService.MimeType.JAVASCRIPT : ContentService.MimeType.JSON;
  return ContentService.createTextOutput(json).setMimeType(mime);
}

function log_(ss, orderId, action, status, detail) {
  ss.getSheetByName(LOG_SHEET).appendRow([new Date(), orderId || '', action, status, detail || '']);
}

function recompute_(items) {
  var subtotal = 0, lines = [];
  for (var i = 0; i < items.length; i++) {
    var it = items[i];
    var price = PRODUCT_PRICES[it.id];
    var qty = Math.max(1, Math.min(20, parseInt(it.qty, 10) || 1));
    if (price == null) return { ok: false, error: 'invalid_product:' + it.id };
    subtotal += price * qty;
    lines.push({ product_id: it.id, qty: qty, unit_price: price, line_total: price * qty });
  }
  return { ok: true, subtotal: subtotal, lines: lines };
}

function handle_(raw) {
  var ss = initSheets_();
  var orderId = (raw.id && String(raw.id).slice(0, 64)) || 'MG-unknown';
  try {
    if (!raw.token || raw.token !== SECRET_TOKEN) {
      log_(ss, orderId, 'REJECT', 'UNAUTHORIZED', 'token mismatch');
      return out_({ ok: false, error: 'unauthorized' }, raw.callback);
    }
    var name = String(raw.name || '').trim().slice(0, 120);
    var phone = String(raw.phone || '').replace(/[\s.\-()]/g, '').slice(0, 16);
    var city = String(raw.city || '').trim().slice(0, 60);
    var address = String(raw.address || '').trim().slice(0, 300);
    if (name.length < 3 || address.length < 8) {
      log_(ss, orderId, 'REJECT', 'INVALID_INPUT', 'name/address too short');
      return out_({ ok: false, error: 'invalid_name_address' }, raw.callback);
    }
    if (!PHONE_RE.test(phone)) {
      log_(ss, orderId, 'REJECT', 'INVALID_INPUT', 'phone:' + phone);
      return out_({ ok: false, error: 'invalid_phone' }, raw.callback);
    }
    var items = Array.isArray(raw.items) ? raw.items : [];
    if (!items.length || items.length > 20) {
      log_(ss, orderId, 'REJECT', 'INVALID_INPUT', 'bad items count');
      return out_({ ok: false, error: 'invalid_items' }, raw.callback);
    }
    var calc = recompute_(items);
    if (!calc.ok) {
      log_(ss, orderId, 'REJECT', 'INVALID_PRODUCT', calc.error);
      return out_({ ok: false, error: calc.error }, raw.callback);
    }
    var promo = raw.promo || '';
    var discount = (promo === PROMO_CODE) ? Math.round(calc.subtotal * PROMO_PCT) : 0;
    var shipping = calc.subtotal >= FREE_SHIP ? 0 : SHIP_FEE;
    var total = calc.subtotal - discount + shipping;

    // فحص التكرار: نفس order_id ⇒ لا تُضف صفاً جديداً
    var ordersSheet = ss.getSheetByName(ORDERS_SHEET);
    var idCol = ordersSheet.getRange(2, 1, ordersSheet.getLastRow() || 1, 1).getValues();
    for (var r = 0; r < idCol.length; r++) {
      if (String(idCol[r][0]).trim() === orderId) {
        log_(ss, orderId, 'DUPLICATE', 'SKIPPED', 'already exists');
        return out_({ ok: true, dup: true }, raw.callback);
      }
    }
    var rowOut = [
      orderId, new Date(raw.createdAt || Date.now()), name, phone, city, address,
      promo, calc.subtotal, discount, shipping, total,
      'NEW', 'COD', 'UNCONFIRMED', 'WEB_FORM', total, JSON.stringify(calc.lines)
    ];
    ordersSheet.appendRow(rowOut);
    var itemsSheet = ss.getSheetByName(ITEMS_SHEET);
    calc.lines.forEach(function (li) {
      itemsSheet.appendRow([orderId, li.product_id, li.qty, li.unit_price, li.line_total]);
    });
    log_(ss, orderId, 'ORDER_CREATED', 'OK', 'total=' + total);
    return out_({ ok: true, id: orderId, total: total }, raw.callback);
  } catch (err) {
    log_(ss, orderId, 'ERROR', 'EXCEPTION', String(err));
    return out_({ ok: false, error: 'server_error' }, raw.callback);
  }
}

function doPost(e) {
  var raw = {};
  try { raw = e && e.postData && e.postData.contents ? JSON.parse(e.postData.contents) : {}; } catch (err) { raw = {}; }
  return handle_(raw);
}

// JSONP support for cross-origin browser verification (see index.html sendOrderToSheets)
function doGet(e) {
  var raw = {};
  try { raw = e && e.parameter && e.parameter.data ? JSON.parse(e.parameter.data) : {}; } catch (err) { raw = {}; }
  raw.callback = (e && e.parameter && e.parameter.callback) ? String(e.parameter.callback).replace(/[^a-zA-Z0-9_$]/g, '') : '';
  return handle_(raw);
}
