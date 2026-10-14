// Sunucuya istek atan küçük yardımcı. Çerez (oturum) otomatik gönderilir.
export async function api(yol, { yontem = 'GET', veri } = {}) {
  const yanit = await fetch(`/api${yol}`, {
    method: yontem,
    credentials: 'same-origin',
    headers: veri ? { 'Content-Type': 'application/json' } : undefined,
    body: veri ? JSON.stringify(veri) : undefined,
  });
  let govde = null;
  try {
    govde = await yanit.json();
  } catch {
    /* boş yanıt */
  }
  if (!yanit.ok) {
    const hata = new Error(govde?.hata || 'Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edin.');
    hata.durum = yanit.status;
    throw hata;
  }
  return govde;
}

export const tl = (n) =>
  new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(Number(n) || 0);
export const sayi = (n) => new Intl.NumberFormat('tr-TR').format(Number(n) || 0);
