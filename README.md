# MOFA GLOW — متجر العناية الفاخر

متجر عربي (RTL) بصفحة واحدة، بتصميم فاخر (عاجي/زمردي/ذهبي)، يعمل مباشرة على GitHub Pages.

## الملفات

| الملف | الوظيفة |
|---|---|
| `index.html` | المتجر كاملاً: 20 منتجاً، سلة، طلب، واتساب، وربط Google Sheets |
| `Code.gs` | خادم الطلبات على Google Apps Script (يحفظ الطلبات ويجهّز صفوف SpecsSeller) |
| `assets/products/` | صور المنتجات الحقيقية (العلكات الثلاث + صور أخرى) |

## التشغيل محلياً

```bash
python -m http.server 8766
# ثم افتح http://localhost:8766
```

## النشر

الموقع الحيّ: https://chrvvim.github.io/mofa-glow-store/

```bash
git add .
git commit -m "MOFA GLOW store: 20 products, real gummies images, order flow"
git push origin main
```

GitHub Pages ينشر من فرع `main` في الجذر تلقائياً.

## ربط Google Sheets (خطوات لمرة واحدة)

1. أنشئ جدول Google جديداً.
2. `Extensions ← Apps Script` والصق محتوى `Code.gs`.
3. شغّل الدالة `setupSheets` مرة واحدة (تجهّز أوراق `ORDERS` و`SPACESELLER` و`SYNC_LOG`).
4. `Project Settings ← Script Properties` وأضف:
   - `SHEET_TOKEN` = `MG7X9q2L8pV4`
   - `SS_API_KEY` = مفتاح SpecsSeller (اختياري)
   - `SS_API_URL` = رابط API الرسمي (اختياري)
5. `Deploy ← New deployment ← Web app`
   - Execute as: **Me**
   - Who has access: **Anyone**
6. انسخ رابط `/exec` وضعه في `SHEET_URL` داخل `index.html`:

```js
const SHEET_URL = "https://script.google.com/macros/s/XXXX/exec";
const SHEET_TOKEN = "MG7X9q2L8pV4";
```

بعد ذلك كل طلب يُسجَّل في الشيت أولاً ثم يُفتح واتساب للتأكيد. إذا بقي `SHEET_URL` فارغاً يعمل الطلب عبر واتساب ويُحفظ نسخة محلية في المتصفح.

## المنتجات والأسعار

| المجموعة | السعر |
|---|---|
| علكات الفيتامينات / الميلاتونين / الأشواغاندا (25 علكة) | 275 درهم |
| غسول الوجه، شامبو ضد التساقط | 275 درهم |
| معظم منتجات البشرة والشعر | 350 درهم |
| طقس الجمال الكامل | 389 درهم |
| باقة العناية الشاملة | 499 درهم |

الشحن: 35 درهماً، ومجاني فوق 300 درهم. الدفع عند الاستلام.

## SKU الجاهزة لدى SpaceSeller

| المنتج | SKU |
|---|---|
| علكات الفيتامينات الشاملة | `gumies-vitamine` |
| علكات الميلاتونين للنوم | `gummies_melato` |
| علكات الأشواغاندا | `ashwagandha-gummies` |

المنتجات الثلاثة تُكتب تلقائياً في ورقة `SPACESELLER` بالصيغة المطلوبة. بقية المنتجات (1–17) تُسجَّل في ورقة `ORDERS` وتحتاج مطابقة SKU مع كتالوج المورّد قبل تفعيل التنفيذ التلقائي عبر SpecsSeller.

## ملاحظات

- لا يوجد نظام حسابات عملاء؛ الطلب يتم بالاسم والهاتف والعنوان (الدفع عند الاستلام).
- صور المنتجات الثلاث مستخدمة كما وصلت من المالك، دون توليد أو تعديل.
- إذا تغيّرت الأسعار، حدّثها في مكانين: `PRODUCTS` داخل `index.html` و`PRODUCT_PRICES` داخل `Code.gs`.
