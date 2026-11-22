# MOFA GLOW — متجر العناية الفاخرة

متجر عربي (RTL) بصفحة واحدة، بتصميم فاخر (عاجي/زمردي/ذهبي)، يعمل على GitHub Pages.

## الملفات

| الملف | الوظيفة |
|---|---|
| `index.html` | المتجر: 65 منتج SpaceSeller، سلة، طلب، واتساب، Google Sheets |
| `Code.gs` | خادم الطلبات على Google Apps Script (65 منتج، أوراق ORDERS/SPACESELLER/SYNC_LOG) |
| `catalog.json` | كتالوج 65 منتج (JSON) |
| `assets/` | صور المنتجات، شعار، وسائط |
| `README.md` | تعليمات |
| `sitemap.xml` / `robots.txt` | SEO |

## التصميم
- **خطوط**: Amiri (عناوين) + Tajawal (نص) — duas fuentes apenas
- **لوحة**: عاجي #FAF7F2, زمردي #1A3B2B, ذهبي #8F6A2E, blush #F7C8C8, فحمي #2A2622
- **Dark mode**: مدعوم (toggle في الهيدر)
- **Mobile-first**: 360px flawless, no horizontal scroll
- **prefers-reduced-motion**: respected

## المنتجات (65)
- جميعها من كتالوج SpaceSeller (65 منتج)
- SKUs حقيقية (shampoing-proteine, niacinamide, ejacontrol, gummies_melato, ...)
- أسعار: 199 (44) / 275 (21) / 350 (2) درهم
- تسعير: 0-50 DH → 199, 50-100 DH → 275, 100+ DH → 350

## تدفق الطلب
1. المتجر → سلة → تحقق (اسم/هاتف/مدينة/عنوان)
2. Google Sheets → POST (عند ضبط SHEET_URL)
3. WhatsApp → رسالة كاملة (رقم طلب، منتجات، مجموع)
4. حفظ محلي (localStorage)

## الأمان
- لا تكلفة/هامش في الكود العام
- escapeHtml لجميع مدخلات المستخدم
- SHEET_TOKEN في الكود (يمنع spam عادي)
- Moroccan phone regex: ^0[5-7]\d{8}$

## SEO
- title, meta description, canonical, OG image, JSON-LD Product
- sitemap.xml, robots.txt

## النشر
الموقع الحيّ: https://chriimmohamed-sketch.github.io/mofa-glow-store/

## ربط Google Sheets (خطوات لمرة واحدة)
1. أنشئ جدول Google جديداً.
2. Extensions → Apps Script → الصق Code.gs
3. شغّل setupSheets() مرة واحدة
4. Script Properties: SHEET_TOKEN = MG7X9q2L8pV4
5. Deploy → Web app (Execute as Me, Anyone)
6. انسخ رابط /exec → ضعه في SHEET_URL

## UNTESTED
- SpaceSeller-side ingestion (requires SS_API_KEY + SS_API_URL)
- Live Google Sheets write (requires SHEET_URL)
- Lighthouse score (needs browser, mark as UNTESTED)
- Dark mode visual (needs browser verification)
- Mobile 360px layout (needs device testing)

## Rollback
git checkout <previous-commit> -- index.html Code.gs && git push
"