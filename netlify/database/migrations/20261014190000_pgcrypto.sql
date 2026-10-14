-- =====================================================================
-- Tuğba Yanımda – Migration 5: şifre işlemleri veritabanında (pgcrypto)
--
-- Şifreler daha önce de bcrypt ($2a$10$...) ile saklanıyordu; pgcrypto'nun
-- crypt() fonksiyonu aynı biçimi okur, bu yüzden mevcut şifreler aynen geçerli.
-- Neden? Cloudflare'in ücretsiz planında istek başına işlemci süresi çok kısa
-- (~10 ms); bcrypt hesaplamasını veritabanı yaparsa giriş/kayıt bu sınıra takılmaz.
-- =====================================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;
