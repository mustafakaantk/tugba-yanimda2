import { PanelCercevesi } from '../bilesenler.jsx';
import { useOturum } from '../oturum.jsx';

// Faz 1: iskelet. QR okutma ve satış ekranı Faz 3'te eklenecek.
export default function MagazaPaneli() {
  const { kullanici } = useOturum();
  return (
    <PanelCercevesi baslik="Satış ekranı">
      <section className="yer-tutucu">
        <h2>{kullanici.magazaAdi}</h2>
        <p>
          Bu ekranda müşterinin QR kodunu kamerayla okutup satış tutarını gireceksin; puan otomatik yüklenecek.
          Satış ekranı Faz 3’te devreye alınacak.
        </p>
        <ol>
          <li>Müşterinin QR kodunu okut ya da telefon numarasını yaz</li>
          <li>Satış tutarını gir, varsa kuponu uygula</li>
          <li>Satışı tamamla; puan anında hesaba geçsin</li>
        </ol>
      </section>
    </PanelCercevesi>
  );
}
