# Tuğba Yanımda – Sadakat Programı (Demo)

Tuğba Kuruyemiş sadakat programının tanıtım sitesi ve üç paneli: **Müşteri**, **Mağaza**, **Genel Merkez**.
Tek giriş ekranı vardır; sistem kullanıcının rolünü veritabanından okuyup ilgili paneli açar.

## Durum

| Faz | İçerik | Durum |
|---|---|---|
| 0 | Veritabanı şeması, demo verisi | ✅ |
| 1 | Tanıtım sitesi, kayıt, giriş, rol yönlendirmesi | ✅ |
| 2 | Müşteri paneli: gerçek QR, puan geçmişi, kupon alma | ⏳ |
| 3 | Mağaza satış ekranı: QR okutma, puan kazandırma/harcatma | ⏳ |
| 4 | Yönetici paneli: müşteri listesi, raporlar, ayarlar | ⏳ |
| 5 | Canlıya hazırlık: SMS doğrulama, dinamik QR, KVKK | ⏳ |

## Demo hesaplar (şifre: `Demo1234`)

| Rol | Giriş bilgisi |
|---|---|
| Üye | `0532 000 00 01` (Ayşe Yılmaz) |
| Mağaza | `alsancak01`, `kadikoy01`, `bakirkoy01`, `kizilay01`, `nilufer01` (her mağazada `…02` de var) |
| Genel Merkez | `yonetim` |

## Klasör yapısı

```
netlify/
  database/migrations/   Veritabanı tabloları ve demo verisi (Netlify her yayında otomatik uygular)
  functions/             Sunucu tarafı (API): giris, kayit, ben, cikis, program, yonetim-ozet
  lib/                   Ortak kod: veritabanı bağlantısı, oturum/rol kontrolü, yardımcılar
src/
  sayfalar/              AnaSayfa, Giris, Kayit, Kvkk, MusteriPaneli, MagazaPaneli, YonetimPaneli
  stil.css               Renkler ve tasarım (marka renkleri en üstteki değişkenlerden değişir)
scripts/
  demo-verisi-uret.mjs   Demo verisini yeniden üretir
```

## Kurallar

- Uygulanmış bir migration dosyası **değiştirilmez**. Her değişiklik yeni bir dosyayla yapılır
  (ör. `20261020120000_yeni_alan.sql`). Dosyalar ad sırasına göre uygulanır.
- Puan bakiyesi ayrı bir sayı olarak tutulmaz; `puan_hareketleri` tablosundaki satırların toplamıdır.
- Rol kontrolü her API isteğinde sunucuda yapılır (`yetkiIste(req, 'yonetici')`).
- Program kuralları (`ayarlar` tablosu) koda gömülü değildir; tanıtım sitesi kuralları API'den okur.

## Yerelde çalıştırma (isteğe bağlı)

```bash
npm install
npx netlify login
npx netlify link        # Netlify'daki siteyle bağla
npm run dev             # netlify dev: yerel Postgres + fonksiyonlar + site
```
