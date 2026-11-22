/**
 * MOFA GLOW ظ¤ ╪«╪د╪»┘à ╪د┘╪╖┘╪ذ╪د╪ز (Google Apps Script)
 * ============================================================
 * ┘è╪│╪ز┘é╪ذ┘ ╪╖┘╪ذ╪د╪ز ╪د┘┘à╪ز╪ش╪▒╪î ┘è╪│╪ش┘ّ┘┘ç╪د ┘┘è Google Sheets╪î ┘ê┘è╪ش┘ç┘ّ╪▓ ╪╡┘┘ê┘
 * SpaceSeller / SpecsSeller ┘┘┘à┘╪ز╪ش╪د╪ز ╪د┘╪ز┘è ┘┘ç╪د SKU ┘à╪ج┘â╪».
 *
 * ╪«╪╖┘ê╪د╪ز ╪د┘╪ز╪▒┘â┘è╪ذ:
 * 1. ╪ث┘╪┤╪خ ╪ش╪»┘ê┘ Google ╪ش╪»┘è╪»╪د┘ï.
 * 2. Extensions ظ Apps Script ظ ╪د┘╪╡┘é ┘ç╪░╪د ╪د┘┘à┘┘ ┘â╪د┘à┘╪د┘ï.
 * 3. ╪┤╪║┘ّ┘ ╪د┘╪»╪د┘╪ر setupSheets ┘à╪▒╪ر ┘ê╪د╪ص╪»╪ر ┘╪ز╪ش┘ç┘è╪▓ ╪د┘╪ث┘ê╪▒╪د┘é.
 * 4. Project Settings ظ Script Properties:
 *      SHEET_TOKEN = MG7X9q2L8pV4        (┘┘╪│ SHEET_TOKEN ┘┘è index.html)
 *      SS_API_KEY  = ┘à┘╪ز╪د╪ص SpecsSeller   (╪د╪«╪ز┘è╪د╪▒┘è)
 *      SS_API_URL  = ╪▒╪د╪ذ╪╖ API ╪د┘╪▒╪│┘à┘è     (╪د╪«╪ز┘è╪د╪▒┘è)
 * 5. Deploy ظ New deployment ظ Web app
 *      Execute as: Me
 *      Who has access: Anyone
 *    ╪س┘à ╪د┘╪│╪« ╪▒╪د╪ذ╪╖ /exec ┘ê╪╢╪╣┘ç ┘┘è SHEET_URL ╪»╪د╪«┘ index.html.
 *
 * ┘à┘╪د╪ص╪╕╪ر ┘à┘ç┘à╪ر:
 * - ╪د┘┘à┘╪ز╪ش╪د╪ز 18/19/20 (╪د┘╪╣┘┘â╪د╪ز) ┘┘ç╪د SKU ┘à╪ج┘â╪» ┘ê╪ز┘╪▒╪│┘ ╪ح┘┘ë ┘ê╪▒┘é╪ر SPACESELLER.
 * - ╪ذ┘é┘è╪ر ╪د┘┘à┘╪ز╪ش╪د╪ز (1ظô17) ╪ز┘╪│╪ش┘ّ┘ ┘┘è ┘ê╪▒┘é╪ر ORDERS ┘ê╪ز╪ص╪ز╪د╪ش ┘à╪╖╪د╪ذ┘é╪ر SKU ┘è╪»┘ê┘è╪د┘ï
 *   ┘é╪ذ┘ ╪ث┘ ┘è╪│╪ز╪╖┘è╪╣ SpecsSeller ╪ز┘┘┘è╪░┘ç╪د ╪ز┘┘é╪د╪خ┘è╪د┘ï.
 */

var SECRET_TOKEN = 'MG7X9q2L8pV4'; // ┘è┘à┘â┘ ╪ز╪║┘è┘è╪▒┘ç ┘à┘ Script Properties ╪ذ╪د╪│┘à SHEET_TOKEN
var ORDERS_SHEET = 'ORDERS';
var SPACESELLER_SHEET = 'SPACESELLER';
var LOG_SHEET = 'SYNC_LOG';

var FREE_SHIPPING_FROM = 300;
var SHIPPING_FEE = 35;
var PHONE_RE = /^0[5-7][0-9]{8}$/;

/* ╪ث╪│╪╣╪د╪▒ ╪د┘╪ذ┘è╪╣ ╪د┘┘à╪╣╪ز┘à╪»╪ر ┘┘è ╪د┘┘à╪ز╪ش╪▒ (╪»╪▒┘ç┘à) ظ¤ ╪د┘┘à╪╡╪»╪▒ ╪د┘┘ê╪ص┘è╪» ┘┘╪ص╪│╪د╪ذ ╪╣┘┘ë ╪د┘╪«╪د╪»┘à */
var PRODUCT_PRICES = {
  1: 275,
  2: 199,
  3: 275,
  4: 199,
  5: 199,
  6: 199,
  7: 199,
  8: 199,
  9: 199,
  10: 199,
  11: 199,
  12: 199,
  13: 199,
  14: 199,
  15: 199,
  16: 199,
  17: 199,
  18: 199,
  19: 199,
  20: 275,
  21: 199,
  22: 199,
  23: 199,
  24: 275,
  25: 199,
  26: 275,
  27: 199,
  28: 199,
  29: 199,
  30: 275,
  31: 199,
  32: 199,
  33: 199,
  34: 199,
  35: 199,
  36: 275,
  37: 275,
  38: 199,
  39: 199,
  40: 275,
  41: 199,
  42: 199,
  43: 199,
  44: 275,
  45: 199,
  46: 275,
  47: 275,
  48: 199,
  49: 199,
  50: 199,
  51: 199,
  52: 199,
  53: 199,
  54: 275,
  55: 275,
  56: 199,
  57: 199,
  58: 199,
  59: 275,
  60: 275,
  61: 275,
  62: 275,
  63: 275,
  64: 275,
  65: 275
};

