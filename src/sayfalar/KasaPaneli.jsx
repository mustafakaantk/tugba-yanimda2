import { PanelCercevesi } from '../bilesenler.jsx';
import { useOturum } from '../oturum.jsx';

// Faz 1 iskeleti. Kasa ekranı (QR/numara ile puan, SMS koduyla puan kullanımı) Faz 3'te.
export default function KasaPaneli() {
  const { kullanici } = useOturum();
  return (
    <PanelCercevesi baslik="Kasa">
      <section className="yer-tutucu">
        <h2>{kullanici.magazaAdi} kasası</h2>
        <p>Bu ekran Faz 3’te devreye alınacak. Kasiyer iki işi buradan yapacak:</p>
        <ol>
          <li>
            <strong>Puan kazandırma:</strong> Müşterinin QR kodunu okut ya da telefon numarasını yaz, fiş tutarını gir,
            puan anında hesaba geçsin.
          </li>
          <li>
            <strong>Puan kullandırma:</strong> Müşteri “puanımı kullanmak istiyorum” dediğinde numarasını gir; telefonuna giden
            kodu müşteriden al, onaylayınca kasada “Tuğba Yanımda %5” indirim kodunu uygula.
          </li>
        </ol>
      </section>
    </PanelCercevesi>
  );
}
