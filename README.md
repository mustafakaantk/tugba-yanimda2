# Tuğba Yanımda – Sadakat Programı (Demo)

Tuğba Kuruyemiş sadakat programının tanıtım sitesi ve dört paneli: **Müşteri**, **Kasa** (kasiyer),
**Mağaza** (mağaza müdürü) ve **Genel Merkez**. Tek giriş ekranı vardır; sistem kullanıcının rolünü
veritabanından okuyup ilgili paneli açar.

Önceki "Tuğba Yanımda" prototipinden (claude.ai'deki tek sayfalık uygulama) şunlar taşındı:
132 gerçek mağaza, 385 ürünlük fotoğraflı katalog, Tuğba marka renkleri ve logo, kasiyer/müdür
rol ayrımı, program kuralları (1 TL = 1 puan, 200 puan = %5, günde 1 kez, SMS koduyla kullanım).

## Durum

| Faz | İçerik | Durum |
|---|---|---|
| 0 | Veritabanı şeması, demo verisi | ✅ |
| 1 | Tanıtım sitesi, kayıt, giriş, rol yönlendirmesi | ✅ |
| 1.5 | Eski prototipten veri, marka ve rol aktarımı | ✅ |
| 1.6 | 5 mağazalık pilot (program yalnızca pilot mağazalarda), KVKK hesap silme | ✅ |
| 2 | Müşteri paneli: gerçek QR, puan geçmişi, favori mağaza (il kartları, arama, yakınımda), ürün kataloğu ve favoriler, hesap ve iletişim izni | ✅ |
| 3 | Kasa ekranı: QR/numara ile puan kazandırma, SMS koduyla puan kullandırma | ⏳ |
| 4 | Müdür ve Genel Merkez: raporlar, duyuru/indirim onay akışı, bildirimler, ayarlar | ⏳ |
| 5 | Canlıya hazırlık: gerçek SMS firması, dinamik QR, KVKK metinleri | ⏳ |

## Demo hesaplar (şifre: `Demo1234`)

| Rol | Giriş bilgisi |
|---|---|
| Üye | `0532 000 00 01` (Ayşe Yılmaz) |
| Kasiyer | `alsancak02`, `kadikoy02`, `bakirkoy02`, `kizilay02`, `nilufer02` |
| Mağaza müdürü | `alsancak01`, `kadikoy01`, `bakirkoy01`, `kizilay01`, `nilufer01` |
| Genel Merkez | `yonetim` |

## Pilot

Program şu an yalnızca `magazalar.program_aktif = TRUE` olan 5 mağazada çalışır:
Kadıköy, Bakırköy Çarşı (İstanbul), Kızılay 1 (Ankara), Alsancak (İzmir), Nilüfer Özlüce (Bursa).
Kayıtta yalnızca bu mağazalar seçilebilir; pilot dışı mağaza personeli giriş yapamaz.
Faz 4'te Genel Merkez bu listeyi panelden değiştirebilecek.

## Hesap silme (KVKK)

Müşteri panelinin altındaki "Hesabımı sil" bölümünden, şifreyle onaylanarak yapılır. Kişisel veriler
anonimleştirilir, kalan puan sıfırlanır; satış kayıtları kimliksiz olarak muhasebe için kalır.
Aynı numara yeniden üye olabilir ama hoş geldin puanı ikinci kez verilmez (numaranın yalnızca
geri çevrilemeyen özeti saklanır).

## Klasör yapısı

```
netlify/
  database/migrations/   Veritabanı tabloları ve demo verisi (Netlify her yayında otomatik uygular)
  functions/             Sunucu tarafı (API): giris, kayit, ben, cikis, program, yonetim-ozet
  lib/                   Ortak kod: veritabanı bağlantısı, oturum/rol kontrolü, yardımcılar
src/
  sayfalar/              AnaSayfa, Giris, Kayit, Kvkk, MusteriPaneli, MagazaPaneli, YonetimPaneli
  stil.css               Renkler ve tasarım (marka renkleri en üstteki değişkenlerden değişir)
public/urun/             385 ürün görseli (WebP), public/tugba-logo.webp
veri/                    magazalar.json (132 mağaza), urunler.json (385 ürün, 11 kategori)
scripts/
  demo-verisi-uret.mjs            Migration 2'yi (demo verisi) üretir
  magaza-urun-migration-uret.mjs  Migration 3'ü (mağaza, ürün, roller) veri/ klasöründen üretir
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
