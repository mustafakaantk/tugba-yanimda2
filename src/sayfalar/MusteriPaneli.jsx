import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api, sayi } from '../api.js';
import { DesenKare, PanelCercevesi, PuanHalkasi } from '../bilesenler.jsx';
import { useOturum } from '../oturum.jsx';

// Faz 1 iskeleti. Faz 2'de: gerçek QR, puan geçmişi, favori mağaza ve ürünler, ürün kataloğu.
export default function MusteriPaneli() {
  const { kullanici } = useOturum();
  const konum = useLocation();
  const [kurallar, setKurallar] = useState({ kupon_puan_bedeli: 200, kupon_indirim_orani: 5, kupon_gunluk_limit: 1 });
  useEffect(() => {
    api('/program').then((p) => setKurallar(p.kurallar)).catch(() => {});
  }, []);

  const hedef = kurallar.kupon_puan_bedeli;
  const kalan = Math.max(0, hedef - kullanici.puan);
  const hosgeldin = konum.state?.hosgeldin;

  return (
    <PanelCercevesi baslik={`Merhaba ${kullanici.ad}`}>
      {hosgeldin > 0 && (
        <p className="bilgi" role="status">Üyeliğin hazır. Hesabına {hosgeldin} hoş geldin puanı yüklendi.</p>
      )}
      <div className="musteri-izgara">
        <section className="uye-kart uye-kart--panel" aria-label="Üye kartın">
          <div className="uye-kart__ust">
            <span className="uye-kart__marka">Tuğba Yanımda</span>
            <span className="uye-kart__isim">{kullanici.ad} {kullanici.soyad?.[0]}.</span>
          </div>
          <div className="uye-kart__qr uye-kart__qr--bekliyor">
            <DesenKare tohum={kullanici.id} />
            <span className="uye-kart__qr-not">Okutulabilir QR kodun bir sonraki sürümde burada olacak</span>
          </div>
          <p className="uye-kart__kod">Üye kodu: {kullanici.qrKodu}</p>
        </section>

        <section className="puan-kutu" aria-label="Puan durumun">
          <div className="puan-kutu__halka">
            <PuanHalkasi puan={kullanici.puan} hedef={hedef} />
            <div className="puan-kutu__sayi">
              <strong>{sayi(kullanici.puan)}</strong>
              <span>puan</span>
            </div>
          </div>
          <p>
            {kalan === 0
              ? `%${kurallar.kupon_indirim_orani} indirim hakkın hazır.`
              : `%${kurallar.kupon_indirim_orani} indirime ${sayi(kalan)} puan kaldı.`}
          </p>
          <div className="puan-kutu__nasil">
            <strong>Puanını nasıl kullanırsın?</strong>
            <p>
              Kasada “puanımı kullanmak istiyorum” de. Telefonuna gelen kodu kasiyere söyle; {sayi(hedef)} puan
              düşülür, alışverişine %{kurallar.kupon_indirim_orani} indirim uygulanır. Günde {kurallar.kupon_gunluk_limit} kez.
            </p>
          </div>
          <p className="puan-kutu__dip">{sayi(kullanici.alisverisSayisi)} alışveriş yaptın.</p>
        </section>
      </div>
      <HesapSil puan={kullanici.puan} />
    </PanelCercevesi>
  );
}

// KVKK: müşteri hesabını şifresiyle onaylayarak kalıcı olarak siler.
function HesapSil({ puan }) {
  const { yenile } = useOturum();
  const git = useNavigate();
  const [acik, setAcik] = useState(false);
  const [sifre, setSifre] = useState('');
  const [hata, setHata] = useState('');
  const [siliniyor, setSiliniyor] = useState(false);

  const sil = async (e) => {
    e.preventDefault();
    setHata('');
    setSiliniyor(true);
    try {
      await api('/hesap/sil', { yontem: 'POST', veri: { sifre } });
      // Önce ana sayfaya geç, sonra oturumu tazele; aksi halde korumalı sayfa giriş ekranına yönlendirir
      git('/', { replace: true, state: { hesapSilindi: true } });
      yenile();
    } catch (h) {
      setHata(h.message);
      setSiliniyor(false);
    }
  };

  return (
    <section className="hesap-sil" aria-labelledby="hesap-sil-baslik">
      <h2 id="hesap-sil-baslik">Hesabımı sil</h2>
      {!acik ? (
        <>
          <p>Hesabını sildiğinde kişisel bilgilerin kalıcı olarak silinir ve bu işlem geri alınamaz.</p>
          <button type="button" className="dugme dugme--tehlike" onClick={() => setAcik(true)}>Hesabımı sil</button>
        </>
      ) : (
        <form onSubmit={sil} noValidate>
          <p className="uyari">
            {puan > 0 ? `${sayi(puan)} puanın da silinecek. ` : ''}Adın, telefon numaran ve alışveriş geçmişinle
            bağlantın kaldırılır. Bu işlem geri alınamaz.
          </p>
          <label className="alan">
            <span>Onaylamak için şifreni gir</span>
            <input type="password" value={sifre} onChange={(e) => setSifre(e.target.value)} autoComplete="current-password" required />
          </label>
          {hata && <p className="uyari" role="alert">{hata}</p>}
          <div className="hesap-sil__eylem">
            <button className="dugme dugme--tehlike" disabled={siliniyor || !sifre}>
              {siliniyor ? 'Hesabın siliniyor…' : 'Hesabımı kalıcı olarak sil'}
            </button>
            <button type="button" className="dugme dugme--cizgi" onClick={() => { setAcik(false); setSifre(''); setHata(''); }}>
              Vazgeç
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
