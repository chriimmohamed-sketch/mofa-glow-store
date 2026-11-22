/**
 * MOFA GLOW — خادم الطلبات (Google Apps Script)
 * ============================================================
 * يستقبل طلبات المتجر، يسجّلها في Google Sheets، ويجهّز صفوف
 * SpaceSeller / SpecsSeller للمنتجات التي لها SKU مؤكد.
 *
 * خطوات التركيب:
 * 1. أنشئ جدول Google جديداً.
 * 2. Extensions ← Apps Script ← الصق هذا الملف كاملاً.
 * 3. شغّل الدالة setupSheets مرة واحدة لتجهيز الأوراق.
 * 4. Project Settings ← Script Properties:
 *      SHEET_TOKEN = MG7X9q2L8pV4        (نفس SHEET_TOKEN في index.html)
 *      SS_API_KEY  = مفتاح SpecsSeller   (اختياري)
 *      SS_API_URL  = رابط API الرسمي     (اختياري)
 * 5. Deploy ← New deployment ← Web app
 *      Execute as: Me
 *      Who has access: Anyone
 *    ثم انسخ رابط /exec وضعه في SHEET_URL داخل index.html.
 *
 * ملاحظة مهمة:
 * - المنتجات 18/19/20 (العلكات) لها SKU مؤكد وتُرسل إلى ورقة SPACESELLER.
 * - بقية المنتجات (1–17) تُسجّل في ورقة ORDERS وتحتاج مطابقة SKU يدوياً
 *   قبل أن يستطيع SpecsSeller تنفيذها تلقائياً.
 */

var SECRET_TOKEN = 'MG7X9q2L8pV4'; // يمكن تغييره من Script Properties باسم SHEET_TOKEN
var ORDERS_SHEET = 'ORDERS';
var SPACESELLER_SHEET = 'SPACESELLER';
var LOG_SHEET = 'SYNC_LOG';

var FREE_SHIPPING_FROM = 300;
var SHIPPING_FEE = 35;
var PHONE_RE = /^0[5-7][0-9]{8}$/;

/* أسعار البيع المعتمدة في المتجر (درهم) — المصدر الوحيد للحساب على الخادم */
var PRODUCT_PRICES = {
  1: 350, 2: 350, 3: 350, 4: 275, 5: 350,
  6: 350, 7: 275, 8: 350, 9: 350, 10: 350,
  11: 350, 12: 350, 13: 499, 14: 350, 15: 350,
  16: 350, 17: 389,
  18: 275, 19: 275, 20: 275
};

/* SKU المؤكدة لدى SpaceSeller / SpecsSeller */
var PRODUCT_SKUS = {
  18: 'gumies-vitamine',
  19: 'gummies_melato',
  20: 'ashwagandha-gummies'
};

var ORDERS_HEADERS = [
  'date_order', 'order_id', 'full_name', 'phone', 'city', 'address',
  'product_id', 'sku', 'product_name', 'qty', 'unit_price', 'line_total',
  'subtotal', 'shipping', 'total', 'status'
];
var SPACESELLER_HEADERS = [
  'date_order', 'full_name', 'phone', 'address', 'sku', 'qte',
  'price', 'note', 'delivery_note', 'order_id'
];

function setupSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureSheet_(ss, ORDERS_SHEET, ORDERS_HEADERS);
  ensureSheet_(ss, SPACESELLER_SHEET, SPACESELLER_HEADERS);
  ensureSheet_(ss, LOG_SHEET, ['timestamp', 'order_id', 'action', 'status', 'detail']);
  SpreadsheetApp.getUi().alert('تم تجهيز الأوراق: ORDERS / SPACESELLER / SYNC_LOG');
}

