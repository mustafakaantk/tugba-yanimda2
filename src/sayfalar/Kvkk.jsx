import { Alt, UstMenu } from '../bilesenler.jsx';

// TASLAK METİN – yayına almadan önce Tuğba Kuruyemiş hukuk birimince onaylanmalıdır.
export default function Kvkk() {
  return (
    <>
      <UstMenu />
      <main className="kap kap--dar metin-sayfa">
        <p className="taslak-notu">Taslak metin: yayın öncesinde hukuk biriminin onayına sunulacaktır.</p>
        <h1>Tuğba Yanımda Sadakat Programı KVKK Aydınlatma Metni</h1>

        <h2>Veri sorumlusu</h2>
        <p>
          6698 sayılı Kişisel Verilerin Korunması Kanunu (“KVKK”) uyarınca kişisel verileriniz, veri sorumlusu sıfatıyla
          Tuğba Kuruyemiş tarafından aşağıda açıklanan kapsamda işlenmektedir.
        </p>

        <h2>İşlenen kişisel veriler</h2>
        <ul>
          <li>Kimlik: ad, soyad, doğum tarihi (isteğe bağlı)</li>
          <li>İletişim: cep telefonu numarası, e-posta adresi (isteğe bağlı)</li>
          <li>Müşteri işlem: alışveriş tarihi, mağazası, tutarı, kazanılan ve harcanan puanlar, kupon kullanımları</li>
          <li>İşlem güvenliği: giriş kayıtları, IP adresi</li>
        </ul>

        <h2>İşleme amaçları</h2>
        <ul>
          <li>Sadakat programı üyeliğinin oluşturulması ve yönetilmesi</li>
          <li>Puan ve indirim kuponlarının tanımlanması, kullanımı ve iade süreçleri</li>
          <li>Program kurallarının uygulanması ve kötüye kullanımın önlenmesi</li>
          <li>Açık rızanız olması halinde kampanya ve fırsat bildirimleri gönderilmesi</li>
        </ul>

        <h2>Hukuki sebepler</h2>
        <p>
          Verileriniz KVKK m.5/2-c (sözleşmenin kurulması ve ifası), m.5/2-ç (hukuki yükümlülük) ve m.5/2-f (meşru menfaat)
          kapsamında; ticari elektronik ileti gönderimi ise 6563 sayılı Kanun ve ilgili yönetmelik uyarınca açık onayınıza
          dayanılarak işlenir.
        </p>

        <h2>Aktarım</h2>
        <p>
          Verileriniz; barındırma ve SMS hizmeti aldığımız tedarikçilerle, yalnızca hizmetin gerektirdiği ölçüde ve
          gerekli güvenlik önlemleri alınarak paylaşılabilir; yetkili kamu kurumlarına mevzuatın gerektirdiği hallerde
          aktarılabilir. Verileriniz üçüncü kişilere satılmaz.
        </p>

        <h2>Haklarınız</h2>
        <p>
          KVKK m.11 kapsamında verilerinizin işlenip işlenmediğini öğrenme, düzeltilmesini veya silinmesini isteme ve
          işlemeye itiraz etme haklarına sahipsiniz. Başvurularınızı [başvuru adresi / e-posta] üzerinden iletebilirsiniz.
          Kampanya iletilerini dilediğiniz an panelinizden veya iletideki ret bağlantısından durdurabilirsiniz.
        </p>
      </main>
      <Alt />
    </>
  );
}
