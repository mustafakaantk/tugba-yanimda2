import { PanelCercevesi } from '../bilesenler.jsx';
import { useOturum } from '../oturum.jsx';

// Mağaza müdürü paneli – Faz 1 iskeleti. Raporlar, duyuru ve indirim önerileri Faz 4'te.
export default function MagazaPaneli() {
  const { kullanici } = useOturum();
  return (
    <PanelCercevesi baslik="Mağaza paneli">
      <section className="yer-tutucu">
        <h2>{kullanici.magazaAdi}</h2>
        <p>Bu panel Faz 4’te devreye alınacak. Mağaza müdürü buradan:</p>
        <ul>
          <li>Mağazanın günlük satış ve puan hareketlerini izleyecek, hatalı işlemleri iptal edecek</li>
          <li>Takipçilerine duyuru (ikram, tadım günü) ve ürün indirimi önerecek; öneriler Genel Merkez onayından sonra yayınlanacak</li>
          <li>Kasiyer hesaplarını yönetecek</li>
        </ul>
      </section>
    </PanelCercevesi>
  );
}
