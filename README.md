# MOFA GLOW

متجر إلكتروني بصفحة واحدة لمنتجات العناية بالبشرة، موجّه للسوق المغربي. عربي RTL، الأسعار بالدرهم، الدفع عند الاستلام.

## الملفات
- `index.html`: المتجر كاملاً (HTML + CSS + JavaScript، والصور مدمجة داخله).
- `README.md`: هذا الملف.

## الميزات
- كتالوج بـ 8 منتجات وصورها الحقيقية مدمجة (base64) مع بحث وتصنيفات وعرض سريع.
- مفضلة وسلة تُحفظان في متصفح الزائرة.
- كود خصم `GLOW2026` (15%)، توصيل مجاني فوق 400 درهم وإلا 35 درهماً.
- نموذج طلب بتحقق من رقم الهاتف المغربي، وملخص طلب جاهز للإرسال.
- قسم "طقوس العناية" وأسئلة شائعة.
- طبقة حركة مستوحاة من تصاميم SAKURA (بدون مكتبات خارجية):
  - صورة المنتج تطير إلى أيقونة السلة عند الإضافة (Fly-to-Cart).
  - نبضة على عداد السلة + وميض ذهبي على زر السلة.
  - توهج ذهبي متحرك في الواجهة الرئيسية.
  - دخول متدرّج للبطاقات عند تغيير التصنيف/البحث.
  - لمعة ضوئية على الأزرار وحركات ظهور ناعمة للأقسام.
- زر تبديل الوضع الفاتح/الداكن + زر "إتمام الطلب" العائم على الجوال.
- وسوم SEO (description، Open Graph، JSON-LD للمنتجات بالدرهم).
- حماية من XSS في كل ما يُعرض من بيانات المستخدم.
- تسجيل الطلبات مباشرة في Google Sheets (Apps Script Web App) — راجع قسم «ربط Google Sheets».

## ربط Google Sheets (استقبال الطلبات في جدول)

المتجر يرسل كل طلب مؤكد إلى جدول Google Sheets عبر Google Apps Script — بدون سيرفر وبدون تكلفة.

### الخطوة 1: أنشئ الجدول
1. افتح [https://sheets.new](https://sheets.new)
2. غيّر اسم الجدول إلى `MOFA GLOW — الطلبات`
3. ضع في الصف الأول هذه العناوين:

| A | B | C | D | E | F | G | H | I | J | K |
|---|---|---|---|---|---|---|---|---|---|---|
| تاريخ ووقت | رقم الطلب | الاسم | الهاتف | المدينة | العنوان | المنتجات | المجموع | الخصم | التوصيل | المبلغ النهائي |
| 2026-11-17 21:41 | MG-744758 | سارة | 0612345678 | أكادير | حي السلام، عمارة 3 | [{id:retinol-100, qty:2,...}] | 398 | 0 | 0 | 398 |

### الخطوة 2: أضف Apps Script
1. في الجدول: **Extensions ← Apps Script**
2. امسح أي كود موجود والصق هذا بالضبط:

```javascript
function doPost(e) {
  var data = JSON.parse(e.postData.contents);
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Sheet1');
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['تاريخ ووقت','رقم الطلب','الاسم','الهاتف','المدينة','العنوان','المنتجات','المجموع','الخصم','التوصيل','المبلغ النهائي']);
  }
  sheet.appendRow([
    new Date(),
    data.id || '',
    data.name || '',
    data.phone || '',
    data.city || '',
    data.address || '',
    JSON.stringify(data.items || []),
    data.subtotal || 0,
    data.discount || 0,
    data.shipping || 0,
    data.total || 0
  ]);
  return ContentService.createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
```
3. احفظ (Ctrl+S)

### الخطوة 3: انشر كـ Web App
1. اضغط **Deploy ← New deployment**
2. اختر النوع **Web app**
3. في الحقول:
   - **Description**: MOFA GLOW Orders
   - **Execute as**: Me
   - **Who has access**: Anyone
4. اضغط **Deploy** ثم **Authorize access** وأكمل الصلاحيات (حسابك الشخصي)
5. انسخ **Web app URL** (يبدأ بـ `https://script.google.com/macros/s/...`)

### الخطوة 4: ضع الرابط في المتجر
1. افتح `index.html` في المستودع ← أيقونة القلم للتحرير
2. عدّل السطر:
```js
const CONFIG={whatsapp:"2126XXXXXXXX",sheetUrl:"https://script.google.com/macros/s/XXXXXXX/exec",freeShipAt:400,shipFee:35,promoCode:"GLOW2026",promoPct:15};
```
3. Commit changes — تُعاد Pages تلقائياً خلال دقيقة

### كيف يعمل
عند إتمام الزبونة لطلبها، يُرسَل الطلب بصمت (no-cors) إلى Apps Script الذي يضيف صفاً في الجدول فوراً، مع رقم الطلب MG-XXXXXX. إن فشل الإرسال لا يتأثر إتمام الطلب لدى الزبونة — تبقى شاشة التأكيد تُعرض وكذلك خيار النسخ/واتساب.

## النشر المجاني (GitHub Pages)
1. من المستودع: **Settings ← Pages**.
2. اختر الفرع `main` والمجلد `/ (root)` ثم **Save**.
3. على الخطة المجانية يجب أن يكون المستودع **Public**.

## ملاحظات
- المنتجات مستحضرات للعناية والتجميل وليست أدوية، ولا تُعالج أي حالة مرضية.
- لا تُنشر في المستودع أي مفاتيح سرية أو أسعار تكلفة.
- جميع الحركات تحترم `prefers-reduced-motion`.
