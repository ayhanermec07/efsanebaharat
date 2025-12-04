import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Edit, Trash2, Calendar, Tag, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';
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
}

export default function KampanyalarYonetim() {
  const [kampanyalar, setKampanyalar] = useState<Kampanya[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [modalAcik, setModalAcik] = useState(false);
  const [istatistikGoster, setIstatistikGoster] = useState(false);
  const [duzenlenecekKampanya, setDuzenlenecekKampanya] = useState<Kampanya | null>(null);
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
  });

  useEffect(() => {
    kampanyalariGetir();
  }, []);

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

  const modalAc = (kampanya?: Kampanya) => {
    if (kampanya) {
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
      });
    } else {
      setDuzenlenecekKampanya(null);
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
      });
    }
    setModalAcik(true);
  };

  const modalKapat = () => {
    setModalAcik(false);
    setDuzenlenecekKampanya(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const kampanyaData = {
        baslik: formData.ad, // baslik alanı gerekli
        ...formData,
        kod: formData.kod.toUpperCase(),
      };

      if (duzenlenecekKampanya) {
        const { error } = await supabase
          .from('kampanyalar')
          .update(kampanyaData)
          .eq('id', duzenlenecekKampanya.id);

        if (error) throw error;
        toast.success('Kampanya güncellendi');
      } else {
        const { error } = await supabase
          .from('kampanyalar')
          .insert([kampanyaData]);

        if (error) throw error;
        toast.success('Kampanya oluşturuldu');
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

  if (istatistikGoster) {
    return (
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Kampanya İstatistikleri</h1>
          <button
            onClick={() => setIstatistikGoster(false)}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Kampanyalara Dön
          </button>
        </div>
        <KampanyaIstatistikleri />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Kampanya Yönetimi</h1>
        <div className="flex gap-3">
          <button
            onClick={() => setIstatistikGoster(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <TrendingUp className="w-5 h-5" />
            İstatistikler
          </button>
          <button
            onClick={() => modalAc()}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
          >
            <Plus className="w-5 h-5" />
            Yeni Kampanya
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kod</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kampanya</th>
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
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    kampanya.hedef_grup === 'musteri' ? 'bg-blue-100 text-blue-800' :
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
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    kampanya.aktif ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
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
    </div>
  );
}
