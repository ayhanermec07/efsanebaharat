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
  const [activeTab, setActiveTab] = useState<'kampanyalar' | 'istatistikler' | 'kodlar' | 'bannerlar'>('kampanyalar');
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
    marka_id: ''
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
        marka_id: kampanya.marka_id || ''
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
        marka_id: ''
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
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Kampanya Yönetimi</h1>
        <div className="flex gap-3">
          <button
            onClick={() => setActiveTab('kampanyalar')}
            className={`px-4 py-2 rounded-lg transition-colors ${activeTab === 'kampanyalar'
              ? 'bg-orange-100 text-orange-700 font-medium'
              : 'text-gray-600 hover:bg-gray-100'
              }`}
          >
            Kampanyalar
          </button>
          <button
            onClick={() => setActiveTab('bannerlar')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${activeTab === 'bannerlar'
              ? 'bg-orange-100 text-orange-700 font-medium'
              : 'text-gray-600 hover:bg-gray-100'
              }`}
          >
            <ImageIcon className="w-4 h-4" />
            Bannerlar
          </button>
          <button
            onClick={() => setActiveTab('kodlar')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${activeTab === 'kodlar'
              ? 'bg-orange-100 text-orange-700 font-medium'
              : 'text-gray-600 hover:bg-gray-100'
              }`}
          >
            <QrCode className="w-4 h-4" />
            Tek Kullanımlık Kodlar
          </button>
          <button
            onClick={() => setActiveTab('istatistikler')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${activeTab === 'istatistikler'
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
      ) : activeTab === 'bannerlar' ? (
        <BannerlarYonetim kampanyalar={kampanyalar} />
      ) : activeTab === 'kodlar' ? (
        <KampanyaKodlari kampanyalar={kampanyalar} />
      ) : (
        <>
          <div className="flex justify-end mb-4">
            <button
              onClick={() => modalAc()}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
            >
              <Plus className="w-5 h-5" />
              Yeni Kampanya
            </button>
          </div>

          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kod</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kampanya</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kapsam</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">İndirim</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hedef Grup</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tarih</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kullanım</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Durum</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">İşlemler</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {kampanyalar.map((kampanya) => (
                  <tr key={kampanya.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Tag className="w-4 h-4 text-orange-600" />
                        <span className="font-mono font-semibold text-gray-900">{kampanya.kod}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900">{kampanya.ad}</div>
                        <div className="text-sm text-gray-500">{kampanya.aciklama}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-semibold text-green-600">
                        {kampanya.indirim_tipi === 'yuzde'
                          ? `%${kampanya.indirim_degeri}`
                          : `${kampanya.indirim_degeri} TL`}
                      </span>
                      {kampanya.max_indirim_tutari && (
                        <div className="text-xs text-gray-500">Max: {kampanya.max_indirim_tutari} TL</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${kampanya.hedef_grup === 'musteri' ? 'bg-blue-100 text-blue-800' :
                        kampanya.hedef_grup === 'bayi' ? 'bg-purple-100 text-purple-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                        {kampanya.hedef_grup === 'musteri' ? 'Müşteri' :
                          kampanya.hedef_grup === 'bayi' ? 'Bayi' : 'Hepsi'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(kampanya.baslangic_tarihi).toLocaleDateString('tr-TR')}</span>
                      </div>
                      <div className="text-xs">- {new Date(kampanya.bitis_tarihi).toLocaleDateString('tr-TR')}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="text-gray-900 font-semibold">{kampanya.kullanim_sayisi || 0}</div>
                      {kampanya.kullanim_limiti && (
                        <div className="text-xs text-gray-500">/ {kampanya.kullanim_limiti}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${kampanya.aktif ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                        {kampanya.aktif ? 'Aktif' : 'Pasif'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => modalAc(kampanya)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => kampanyaSil(kampanya.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Modal */}
          {modalAcik && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-6">
                    {duzenlenecekKampanya ? 'Kampanya Düzenle' : 'Yeni Kampanya'}
                  </h2>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Kampanya Kodu *
                        </label>
                        <input
                          type="text"
                          value={formData.kod}
                          onChange={(e) => setFormData({ ...formData, kod: e.target.value.toUpperCase() })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 uppercase"
                          required
                          disabled={!!duzenlenecekKampanya}
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                          required
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                        rows={2}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          İndirim Tipi *
                        </label>
                        <select
                          value={formData.indirim_tipi}
                          onChange={(e) => setFormData({ ...formData, indirim_tipi: e.target.value as 'yuzde' | 'tutar' })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                        >
                          <option value="yuzde">Yüzde (%)</option>
                          <option value="tutar">Tutar (TL)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          İndirim Değeri *
                        </label>
                        <input
                          type="number"
                          value={formData.indirim_degeri}
                          onChange={(e) => setFormData({ ...formData, indirim_degeri: parseFloat(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                          required
                          min="0"
                          step="0.01"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Max İndirim (TL)
                        </label>
                        <input
                          type="number"
                          value={formData.max_indirim_tutari || ''}
                          onChange={(e) => setFormData({ ...formData, max_indirim_tutari: e.target.value ? parseFloat(e.target.value) : null })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                          min="0"
                          step="0.01"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Min Sepet Tutarı (TL) *
                        </label>
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
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Hedef Grup *
                        </label>
                        <select
                          value={formData.hedef_grup}
                          onChange={(e) => setFormData({ ...formData, hedef_grup: e.target.value as 'musteri' | 'bayi' | 'hepsi' })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                        >
                          <option value="hepsi">Hepsi</option>
                          <option value="musteri">Müşteri</option>
                          <option value="bayi">Bayi</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Kullanım Limiti
                        </label>
                        <input
                          type="number"
                          value={formData.kullanim_limiti || ''}
                          onChange={(e) => setFormData({ ...formData, kullanim_limiti: e.target.value ? parseInt(e.target.value) : null })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                          min="1"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Başlangıç Tarihi *
                        </label>
                        <input
                          type="date"
                          value={formData.baslangic_tarihi}
                          onChange={(e) => setFormData({ ...formData, baslangic_tarihi: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Bitiş Tarihi *
                        </label>
                        <input
                          type="date"
                          value={formData.bitis_tarihi}
                          onChange={(e) => setFormData({ ...formData, bitis_tarihi: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                          required
                        />
                      </div>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.aktif}
                        onChange={(e) => setFormData({ ...formData, aktif: e.target.checked })}
                        className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                      />
                      <label className="ml-2 text-sm text-gray-700">
                        Kampanya aktif
                      </label>
                    </div>

                    {/* Kampanya Kapsamı */}
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <h4 className="font-medium text-gray-900 mb-3 text-sm">Kampanya Kapsamı</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Kapsam Türü</label>
                          <select
                            value={formData.kapsam}
                            onChange={(e) => setFormData({ ...formData, kapsam: e.target.value as any })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                          >
                            <option value="tum_urunler">Tüm Ürünler</option>
                            <option value="kategori">Belirli Kategori</option>
                            <option value="marka">Belirli Marka</option>
                            <option value="secili_urunler">Seçili Ürünler</option>
                          </select>
                        </div>

                        {formData.kapsam === 'kategori' && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Kategori Seçin</label>
                            <select
                              value={formData.kategori_id}
                              onChange={(e) => setFormData({ ...formData, kategori_id: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                              required
                            >
                              <option value="">Seçiniz...</option>
                              {kategoriler.map(k => <option key={k.id} value={k.id}>{k.kategori_adi}</option>)}
                            </select>
                          </div>
                        )}

                        {formData.kapsam === 'marka' && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Marka Seçin</label>
                            <select
                              value={formData.marka_id}
                              onChange={(e) => setFormData({ ...formData, marka_id: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                              required
                            >
                              <option value="">Seçiniz...</option>
                              {markalar.map(m => <option key={m.id} value={m.id}>{m.marka_adi}</option>)}
                            </select>
                          </div>
                        )}
                      </div>

                      {formData.kapsam === 'secili_urunler' && (
                        <div className="mt-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">Ürünleri Seçin</label>
                          <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-lg p-2 bg-white grid grid-cols-2 gap-2">
                            {urunler.map(urun => (
                              <div key={urun.id} className="flex items-center text-sm">
                                <input
                                  type="checkbox"
                                  id={`prod-${urun.id}`}
                                  checked={seciliUrunIds.includes(urun.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) setSeciliUrunIds([...seciliUrunIds, urun.id]);
                                    else setSeciliUrunIds(seciliUrunIds.filter(id => id !== urun.id));
                                  }}
                                  className="w-4 h-4 text-orange-600 rounded mr-2"
                                />
                                <label htmlFor={`prod-${urun.id}`} className="truncate cursor-pointer select-none">
                                  {urun.urun_adi} <span className="text-gray-400 text-xs">({urun.urun_kodu})</span>
                                </label>
                              </div>
                            ))}
                          </div>
                          <div className="text-right text-xs text-gray-500 mt-1">
                            {seciliUrunIds.length} ürün seçildi
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                      <button
                        type="button"
                        onClick={modalKapat}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                      >
                        İptal
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                      >
                        {duzenlenecekKampanya ? 'Güncelle' : 'Oluştur'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
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

      <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
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
          <table className="min-w-full divide-y divide-gray-200">
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

function BannerlarYonetim({ kampanyalar }: { kampanyalar: Kampanya[] }) {
  const [bannerlar, setBannerlar] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [secilenKampanya, setSecilenKampanya] = useState<string>('')
  const [formData, setFormData] = useState({
    banner_baslik: '',
    resim_url: '',
    link_url: '',
    sira_no: 0,
    aktif_durum: true
  })

  useEffect(() => {
    loadBannerlar()
  }, [])

  async function loadBannerlar() {
    setLoading(true)
    const { data } = await supabase
      .from('bannerlar')
      .select('*')
      .order('sira_no', { ascending: true })

    if (data) setBannerlar(data)
    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    try {
      if (editingId) {
        const { error } = await supabase
          .from('bannerlar')
          .update(formData)
          .eq('id', editingId)

        if (error) throw error
        toast.success('Banner başarıyla güncellendi!')
      } else {
        const { error } = await supabase
          .from('bannerlar')
          .insert(formData)

        if (error) throw error
        toast.success('Banner başarıyla eklendi!')
      }

      resetForm()
      await loadBannerlar()
    } catch (error: any) {
      console.error('Banner kayıt hatası:', error)
      toast.error('Hata: ' + (error.message || 'Bilinmeyen hata'))
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Bu banner\'ı silmek istediğinizden emin misiniz?')) return

    try {
      const { error } = await supabase
        .from('bannerlar')
        .delete()
        .eq('id', id)

      if (error) throw error

      await loadBannerlar()
      toast.success('Banner silindi!')
    } catch (error: any) {
      console.error('Banner silme hatası:', error)
      toast.error('Hata: ' + (error.message || 'Bilinmeyen hata'))
    }
  }

  function handleEdit(banner: any) {
    setEditingId(banner.id)
    setFormData({
      banner_baslik: banner.banner_baslik,
      resim_url: banner.resim_url,
      link_url: banner.link_url || '',
      sira_no: banner.sira_no || 0,
      aktif_durum: banner.aktif_durum
    })
    // Link URL'den kampanya ID'sini çıkarmaya çalışmıyoruz çünkü %100 eşleşmeyebilir.
    // Sadece manuel seçim bırakıyoruz.
    setSecilenKampanya('')
    setModalOpen(true)
  }

  function handleKampanyaChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const kampanyaId = e.target.value
    setSecilenKampanya(kampanyaId)

    if (kampanyaId) {
      const selectedCamp = kampanyalar.find(k => k.id === kampanyaId);
      let newLinkUrl = '/kampanyalar';

      if (selectedCamp) {
        if (selectedCamp.kapsam === 'kategori' && selectedCamp.kategori_id) {
          newLinkUrl = `/urunler?kategori=${selectedCamp.kategori_id}&kampanya=${selectedCamp.id}`;
        } else if (selectedCamp.kapsam === 'marka' && selectedCamp.marka_id) {
          newLinkUrl = `/urunler?marka=${selectedCamp.marka_id}&kampanya=${selectedCamp.id}`;
        } else if (selectedCamp.kapsam === 'secili_urunler') {
          newLinkUrl = `/urunler?kampanya=${selectedCamp.id}`;
        }
        // 'tum_urunler' için /urunler?kampanya=ID olabilir
        else if (selectedCamp.kapsam === 'tum_urunler') {
          newLinkUrl = `/urunler?kampanya=${selectedCamp.id}`;
        }
      }

      // Kampanya seçildiğinde linki otomatik oluştur
      setFormData(prev => ({
        ...prev,
        link_url: newLinkUrl
      }))
    }
  }

  function resetForm() {
    setEditingId(null)
    setSecilenKampanya('')
    setFormData({
      banner_baslik: '',
      resim_url: '',
      link_url: '',
      sira_no: 0,
      aktif_durum: true
    })
    setModalOpen(false)
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setModalOpen(true)}
          className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700 transition flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>Yeni Banner Ekle</span>
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Banner Başlık</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Resim</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sıra No</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Durum</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {bannerlar.map((banner) => (
                <tr key={banner.id}>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{banner.banner_baslik}</td>
                  <td className="px-6 py-4 text-sm">
                    {banner.resim_url && (
                      <img src={banner.resim_url} alt={banner.banner_baslik} className="h-12 w-24 object-cover rounded" />
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{banner.sira_no}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs ${banner.aktif_durum ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {banner.aktif_durum ? 'Aktif' : 'Pasif'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm space-x-2">
                    <button
                      onClick={() => handleEdit(banner)}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <Edit className="w-4 h-4 inline" /> Düzenle
                    </button>
                    <button
                      onClick={() => handleDelete(banner.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4 inline" /> Sil
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-lg w-full my-8">
            <div className="p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingId ? 'Banner Düzenle' : 'Yeni Banner Ekle'}
                </h2>
                <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Banner Başlık</label>
                  <input
                    type="text"
                    value={formData.banner_baslik}
                    onChange={(e) => setFormData({ ...formData, banner_baslik: e.target.value })}
                    required
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Banner Görseli</label>
                  <ImageUpload
                    maxFiles={1}
                    bucketName="banners"
                    onUploadComplete={(urls) => setFormData({ ...formData, resim_url: urls[0] || '' })}
                    existingImages={formData.resim_url ? [formData.resim_url] : []}
                    maxSizeMB={8}
                  />
                  <p className="text-xs text-gray-500 mt-2">Banner görseli yükleyin (maksimum 8MB)</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Kampanya Bağla (Opsiyonel)</label>
                  <select
                    value={secilenKampanya}
                    onChange={handleKampanyaChange}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">Kampanya Seçiniz...</option>
                    {kampanyalar.map(k => (
                      <option key={k.id} value={k.id}>{k.ad} ({k.indirim_tipi === 'yuzde' ? '%' + k.indirim_degeri : k.indirim_degeri + ' TL'} İndirim)</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Kampanya seçildiğinde Link URL otomatik ayarlanır.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Link URL</label>
                  <input
                    type="text"
                    value={formData.link_url}
                    onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                    placeholder="https://... veya /kampanyalar"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sıra No</label>
                  <input
                    type="number"
                    value={formData.sira_no}
                    onChange={(e) => setFormData({ ...formData, sira_no: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.aktif_durum}
                    onChange={(e) => setFormData({ ...formData, aktif_durum: e.target.checked })}
                    className="w-4 h-4 text-orange-600 rounded"
                  />
                  <label className="ml-2 text-sm text-gray-700">Aktif</label>
                </div>

                <div className="flex space-x-4 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-orange-600 text-white py-2 rounded-lg hover:bg-orange-700 transition flex items-center justify-center space-x-2"
                  >
                    <Save className="w-5 h-5" />
                    <span>{editingId ? 'Güncelle' : 'Kaydet'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition"
                  >
                    İptal
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
