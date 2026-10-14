// Ortak görsel parçalar
import { Link, useNavigate } from 'react-router-dom';
import { useOturum, PANEL } from './oturum.jsx';

export function Logo({ acik = false }) {
  return (
    <Link to="/" className={`logo ${acik ? 'logo--acik' : ''}`} aria-label="Tuğba Yanımda ana sayfa">
      <img src="/tugba-logo.webp" alt="Tuğba" width="78" height="40" />
      <span>Yanımda</span>
    </Link>
  );
}

export function UstMenu() {
  const { kullanici } = useOturum();
  return (
    <header className="ust">
      <div className="kap ust__ic">
        <Logo />
        <nav className="ust__nav" aria-label="Ana menü">
          <a href="/#nasil">Nasıl çalışır</a>
          <a href="/#sss">Sorular</a>
          {kullanici ? (
            <Link className="dugme dugme--kucuk" to={PANEL[kullanici.rol]}>Panelime git</Link>
          ) : (
            <>
              <Link to="/giris" className="ust__giris">Giriş yap</Link>
              <Link className="dugme dugme--kucuk" to="/kayit">Üye ol</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

export function Alt() {
  return (
    <footer className="alt">
      <div className="kap alt__ic">
        <div>
          <Logo acik />
          <p className="alt__motto">Burada Gülümseme Hizmet Eder</p>
        </div>
        <nav aria-label="Alt menü">
          <Link to="/kvkk">KVKK Aydınlatma Metni</Link>
          <Link to="/giris">Personel girişi</Link>
        </nav>
        <p className="alt__not">Bu site demo sürümüdür; gösterilen müşteri ve satış verileri örnektir.</p>
      </div>
    </footer>
  );
}

const ROL_ADI = { musteri: 'Üye', kasiyer: 'Kasiyer', mudur: 'Mağaza müdürü', yonetici: 'Genel Merkez' };

export function PanelCercevesi({ baslik, ust, children }) {
  const { kullanici, cikis } = useOturum();
  const git = useNavigate();
  return (
    <div className={`panel panel--${kullanici.rol}`}>
      <header className="panel__ust">
        <div className="kap panel__ust-ic">
          <Logo acik />
          <div className="panel__kim">
            <span className="panel__rol">{ROL_ADI[kullanici.rol]}{kullanici.magazaAdi ? `, ${kullanici.magazaAdi}` : ''}</span>
            <span className="panel__ad">{kullanici.ad} {kullanici.soyad}</span>
          </div>
          <button
            className="dugme dugme--hayalet"
            onClick={async () => {
              await cikis();
              git('/giris');
            }}
          >
            Çıkış yap
          </button>
        </div>
      </header>
      {ust}
      <main className="kap panel__govde">
        {baslik && <h1 className="panel__baslik">{baslik}</h1>}
        {children}
      </main>
    </div>
  );
}

/** Demo amaçlı sahte QR deseni (gerçek QR Faz 2'de üretilecek). Tohuma göre hep aynı deseni çizer. */
export function DesenKare({ tohum = 7, boyut = 21 }) {
  let s = tohum;
  const r = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  const kareler = [];
  const goz = (x, y) => (x < 7 && y < 7) || (x >= boyut - 7 && y < 7) || (x < 7 && y >= boyut - 7);
  for (let y = 0; y < boyut; y++)
    for (let x = 0; x < boyut; x++) if (!goz(x, y) && r() > 0.52) kareler.push(<rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" />);
  const Goz = ({ x, y }) => (
    <g transform={`translate(${x} ${y})`}>
      <rect width="7" height="7" />
      <rect x="1" y="1" width="5" height="5" fill="#fff" />
      <rect x="2" y="2" width="3" height="3" />
    </g>
  );
  return (
    <svg viewBox={`-1 -1 ${boyut + 2} ${boyut + 2}`} className="desen" aria-hidden="true" shapeRendering="crispEdges">
      <rect x="-1" y="-1" width={boyut + 2} height={boyut + 2} fill="#fff" />
      <g fill="#2B1A12">
        {kareler}
        <Goz x={0} y={0} />
        <Goz x={boyut - 7} y={0} />
        <Goz x={0} y={boyut - 7} />
      </g>
    </svg>
  );
}

/** Kupona kalan puanı halka olarak gösterir */
export function PuanHalkasi({ puan, hedef }) {
  const oran = Math.min(1, puan / hedef);
  const R = 42;
  const C = 2 * Math.PI * R;
  return (
    <svg viewBox="0 0 100 100" className="halka" role="img" aria-label={`${puan} puan, indirime ${Math.max(0, hedef - puan)} puan kaldı`}>
      <circle cx="50" cy="50" r={R} className="halka__iz" />
      <circle cx="50" cy="50" r={R} className="halka__dolu" strokeDasharray={`${C * oran} ${C}`} transform="rotate(-90 50 50)" />
    </svg>
  );
}
