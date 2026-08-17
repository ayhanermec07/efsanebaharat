import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Edit, Trash2, Calendar, Tag, TrendingUp, QrCode, Copy, Check, RefreshCw, Image as ImageIcon, Save, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { ImageUpload } from '../../components/ImageUpload';
import KampanyaIstatistikleri from '../../components/admin/KampanyaIstatistikleri';

interface Kampanya {
  id: string;
  kod: string;
  ad: string;
  aciklama: string;
  indirim_tipi: 'yuzde' | 'tutar';
  indirim_degeri: number;
  min_sepet_tutari: number;
  max_indirim_tutari: number | null;
  hedef_grup: 'musteri' | 'bayi' | 'hepsi';
  baslangic_tarihi: string;
  bitis_tarihi: string;
  kullanim_limiti: number | null;
  kullanim_sayisi: number;
  aktif: boolean;
  kapsam: 'tum_urunler' | 'kategori' | 'marka' | 'secili_urunler';
  kategori_id?: string;
  marka_id?: string;
  anasayfada_goster?: boolean;
  sira_no?: number;
  banner_gorseli?: string;
}

interface KampanyaKodu {
  id: string;
  kampanya_id: string;
  kod: string;
  kullanildi: boolean;
  kullanici_id: string | null;
  kullanilma_tarihi: string | null;
  created_at: string;
  kampanya?: {
    ad: string;
    kod: string;
  };
}