/* SKU ╪د┘┘à╪ج┘â╪»╪ر ┘╪»┘ë SpaceSeller / SpecsSeller */
var PRODUCT_SKUS= {
  1: '`shampoing-proteine`',
  2: '`shampoux`',
  3: '`gel-intime`',
  4: '`sham-anti-chute`',
  5: '`poudre-dents`',
  6: '`deodorant`',
  7: '`creme-visage-blanche`',
  8: '`creme-visage`',
  9: '`joint-creme`',
  10: '`creme-retanol`',
  11: '`creme-retanoltube`',
  12: '`vitiligo-noir`',
  13: '`vitiligotube`',
  14: '`vitiligo`',
  15: '`melasma`',
  16: '`creme-hommetube`',
  17: '`creme-homme`',
  18: '`eclat-zone-intime`',
  19: '`creme_hyd`',
  20: '`ecran_solaire`',
  21: '`anti-friction`',
  22: '`filer`',
  23: '`poils`',
  24: '`varices-testicules`',
  25: '`ejacontrol`',
  26: '`niacinamide`',
  27: '`serum-retanoltube`',
  28: '`cerne`',
  29: '`blush`',
  30: '`acne-corps`',
  31: '`anti-vergeture`',
  32: '`anti-douleur`',
  33: '`lightening-intimate`',
  34: '`spray-vagin`',
  35: '`dys-erectile30`',
  36: '`dys-erectile`',
  37: '`womens-protein`',
  38: '`vitamax`',
  39: '`body-whitening30`',
  40: '`collagen-prodre`',
  41: '`biotine`',
  42: '`anti-transpirant`',
  43: '`energiee`',
  44: '`energie`',
  45: '`ginseng30`',
  46: '`pro-musculaire`',
  47: '`maca`',
  48: '`ashwa-zenvy`',
  49: '`caffeine`',
  50: '`force-musculaire30`',
  51: '`perform-control30`',
  52: '`sirop-gastrobalance`',
  53: '`sirop-pertepoids`',
  54: '`sirop-weightgain`',
  55: '`sirop-prostat`',
  56: '`sirop-colon`',
  57: '`sirop-urine`',
  58: '`sirop-smoking`',
  59: '`gumies_magnesieum`',
  60: '`gummies_melato`',
  61: '`gumies-vitamine`',
  62: '`ashwagandha-gummies`',
  63: '`energyfocus-gummies`',
  64: '`gummies_collagen`',
  65: '`gummies_biotine`'
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
  SpreadsheetApp.getUi().alert('╪ز┘à ╪ز╪ش┘ç┘è╪▓ ╪د┘╪ث┘ê╪▒╪د┘é: ORDERS / SPACESELLER / SYNC_LOG');
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

    // ┘à┘╪╣ ╪ز┘â╪▒╪د╪▒ ┘┘╪│ ╪د┘╪╖┘╪ذ
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
    var status = '╪ش╪»┘è╪»';

    var orderRows = lines.map(function (line) {
      return [date, orderId, name, phone, city, address, line.id, line.sku,
        line.name, line.qty, line.unit, line.total, subtotal, shipping, total, status];
    });
    if (orderRows.length) {
      orders.getRange(orders.getLastRow() + 1, 1, orderRows.length, ORDERS_HEADERS.length)
        .setValues(orderRows);
    }

    // ╪ز╪ش┘ç┘è╪▓ ╪╡┘┘ê┘ SpaceSeller ┘┘┘à┘╪ز╪ش╪د╪ز ╪░╪د╪ز SKU ┘à╪ج┘â╪»
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

    // ╪ح╪▒╪│╪د┘ ╪د╪«╪ز┘è╪د╪▒┘è ╪ح┘┘ë SpecsSeller ╪ح╪░╪د ╪ز┘ê┘┘ّ╪▒ ╪د┘╪▒╪د╪ذ╪╖ ┘ê╪د┘┘à┘╪ز╪د╪ص
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
  // ┘╪ص╪╡ ╪╡╪ص╪ر ╪د┘┘╪┤╪▒: ╪د┘╪ز╪ص ╪▒╪د╪ذ╪╖ /exec ┘┘è ╪د┘┘à╪ز╪╡┘╪ص
  if (e && e.parameter && e.parameter.health === '1') {
    return json_({ ok: true, service: 'mofa-glow-orders', time: new Date().toISOString() });
  }
  return json_({ ok: true, message: 'MOFA GLOW orders endpoint. Use POST.' });
}
