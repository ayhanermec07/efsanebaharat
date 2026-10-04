type Section = { heading: string; paragraphs: string[] }
export type LegalDocument = {
  path: string; title: string; audience: 'b2c' | 'all'; missing: string[]; sections: Section[];
  sources?: { title: string; url: string }[]
}
const consumerSource = { title: 'Ticaret Bakanlığı — Mesafeli sözleşmeler', url: 'https://tuketici.ticaret.gov.tr/yayinlar/tuketici-bilgi-rehberi/mesafeli-sozlesmeler-hakkinda-bilgilendirme' }
const privacySource = { title: 'KVKK — Aydınlatma yükümlülüğü', url: 'https://www.kvkk.gov.tr/Icerik/2033/Aydinlatma-Yukumlulugu-' }
const paymentSection: Section = { heading: 'Bedel ve ödeme', paragraphs: [
  'Ürün fiyatları KDV dahildir. Sipariş tutarı, ürün miktarı ve uygulanabilir indirimler sunucuda doğrulanır. Siparişe özgü ürün, teslimat, fatura ve nihai bedel bilgileri tamamlanmış ön bilgilendirmede yer almalıdır.',
  'Havale / EFT kullanılmaktadır. Siparişin oluşturulması tahsilat yapıldığı anlamına gelmez; banka transferi yönetici tarafından doğrulanana kadar ödeme bekler. Hesap bilgileri ve transfer açıklaması sipariş ekranında gösterilir.',
  'PayTR kart ödeme entegrasyonu hazırlanmaktadır; sağlayıcı kabulü tamamlanınca ayrıca açılacaktır. Kapıda ödeme sunulmaz.',
] }
export const legalDocuments: LegalDocument[] = [
  { path: '/on-bilgilendirme', title: 'Ön Bilgilendirme Formu', audience: 'b2c', missing: ['customerEmail', 'returnEmail', 'shippingCompany', 'dispatchTime', 'shippingFee', 'returnCarrier', 'foodReturnExceptions'], sources: [consumerSource], sections: [
    { heading: 'Kapsam ve sipariş bilgileri', paragraphs: ['Bu çalışma metni, ticari veya mesleki amaç taşımayan perakende tüketici alışverişine yöneliktir. Bayi / B2B ve XML müşteri işlemlerine otomatik uygulanmaz.', 'Ürün adı, temel nitelikleri, satış birimi, miktarı ve bedeli siparişe özgü gösterilmelidir. Bu genel sayfa, siparişe özgü ön bilgilendirme ve teyit kaydının yerine geçmez.'] },
    paymentSection,
    { heading: 'Teslimat ve cayma', paragraphs: ['Kargo ücreti, taşıyıcı, teslim süresi, başvuru kanalı ve varsa ürüne özgü cayma istisnası sipariş öncesinde açıklanmalıdır. Bu koşullar için eksik bilgiler aşağıda belirtilmiştir.'] },
  ] },
  { path: '/mesafeli-satis-sozlesmesi', title: 'Mesafeli Satış Sözleşmesi', audience: 'b2c', missing: ['customerEmail', 'returnEmail', 'shippingCompany', 'dispatchTime', 'shippingFee', 'returnCarrier', 'foodReturnExceptions'], sources: [consumerSource], sections: [
    { heading: 'Taraflar ve konu', paragraphs: ['Satıcı Efsane Baharat — Ayhan Ermeç’tir. Alıcı, ticari veya mesleki olmayan amaçlarla alışveriş yapan tüketicidir. Konu, siparişe özgü ürünlerin doğrulanmış bedel ve teslim koşullarıyla satışıdır.', 'Alıcının kimliği, teslimat / fatura bilgileri ve ürün listesi her sipariş için ayrıca tamamlanmalıdır. Bu sayfa imzalanmış veya kabul edilmiş bir sipariş sözleşmesi değildir.'] },
    paymentSection,
    { heading: 'Bilgilendirme ve kayıt', paragraphs: ['Tamamlanmış ön bilgilendirme, sözleşme sürümü, sipariş bedeli ve kabul kaydı birbiriyle uyumlu tutulmalı; siparişe özgü kopya alıcıya kalıcı veri saklayıcısıyla iletilmelidir. Bu teslim mekanizması henüz tamamlanmamıştır.'] },
    { heading: 'Başvuru ve uyuşmazlık', paragraphs: ['Tüketicinin kanuni başvuru hakları saklıdır. Başvuru şartları için Ticaret Bakanlığının güncel bilgilendirmesi esas alınır; yıllara göre değişen parasal sınırlar bu taslakta sabitlenmemiştir.'] },
  ] },
  { path: '/teslimat-kargo', title: 'Teslimat ve Kargo Politikası', audience: 'b2c', missing: ['shippingCompany', 'dispatchTime', 'shippingFee'], sources: [consumerSource], sections: [
    { heading: 'Teslimat adresi ve takip', paragraphs: ['Sipariş için güncel teslimat adresi ve telefon gerekir. Onaylanan ödeme sonrasında sipariş hazırlanır; kargo firması ve takip numarası kaydedildiğinde sipariş durumu hesabınızdan izlenebilir.'] },
    { heading: 'Ücret ve süre', paragraphs: ['Anlaşmalı taşıyıcı, normal kargoya verme süresi, teslim süresi ve ücret koşulları henüz bildirilmedi. Ücretsiz kargo veya belirli bir teslim süresi taahhüt edilmemektedir.', 'Mevcut sepet toplamında ayrı kargo bedeli hesaplanmıyor. Bu durum ücretsiz kargo politikası olarak yorumlanmamalıdır; ücret koşulları satış açılışından önce kesinleştirilmelidir.'] },
    { heading: 'Teslimat sorunu', paragraphs: ['Yanlış, eksik veya hasarlı teslimatta sipariş numaranızla satıcıya başvurabilirsiniz. Başvuru, iade ve taşıyıcı süreçleri tüketicinin kanuni haklarını sınırlayacak genel ret koşullarıyla uygulanmaz.'] },
  ] },
  { path: '/iade-iptal-cayma', title: 'İade / İptal / Cayma Hakkı Politikası', audience: 'b2c', missing: ['returnEmail', 'returnCarrier', 'foodReturnExceptions'], sources: [consumerSource], sections: [
    { heading: 'İptal talebi', paragraphs: ['Sipariş numaranızla satıcıya iptal talebinizi iletebilirsiniz. İptal ve stok iadesi siparişin ödeme ve sevkiyat durumuna göre yönetici tarafından işlenir. Ödenmiş havalenin iadesi otomatik banka işlemiyle gerçekleştirilmez.'] },
    { heading: 'Cayma hakkı', paragraphs: ['Tüketici mesafeli mal satışlarında kural olarak teslimden itibaren 14 gün içinde cayabilir. Uygulanabilir istisnalar ürün ve ambalaj koşullarına göre değerlendirilir; bütün gıda veya baharat ürünleri kendiliğinden cayma dışı sayılmaz.'] },
    { heading: 'Bildirim ve fiziksel iade', paragraphs: ['Doğrulanmış KEP ve merkez / iade adresi aşağıdaki satıcı bilgilerinde yer alır. Normal iade başvuru e-postası, iade taşıyıcısı ve masraf koşulları henüz belirlenmedi.', 'Fiziksel iade adresi işletme merkez adresiyle aynıdır. Bu taslak, eksik iade usulünü tamamlanmış veya kabul edilmiş olarak göstermez.'] },
  ] },
  { path: '/kvkk', title: 'KVKK Aydınlatma Metni', audience: 'all', missing: ['dataProcessing', 'dataRecipients', 'privacyContact'], sources: [privacySource], sections: [
    { heading: 'Veri sorumlusu', paragraphs: ['Veri sorumlusu Ayhan Ermeç’e ait Efsane Baharat şahıs / esnaf işletmesidir. Doğrulanmış kimlik, adres ve KEP bilgileri aşağıda yer alır.'] },
    { heading: 'Veriler, yöntem ve kullanım', paragraphs: ['Site formları ve hesap / sipariş işlemleri üzerinden ad, soyad, e-posta, telefon, adres, sipariş kalemleri ve destek yazışmaları alınır. Bayi ilişki bilgileri ve XML müşteri dekontları ilgili iş akışında işlenir.', 'Hesap yönetimi, siparişin yerine getirilmesi, teslimat ve destek amaçları için kullanılan bu verilerin amaç bazında hukuki sebep ve saklama süresi tablosu henüz tamamlanmadı.'] },
    { heading: 'Aktarım ve haklar', paragraphs: ['Gerçek hizmet sağlayıcıları, alıcı grupları, aktarım amaçları ve yurt dışı aktarım durumu doğrulanmayı bekliyor. Bu taslak aktarım yapılmadığı veya belirli bir saklama süresi bulunduğu iddiasında bulunmaz.', '6698 sayılı Kanun’un 11. maddesindeki ilgili kişi hakları saklıdır. Başvuru usulünün tamamlanması gerekiyor. Aydınlatma ayrı sunulur; pazarlama açık rızası veya satış sözleşmesi onayıyla birleştirilmez.'] },
  ] },
  { path: '/gizlilik', title: 'Gizlilik Politikası', audience: 'all', missing: ['dataProcessing', 'dataRecipients', 'privacyContact'], sources: [privacySource], sections: [
    { heading: 'Hesap ve sipariş verileri', paragraphs: ['Hesap, sipariş ve destek bilgileri ilgili hizmetlerin sunulması için kullanılır. Bu genel gizlilik sayfası, KVKK aydınlatma yükümlülüğünün yerine geçmez.'] },
    { heading: 'Tarayıcıda saklanan bilgiler', paragraphs: ['Oturumu sürdürmek, sepeti yönetmek ve ödeme isteğinin tekrarını takip etmek için tarayıcı yerel / oturum depolaması kullanılır. Depolama anahtarı, amaç ve süre envanteri ile varsa çerez / analitik sağlayıcıları satış açılışından önce tamamlanmalıdır.'] },
    { heading: 'Sağlayıcı ve saklama koşulları', paragraphs: ['Barındırma, ödeme, kargo ve e-posta hizmetlerinin gerçek veri akışları ile saklama / silme kuralları doğrulanmayı bekler. Belirlenmemiş sağlayıcı veya süreler bu metne eklenmemiştir.'] },
  ] },
  { path: '/islem-rehberi', title: 'İşlem Rehberi', audience: 'all', missing: ['customerEmail', 'shippingCompany', 'dispatchTime', 'shippingFee'], sections: [
    { heading: 'Hesap ve sepet', paragraphs: ['Ürün seçeneğini ve satış birimini kontrol ederek sepete ekleyin. Sepette miktarı değiştirebilir veya satırı çıkarabilirsiniz. Sipariş için hesabınıza giriş yapın ve adres / telefon bilgilerinizi kontrol edin.', 'Bayi ve XML müşteri başvuruları yönetici onayına tabidir. Bu kanalların stok erişimi ve sipariş akışları perakendeden farklıdır; tüketici sözleşme hükümleri otomatik uygulanmaz.'] },
    paymentSection,
    { heading: 'Sipariş takibi ve düzeltme', paragraphs: ['Sipariş kaydı oluşmadan önce sepet ve iletişim alanlarını düzeltebilirsiniz. Kayıt oluştuktan sonra Hesabım alanından sipariş durumunu ve havale bilgilerini görüntüleyebilir; değişiklik talebi için satıcıyla sipariş numaranız üzerinden iletişime geçebilirsiniz.', 'E-posta doğrulama ve şifre sıfırlama mesajlarının teslimi, e-posta sağlayıcısı yapılandırılıp doğrulanınca hazır olacaktır.'] },
  ] },
]