export default function KampanyalarYonetim() {
  const [kampanyalar, setKampanyalar] = useState<Kampanya[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [modalAcik, setModalAcik] = useState(false);
  const [activeTab, setActiveTab] = useState<'kampanyalar' | 'istatistikler' | 'kodlar'>('kampanyalar');
  const [formTab, setFormTab] = useState<'genel' | 'kosullar' | 'banner'>('genel');
  const [duzenlenecekKampanya, setDuzenlenecekKampanya] = useState<Kampanya | null>(null);
  // Eklentiler: Kategoriler, Markalar, Ürünler
  const [kategoriler, setKategoriler] = useState<any[]>([]);
  const [markalar, setMarkalar] = useState<any[]>([]);
  const [seciliUrunIds, setSeciliUrunIds] = useState<string[]>([]);
  const [urunler, setUrunler] = useState<any[]>([]); // Sadece 'secili_urunler' modunda kullanmak için

  const [formData, setFormData] = useState({
    kod: '',
    ad: '',
    aciklama: '',
    indirim_tipi: 'yuzde' as 'yuzde' | 'tutar',
    indirim_degeri: 0,
    min_sepet_tutari: 0,
    max_indirim_tutari: null as number | null,
    hedef_grup: 'hepsi' as 'musteri' | 'bayi' | 'hepsi',
    baslangic_tarihi: '',
    bitis_tarihi: '',
    kullanim_limiti: null as number | null,
    aktif: true,
    kapsam: 'tum_urunler' as 'tum_urunler' | 'kategori' | 'marka' | 'secili_urunler',
    kategori_id: '',
    marka_id: '',
    anasayfada_goster: false,
    sira_no: 0,
    banner_gorseli: ''
  });

  useEffect(() => {
    kampanyalariGetir();
    loadLookups();
  }, []);

  async function loadLookups() {
    // Kategorileri getir
    const { data: katData } = await supabase.from('kategoriler').select('*').order('kategori_adi');
    if (katData) setKategoriler(katData);

    // Markaları getir
    const { data: markaData } = await supabase.from('markalar').select('*').order('marka_adi');
    if (markaData) setMarkalar(markaData);

    // Ürünleri de şimdilik basit bir liste için çekelim (çok ürün varsa bu optimize edilmeli)
    const { data: urunData } = await supabase.from('urunler').select('id, urun_adi, urun_kodu').eq('aktif_durum', true).order('urun_adi');
    if (urunData) setUrunler(urunData);
  }

  const kampanyalariGetir = async () => {
    try {
      setYukleniyor(true);
      const { data, error } = await supabase
        .from('kampanyalar')
        .select('*')
        .order('olusturma_tarihi', { ascending: false });

      if (error) throw error;
      setKampanyalar(data || []);
    } catch (error) {
      console.error('Kampanya getirme hatası:', error);
      toast.error('Kampanyalar yüklenemedi');
    } finally {
      setYukleniyor(false);
    }
  };

  const modalAc = async (kampanya?: Kampanya) => {
    setFormTab('genel'); // Modalı açarken hep ilk sekmeyle başlat
    if (kampanya) {
      // Seçili ürünleri getir
      let relatedProducts: string[] = [];
      if (kampanya.kapsam === 'secili_urunler') {
        const { data } = await supabase.from('kampanya_urunler').select('urun_id').eq('kampanya_id', kampanya.id);
        if (data) relatedProducts = data.map(rx => rx.urun_id);
      }
      setSeciliUrunIds(relatedProducts);

      setDuzenlenecekKampanya(kampanya);
      setFormData({
        kod: kampanya.kod,
        ad: kampanya.ad,
        aciklama: kampanya.aciklama,
        indirim_tipi: kampanya.indirim_tipi,
        indirim_degeri: kampanya.indirim_degeri,
        min_sepet_tutari: kampanya.min_sepet_tutari,
        max_indirim_tutari: kampanya.max_indirim_tutari,
        hedef_grup: kampanya.hedef_grup,
        baslangic_tarihi: kampanya.baslangic_tarihi.split('T')[0],
        bitis_tarihi: kampanya.bitis_tarihi.split('T')[0],
        kullanim_limiti: kampanya.kullanim_limiti,
        aktif: kampanya.aktif,
        kapsam: kampanya.kapsam || 'tum_urunler',
        kategori_id: kampanya.kategori_id || '',
        marka_id: kampanya.marka_id || '',
        anasayfada_goster: kampanya.anasayfada_goster || false,
        sira_no: kampanya.sira_no || 0,
        banner_gorseli: kampanya.banner_gorseli || ''
      });
    } else {
      setDuzenlenecekKampanya(null);
      setSeciliUrunIds([]);
      setFormData({
        kod: '',
        ad: '',
        aciklama: '',
        indirim_tipi: 'yuzde',
        indirim_degeri: 0,
        min_sepet_tutari: 0,
        max_indirim_tutari: null,
        hedef_grup: 'hepsi',
        baslangic_tarihi: '',
        bitis_tarihi: '',
        kullanim_limiti: null,
        aktif: true,
        kapsam: 'tum_urunler',
        kategori_id: '',
        marka_id: '',
        anasayfada_goster: false,
        sira_no: 0,
        banner_gorseli: ''
      });
    }
    setModalAcik(true);
  };

  const modalKapat = () => {
    setModalAcik(false);
    setDuzenlenecekKampanya(null);
    setSeciliUrunIds([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const kampanyaData = {
        baslik: formData.ad, // baslik alanı gerekli
        ...formData,
        kod: formData.kod.toUpperCase(),
        kategori_id: formData.kapsam === 'kategori' ? formData.kategori_id : null,
        marka_id: formData.kapsam === 'marka' ? formData.marka_id : null
      };

      let kampanyaId = '';

      if (duzenlenecekKampanya) {
        const { error } = await supabase
          .from('kampanyalar')
          .update(kampanyaData)
          .eq('id', duzenlenecekKampanya.id);

        if (error) throw error;
        kampanyaId = duzenlenecekKampanya.id;
        toast.success('Kampanya güncellendi');
      } else {
        const { data: newCamp, error } = await supabase
          .from('kampanyalar')
          .insert([kampanyaData])
          .select()
          .single();

        if (error) throw error;
        if (newCamp) kampanyaId = newCamp.id;
        toast.success('Kampanya oluşturuldu');
      }

      // Seçili ürünleri güncelle (varsa)
      if (formData.kapsam === 'secili_urunler' && kampanyaId) {
        // Önce temizle
        await supabase.from('kampanya_urunler').delete().eq('kampanya_id', kampanyaId);

        // Sonra ekle
        if (seciliUrunIds.length > 0) {
          const insertData = seciliUrunIds.map(uid => ({
            kampanya_id: kampanyaId,
            urun_id: uid
          }));
          const { error: prodError } = await supabase.from('kampanya_urunler').insert(insertData);
          if (prodError) console.error('Ürün ekleme hatası', prodError);
        }
      }

      modalKapat();
      kampanyalariGetir();
    } catch (error: any) {
      console.error('Kampanya kaydetme hatası:', error);
      toast.error(error.message || 'Kampanya kaydedilemedi');
    }
  };

  const kampanyaSil = async (id: string) => {
    if (!confirm('Bu kampanyayı silmek istediğinizden emin misiniz?')) return;

    try {
      const { error } = await supabase
        .from('kampanyalar')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Kampanya silindi');
      kampanyalariGetir();
    } catch (error) {
      console.error('Kampanya silme hatası:', error);
      toast.error('Kampanya silinemedi');
    }
  };

  if (yukleniyor) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-12 h-12 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Kampanya Yönetimi</h1>
        <div className="flex max-w-full gap-1 overflow-x-auto pb-1 sm:gap-3">
          <button
            onClick={() => setActiveTab('kampanyalar')}
            className={`min-h-10 shrink-0 px-4 py-2 rounded-lg transition-colors ${activeTab === 'kampanyalar'
              ? 'bg-orange-100 text-orange-700 font-medium'
              : 'text-gray-600 hover:bg-gray-100'
              }`}
          >
            Kampanyalar
          </button>
          <button
            onClick={() => setActiveTab('kodlar')}
            className={`min-h-10 shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${activeTab === 'kodlar'
              ? 'bg-orange-100 text-orange-700 font-medium'
              : 'text-gray-600 hover:bg-gray-100'
              }`}
          >
            <QrCode className="w-4 h-4" />
            Tek Kullanımlık Kodlar
          </button>
          <button
            onClick={() => setActiveTab('istatistikler')}
            className={`min-h-10 shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${activeTab === 'istatistikler'
              ? 'bg-orange-100 text-orange-700 font-medium'
              : 'text-gray-600 hover:bg-gray-100'
              }`}
          >
            <TrendingUp className="w-4 h-4" />
            İstatistikler
          </button>
        </div>
      </div>

      {activeTab === 'istatistikler' ? (
        <KampanyaIstatistikleri />
      ) : activeTab === 'kodlar' ? (
        <KampanyaKodlari kampanyalar={kampanyalar} />
      ) : (
        <>
          <div className="flex justify-end mb-4">
            <button
              onClick={() => modalAc()}
              className="min-h-10 flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
            >
              <Plus className="w-5 h-5" />
              Yeni Kampanya
            </button>
          </div>

          <div className="grid gap-4 mt-2">
            {kampanyalar.map((kampanya) => (
              <div key={kampanya.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all">
                <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  
                  {/* Sol Bölüm: Başlık ve Rozetler */}
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-gray-900 break-words">{kampanya.ad}</h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${kampanya.aktif ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                        {kampanya.aktif ? 'Aktif' : 'Pasif'}
                      </span>
                      {kampanya.anasayfada_goster && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                          <ImageIcon className="w-3 h-3" /> Ana Sayfa
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                      <span className="font-mono bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs font-medium tracking-wide">
                        {kampanya.kod}
                      </span>
                      {kampanya.aciklama && (
                        <>
                          <span>•</span>
                          <span className="truncate max-w-[200px] sm:max-w-xs">{kampanya.aciklama}</span>
                        </>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className={`px-2 py-1 rounded-md font-medium ${kampanya.hedef_grup === 'musteri' ? 'bg-indigo-50 text-indigo-700' : kampanya.hedef_grup === 'bayi' ? 'bg-purple-50 text-purple-700' : 'bg-gray-100 text-gray-700'}`}>
                        Hedef: {kampanya.hedef_grup === 'musteri' ? 'Müşteriler' : kampanya.hedef_grup === 'bayi' ? 'Bayiler' : 'Herkes'}
                      </span>
                      <span className="px-2 py-1 bg-orange-50 text-orange-700 rounded-md font-medium flex items-center gap-1">
                        <Tag className="w-3 h-3" />
                        {kampanya.kapsam === 'tum_urunler' ? 'Tüm Ürünler' : kampanya.kapsam === 'kategori' ? 'Belirli Kategori' : kampanya.kapsam === 'marka' ? 'Belirli Marka' : 'Seçili Ürünler'}
                      </span>
                    </div>
                  </div>

                  {/* Orta Bölüm: İndirim ve Tarih */}
                  <div className="flex flex-col gap-3 min-w-[200px] md:border-l md:border-gray-100 md:px-6">
                    <div>
                      <div className="text-xs text-gray-500 font-medium mb-1 uppercase tracking-wider">İndirim Miktarı</div>
                      <div className="text-xl font-black text-green-600">
                        {kampanya.indirim_tipi === 'yuzde' ? `%${kampanya.indirim_degeri}` : `${kampanya.indirim_degeri} ₺`}
                      </div>
                      {(kampanya.min_sepet_tutari > 0 || kampanya.max_indirim_tutari) && (
                        <div className="text-xs text-gray-500 mt-1">
                          {kampanya.min_sepet_tutari > 0 && `Min: ${kampanya.min_sepet_tutari} ₺ `}
                          {kampanya.max_indirim_tutari && `Max: ${kampanya.max_indirim_tutari} ₺`}
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 text-sm text-gray-600">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span>{new Date(kampanya.baslangic_tarihi).toLocaleDateString('tr-TR')} - {new Date(kampanya.bitis_tarihi).toLocaleDateString('tr-TR')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Sağ Bölüm: İstatistik ve Aksiyonlar */}
                  <div className="flex items-center justify-between md:flex-col md:items-end gap-3 md:border-l md:border-gray-100 md:pl-6">
                    <div className="text-sm">
                      <div className="text-xs text-gray-500 mb-0.5">Kullanım</div>
                      <div className="font-semibold text-gray-900">
                        {kampanya.kullanim_sayisi || 0}
                        <span className="text-gray-400 font-normal">
                          {kampanya.kullanim_limiti ? ` / ${kampanya.kullanim_limiti}` : ' / Sınırsız'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => modalAc(kampanya)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Düzenle"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => kampanyaSil(kampanya.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Sil"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {kampanyalar.length === 0 && (
              <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                <Tag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-gray-900">Henüz kampanya yok</h3>
                <p className="text-gray-500 mt-1">Yeni bir kampanya oluşturarak satışlarınızı artırın.</p>
              </div>
            )}
          </div>

          {/* Modal */}
          {modalAcik && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start sm:items-center justify-center z-50 p-0 sm:p-4 overflow-y-auto">
              <div className="bg-white rounded-none sm:rounded-lg max-w-3xl w-full min-h-screen sm:min-h-0 max-h-none sm:max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
                <div className="p-4 sm:p-6 border-b border-gray-200 flex justify-between items-center gap-3 bg-white">
                  <h2 className="text-xl font-bold text-gray-900">
                    {duzenlenecekKampanya ? 'Kampanya Düzenle' : 'Yeni Kampanya'}
                  </h2>
                  <button onClick={modalKapat} className="min-h-10 min-w-10 text-gray-400 hover:text-gray-500 transition-colors" aria-label="Kampanya formunu kapat">
                    <X className="w-6 h-6" />
                  </button>
                </div>
                
                {/* Tab Navigasyon */}
                <div className="flex overflow-x-auto border-b border-gray-200 px-4 sm:px-6 pt-2 bg-gray-50/50">
                  <button 
                    type="button" 
                    onClick={() => setFormTab('genel')} 
                    className={`min-h-10 shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${formTab === 'genel' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                  >Temel Bilgiler</button>
                  <button 
                    type="button" 
                    onClick={() => setFormTab('kosullar')} 
                    className={`min-h-10 shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${formTab === 'kosullar' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                  >Koşullar ve Kapsam</button>
                  <button 
                    type="button" 
                    onClick={() => setFormTab('banner')} 
                    className={`min-h-10 shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${formTab === 'banner' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                  >Görünüm ve Banner</button>
                </div>

                <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-white">
                  <form id="kampanya-form" onSubmit={handleSubmit} className="space-y-6">
                    {/* --- TAB 1: TEMEL BİLGİLER --- */}
                    {formTab === 'genel' && (
                      <div className="space-y-5 animate-in fade-in duration-300">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Kampanya Kodu *
                            </label>
                            <input
                              type="text"
                              value={formData.kod}
                              onChange={(e) => setFormData({ ...formData, kod: e.target.value.toUpperCase() })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 uppercase transition-all"
                              required
                              disabled={!!duzenlenecekKampanya}
                              placeholder="Örn: YAZ20"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Kampanya Adı *
                            </label>
                            <input
                              type="text"
                              value={formData.ad}
                              onChange={(e) => setFormData({ ...formData, ad: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 transition-all"
                              required
                              placeholder="Yaza Merhaba İndirimi"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Açıklama
                          </label>
                          <textarea
                            value={formData.aciklama}
                            onChange={(e) => setFormData({ ...formData, aciklama: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 transition-all"
                            rows={3}
                            placeholder="Kampanya detaylarını buraya girebilirsiniz..."
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              İndirim Tipi *
                            </label>
                            <select
                              value={formData.indirim_tipi}
                              onChange={(e) => setFormData({ ...formData, indirim_tipi: e.target.value as 'yuzde' | 'tutar' })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 transition-all bg-white"
                            >
                              <option value="yuzde">Yüzde (%) İndirim</option>
                              <option value="tutar">Sabit Tutar (TL) İndirimi</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              İndirim Değeri *
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                value={formData.indirim_degeri}
                                onChange={(e) => setFormData({ ...formData, indirim_degeri: parseFloat(e.target.value) })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 transition-all pr-10"
                                required
                                min="0"
                                step="0.01"
                              />
                              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-500">
                                {formData.indirim_tipi === 'yuzde' ? '%' : 'TL'}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex justify-end pt-4">
                          <button type="button" onClick={() => setFormTab('kosullar')} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">İleri: Koşullar</button>
                        </div>
                      </div>
                    )}

                    {/* --- TAB 2: KOŞULLAR VE KAPSAM --- */}
                    {formTab === 'kosullar' && (
                      <div className="space-y-6 animate-in fade-in duration-300">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Başlangıç Tarihi *</label>
                            <input
                              type="date"
                              value={formData.baslangic_tarihi}
                              onChange={(e) => setFormData({ ...formData, baslangic_tarihi: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Bitiş Tarihi *</label>
                            <input
                              type="date"
                              value={formData.bitis_tarihi}
                              onChange={(e) => setFormData({ ...formData, bitis_tarihi: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                              required
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Min. Sepet (TL) *</label>
                            <input
                              type="number"
                              value={formData.min_sepet_tutari}
                              onChange={(e) => setFormData({ ...formData, min_sepet_tutari: parseFloat(e.target.value) })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                              required
                              min="0"
                              step="0.01"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Maks. İndirim (TL)</label>
                            <input
                              type="number"
                              value={formData.max_indirim_tutari || ''}
                              onChange={(e) => setFormData({ ...formData, max_indirim_tutari: e.target.value ? parseFloat(e.target.value) : null })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                              min="0"
                              step="0.01"
                              placeholder="Sınırsız"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Kullanım Limiti</label>
                            <input
                              type="number"
                              value={formData.kullanim_limiti || ''}
                              onChange={(e) => setFormData({ ...formData, kullanim_limiti: e.target.value ? parseInt(e.target.value) : null })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                              min="1"
                              placeholder="Sınırsız"
                            />
                          </div>
                        </div>

                        <div className="bg-orange-50 p-4 rounded-lg border border-orange-100">
                          <h4 className="font-medium text-orange-900 mb-4 text-sm flex items-center gap-2">
                            <Tag className="w-4 h-4" /> Kapsam ve Hedef Kitle
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Hedef Grup *</label>
                              <select
                                value={formData.hedef_grup}
                                onChange={(e) => setFormData({ ...formData, hedef_grup: e.target.value as 'musteri' | 'bayi' | 'hepsi' })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 bg-white"
                              >
                                <option value="hepsi">Herkes (Bayi ve Müşteri)</option>
                                <option value="musteri">Sadece Standart Müşteriler</option>
                                <option value="bayi">Sadece Bayiler</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Kapsam Türü</label>
                              <select
                                value={formData.kapsam}
                                onChange={(e) => setFormData({ ...formData, kapsam: e.target.value as any })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 bg-white"
                              >
                                <option value="tum_urunler">Tüm Ürünler</option>
                                <option value="kategori">Belirli Kategori</option>
                                <option value="marka">Belirli Marka</option>
                                <option value="secili_urunler">Seçili Ürünler</option>
                              </select>
                            </div>

                            {formData.kapsam === 'kategori' && (
                              <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Kategori Seçin</label>
                                <select
                                  value={formData.kategori_id}
                                  onChange={(e) => setFormData({ ...formData, kategori_id: e.target.value })}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 bg-white"
                                  required
                                >
                                  <option value="">Seçiniz...</option>
                                  {kategoriler.map(k => <option key={k.id} value={k.id}>{k.kategori_adi}</option>)}
                                </select>
                              </div>
                            )}

                            {formData.kapsam === 'marka' && (
                              <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Marka Seçin</label>
                                <select
                                  value={formData.marka_id}
                                  onChange={(e) => setFormData({ ...formData, marka_id: e.target.value })}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 bg-white"
                                  required
                                >
                                  <option value="">Seçiniz...</option>
                                  {markalar.map(m => <option key={m.id} value={m.id}>{m.marka_adi}</option>)}
                                </select>
                              </div>
                            )}
                          </div>

                          {formData.kapsam === 'secili_urunler' && (
                            <div className="col-span-2 mt-4 bg-white p-3 rounded-lg border border-gray-200">
                              <label className="block text-sm font-medium text-gray-700 mb-2">Ürünleri Seçin</label>
                              <div className="max-h-48 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2 pr-2">
                                {urunler.map(urun => (
                                  <div key={urun.id} className="flex items-center text-sm p-1.5 hover:bg-gray-50 rounded">
                                    <input
                                      type="checkbox"
                                      id={`prod-${urun.id}`}
                                      checked={seciliUrunIds.includes(urun.id)}
                                      onChange={(e) => {
                                        if (e.target.checked) setSeciliUrunIds([...seciliUrunIds, urun.id]);
                                        else setSeciliUrunIds(seciliUrunIds.filter(id => id !== urun.id));
                                      }}
                                      className="w-4 h-4 text-orange-600 rounded mr-2 focus:ring-orange-500 border-gray-300"
                                    />
                                    <label htmlFor={`prod-${urun.id}`} className="truncate cursor-pointer select-none text-gray-700">
                                      {urun.urun_adi}
                                    </label>
                                  </div>
                                ))}
                              </div>
                              <div className="text-right text-xs text-orange-600 mt-2 font-medium">
                                {seciliUrunIds.length} ürün seçildi
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex justify-between pt-4">
                          <button type="button" onClick={() => setFormTab('genel')} className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors">Geri</button>
                          <button type="button" onClick={() => setFormTab('banner')} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">İleri: Banner</button>
                        </div>
                      </div>
                    )}

                    {/* --- TAB 3: BANNER VE GÖRÜNÜM --- */}
                    {formTab === 'banner' && (
                      <div className="space-y-6 animate-in fade-in duration-300">
                        
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                          <div>
                            <h4 className="font-semibold text-gray-900">Kampanya Aktiflik Durumu</h4>
                            <p className="text-sm text-gray-500">Müşterilerin kullanabilmesi için açık olmalıdır.</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.aktif}
                              onChange={(e) => setFormData({ ...formData, aktif: e.target.checked })}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                          </label>
                        </div>

                        <div className="p-5 bg-blue-50/50 rounded-lg border border-blue-100">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                                <ImageIcon className="w-4 h-4 text-blue-600" />
                                Ana Sayfa Banner Gösterimi
                              </h4>
                              <p className="text-sm text-gray-500 mt-1">
                                Kampanyanızı e-ticaret sitenizin ana sayfasındaki en üst slider alanında büyük görsel olarak sergileyin.
                              </p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={formData.anasayfada_goster}
                                onChange={(e) => setFormData({ ...formData, anasayfada_goster: e.target.checked })}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                          </div>
                          
                          {formData.anasayfada_goster && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-blue-100">
                              <div className="space-y-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Slider Sırası</label>
                                  <input
                                    type="number"
                                    value={formData.sira_no}
                                    onChange={(e) => setFormData({ ...formData, sira_no: parseInt(e.target.value) || 0 })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 bg-white"
                                    placeholder="0"
                                  />
                                  <p className="text-xs text-gray-500 mt-1">Küçük numaralar ilk sırada gösterilir.</p>
                                </div>
                                <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                                  <label className="block text-sm font-medium text-gray-700 mb-2">Banner Görseli</label>
                                  <ImageUpload
                                    maxFiles={1}
                                    bucketName="banners"
                                    onUploadComplete={(urls) => setFormData({ ...formData, banner_gorseli: urls[0] || '' })}
                                    existingImages={formData.banner_gorseli ? [formData.banner_gorseli] : []}
                                    maxSizeMB={8}
                                  />
                                </div>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Görünüm Önizlemesi</label>
                                <div className="aspect-[21/9] w-full rounded-xl bg-gray-200 overflow-hidden relative border border-gray-300 shadow-inner flex items-center justify-center">
                                  {formData.banner_gorseli ? (
                                    <>
                                      <img src={formData.banner_gorseli} alt="Banner" className="w-full h-full object-cover" />
                                      <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent flex items-center p-4">
                                        <div className="text-white">
                                          <h5 className="font-bold text-lg">{formData.ad || 'Kampanya Adı'}</h5>
                                          <p className="text-xs opacity-90 line-clamp-2 max-w-[60%]">{formData.aciklama || 'Açıklama metni burada yer alacak...'}</p>
                                        </div>
                                      </div>
                                    </>
                                  ) : (
                                    <div className="text-gray-400 flex flex-col items-center">
                                      <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
                                      <span className="text-xs font-medium">Görsel Yüklenmedi</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex justify-start pt-4">
                          <button type="button" onClick={() => setFormTab('kosullar')} className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors">Geri</button>
                        </div>
                      </div>
                    )}
                  </form>
                </div>

                <div className="p-4 border-t border-gray-200 bg-gray-50 flex flex-col-reverse sm:flex-row sm:justify-end gap-3 rounded-b-lg">
                  <button type="button" onClick={modalKapat} className="min-h-10 px-5 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 font-medium transition-colors">
                    İptal
                  </button>
                  <button type="submit" form="kampanya-form" className="min-h-10 px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center justify-center gap-2 font-medium transition-colors shadow-sm hover:shadow">
                    <Save className="w-5 h-5" />
                    {duzenlenecekKampanya ? 'Değişiklikleri Kaydet' : 'Kampanyayı Oluştur'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function KampanyaKodlari({ kampanyalar }: { kampanyalar: Kampanya[] }) {
  const [kodlar, setKodlar] = useState<KampanyaKodu[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [secilenKampanya, setSecilenKampanya] = useState('');
  const [adet, setAdet] = useState(1);
  const [olusturuluyor, setOlusturuluyor] = useState(false);

  useEffect(() => {
    kodlariGetir();
  }, []);

  const kodlariGetir = async () => {
    try {
      setYukleniyor(true);
      const { data, error } = await supabase
        .from('kampanya_kodlari')
        .select(`
          *,
          kampanya:kampanyalar(ad, kod)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setKodlar(data || []);
    } catch (error) {
      console.error('Kodlar getirilemedi:', error);
      toast.error('Kodlar yüklenirken hata oluştu');
    } finally {
      setYukleniyor(false);
    }
  };

  const kodOlustur = async () => {
    if (!secilenKampanya) {
      toast.error('Lütfen bir kampanya seçin');
      return;
    }

    try {
      setOlusturuluyor(true);
      const yeniKodlar = [];
      const kampanya = kampanyalar.find(k => k.id === secilenKampanya);

      if (!kampanya) return;

      for (let i = 0; i < adet; i++) {
        const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
        const kod = `${kampanya.kod}-${randomStr}`;

        yeniKodlar.push({
          kampanya_id: secilenKampanya,
          kod: kod,
          kullanildi: false
        });
      }

      const { error } = await supabase
        .from('kampanya_kodlari')
        .insert(yeniKodlar);

      if (error) throw error;

      toast.success(`${adet} adet kod oluşturuldu`);
      setAdet(1);
      kodlariGetir();
    } catch (error) {
      console.error('Kod oluşturma hatası:', error);
      toast.error('Kodlar oluşturulamadı');
    } finally {
      setOlusturuluyor(false);
    }
  };

  const kopyala = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Kod kopyalandı');
  };

  const sil = async (id: string) => {
    if (!confirm('Bu kodu silmek istediğinize emin misiniz?')) return;

    try {
      const { error } = await supabase
        .from('kampanya_kodlari')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Kod silindi');
      kodlariGetir();
    } catch (error) {
      console.error('Silme hatası:', error);
      toast.error('Kod silinemedi');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Yeni Kod Oluştur</h3>
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kampanya Seçin
            </label>
            <select
              value={secilenKampanya}
              onChange={(e) => setSecilenKampanya(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
            >
              <option value="">Seçiniz...</option>
              {kampanyalar.map(k => (
                <option key={k.id} value={k.id}>{k.ad} ({k.kod})</option>
              ))}
            </select>
          </div>
          <div className="w-32">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Adet
            </label>
            <input
              type="number"
              value={adet}
              onChange={(e) => setAdet(Math.max(1, parseInt(e.target.value)))}
              min="1"
              max="100"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <button
            onClick={kodOlustur}
            disabled={olusturuluyor || !secilenKampanya}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {olusturuluyor ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Plus className="w-5 h-5" />
            )}
            Oluştur
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-x-auto border border-gray-200">
        <div className="min-w-[680px] p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <h3 className="font-semibold text-gray-900">Oluşturulan Kodlar</h3>
          <button
            onClick={kodlariGetir}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition-colors"
            title="Yenile"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {yukleniyor ? (
          <div className="p-8 text-center">
            <div className="inline-block w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
            <p className="mt-2 text-gray-500">Kodlar yükleniyor...</p>
          </div>
        ) : kodlar.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Henüz oluşturulmuş kod bulunmuyor.
          </div>
        ) : (
          <table className="min-w-[680px] w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kod</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kampanya</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Durum</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Oluşturulma</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">İşlemler</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {kodlar.map((kod) => (
                <tr key={kod.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2 group cursor-pointer" onClick={() => kopyala(kod.kod)}>
                      <span className="font-mono font-semibold text-gray-900">{kod.kod}</span>
                      <Copy className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {kod.kampanya?.ad}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {kod.kullanildi ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600">
                        <Check className="w-3 h-3" />
                        Kullanıldı
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">
                        Aktif
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(kod.created_at).toLocaleDateString('tr-TR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => sil(kod.id)}
                      className="text-red-600 hover:text-red-900"
                      title="Sil"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