function ensureSheet_(ss, name, headers) {
  var sh = ss.getSheetByName(name) || ss.insertSheet(name);
  if (sh.getLastRow() === 0) {
    sh.appendRow(headers);
    sh.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}

function token_() {
  return PropertiesService.getScriptProperties().getProperty('SHEET_TOKEN') || SECRET_TOKEN;
}

function errorOut_(message) {
  return json_({ ok: false, error: message });
}

function json_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function normalizePhone_(raw) {
  var d = String(raw || '').replace(/[^\d+]/g, '');
  if (d.indexOf('+212') === 0) d = '0' + d.slice(4);
  else if (d.indexOf('00212') === 0) d = '0' + d.slice(5);
  else if (/^212[5-7]\d{8}$/.test(d)) d = '0' + d.slice(3);
  else if (/^[5-7]\d{8}$/.test(d)) d = '0' + d;
  return PHONE_RE.test(d) ? d : '';
}

function dateOrder_() {
  var d = new Date();
  var pad = function (n) { return String(n).padStart(2, '0'); };
  return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear() +
    ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
}

function clean_(value, max) {
  return String(value == null ? '' : value).replace(/[\r\n\t]+/g, ' ').trim().slice(0, max);
}

function handleOrder_(raw) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var log = ensureSheet_(ss, LOG_SHEET, ['timestamp', 'order_id', 'action', 'status', 'detail']);
  var orderId = clean_(raw.id, 64) || 'MG-unknown';

  try {
    if (!raw.token || raw.token !== token_()) {
      log.appendRow([new Date(), orderId, 'REJECT', 'UNAUTHORIZED', 'token mismatch']);
      return errorOut_('unauthorized');
    }

    var name = clean_(raw.name, 120);
    var phone = normalizePhone_(raw.phone);
    var city = clean_(raw.city, 80);
    var address = clean_(raw.address, 300);

    if (name.length < 3) return errorOut_('invalid_name');
    if (!phone) return errorOut_('invalid_phone');
    if (address.length < 8) return errorOut_('invalid_address');
    if (!Array.isArray(raw.items) || !raw.items.length || raw.items.length > 20) {
      return errorOut_('invalid_items');
    }

    var orders = ensureSheet_(ss, ORDERS_SHEET, ORDERS_HEADERS);

    // منع تكرار نفس الطلب
    var last = orders.getLastRow();
    if (last >= 2) {
      var ids = orders.getRange(2, 2, last - 1, 1).getValues();
      for (var i = 0; i < ids.length; i++) {
        if (String(ids[i][0]).trim() === orderId) {
          log.appendRow([new Date(), orderId, 'DUPLICATE', 'SKIPPED', 'already exists']);
          return json_({ ok: true, id: orderId, duplicate: true });
        }
      }
    }

    var subtotal = 0;
    var lines = [];
    for (var j = 0; j < raw.items.length; j++) {
      var item = raw.items[j];
      var id = Number(item.id);
      var unit = PRODUCT_PRICES[id];
      var qty = Math.max(1, Math.min(20, parseInt(item.qty, 10) || 1));
      if (unit == null) {
        log.appendRow([new Date(), orderId, 'REJECT', 'INVALID_PRODUCT', 'id=' + id]);
        return errorOut_('invalid_product_' + id);
      }
      var lineTotal = unit * qty;
      subtotal += lineTotal;
      lines.push({
        id: id,
        sku: PRODUCT_SKUS[id] || '',
        name: clean_(item.name, 160),
        qty: qty,
        unit: unit,
        total: lineTotal
      });
    }

    var shipping = subtotal >= FREE_SHIPPING_FROM ? 0 : SHIPPING_FEE;
    var total = subtotal + shipping;
    var date = dateOrder_();
    var status = 'جديد';

    var orderRows = lines.map(function (line) {
      return [date, orderId, name, phone, city, address, line.id, line.sku,
        line.name, line.qty, line.unit, line.total, subtotal, shipping, total, status];
    });
    if (orderRows.length) {
      orders.getRange(orders.getLastRow() + 1, 1, orderRows.length, ORDERS_HEADERS.length)
        .setValues(orderRows);
    }

    // تجهيز صفوف SpaceSeller للمنتجات ذات SKU مؤكد
    var seller = ensureSheet_(ss, SPACESELLER_SHEET, SPACESELLER_HEADERS);
    var synced = 0;
    var manual = [];
    lines.forEach(function (line) {
      if (!line.sku) { manual.push(line.id + ':' + line.name); return; }
      seller.appendRow([date, name, phone, address, line.sku, line.qty,
        line.unit, 'Order ' + orderId, '', orderId]);
      synced++;
    });

    log.appendRow([new Date(), orderId, 'ORDER_CREATED', 'OK',
      'total=' + total + ' subtotal=' + subtotal + ' synced=' + synced +
      ' manual=' + manual.length]);

    // إرسال اختياري إلى SpecsSeller إذا توفّر الرابط والمفتاح
    var props = PropertiesService.getScriptProperties();
    var apiUrl = props.getProperty('SS_API_URL');
    var apiKey = props.getProperty('SS_API_KEY');
    if (apiUrl && apiKey) {
      try {
        var response = UrlFetchApp.fetch(apiUrl, {
          method: 'POST',
          contentType: 'application/json',
          headers: { Authorization: 'Bearer ' + apiKey },
          payload: JSON.stringify({
            order_id: orderId,
            customer: { name: name, phone: phone, city: city, address: address },
            items: lines.filter(function (l) { return !!l.sku; })
              .map(function (l) { return { sku: l.sku, quantity: l.qty, price: l.unit }; }),
            total: total,
            created_at: new Date().toISOString()
          }),
          muteHttpExceptions: true
        });
        log.appendRow([new Date(), orderId, 'SPECSSELLER_API', String(response.getResponseCode()),
          String(response.getContentText()).slice(0, 400)]);
      } catch (err) {
        log.appendRow([new Date(), orderId, 'SPECSSELLER_API', 'ERROR', String(err).slice(0, 400)]);
      }
    }

    return json_({
      ok: true,
      id: orderId,
      subtotal: subtotal,
      shipping: shipping,
      total: total,
      synced: synced,
      manual: manual.length
    });
  } catch (err) {
    try {
      log.appendRow([new Date(), orderId, 'ERROR', 'EXCEPTION', String(err).slice(0, 500)]);
    } catch (e) {}
    return errorOut_('server_error');
  }
}

function doPost(e) {
  var raw = {};
  try {
    raw = e && e.postData && e.postData.contents ? JSON.parse(e.postData.contents) : {};
  } catch (err) {
    return errorOut_('invalid_json');
  }
  return handleOrder_(raw);
}

function doGet(e) {
  // فحص صحة النشر: افتح رابط /exec في المتصفح
  if (e && e.parameter && e.parameter.health === '1') {
    return json_({ ok: true, service: 'mofa-glow-orders', time: new Date().toISOString() });
  }
  return json_({ ok: true, message: 'MOFA GLOW orders endpoint. Use POST.' });
}
