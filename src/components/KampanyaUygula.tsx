import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Tag, X, AlertCircle } from 'lucide-react';

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

interface KampanyaUygulaProps {
  sepetTutari: number;
  onKampanyaUygula: (kampanya: Kampanya | null, indirimTutari: number, tekKullanimlikKodId?: string | null) => void;
}

export default function KampanyaUygula({ sepetTutari, onKampanyaUygula }: KampanyaUygulaProps) {
  const { musteriData } = useAuth();
  const [kampanyaKodu, setKampanyaKodu] = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState('');
  const [uygulananKampanya, setUygulananKampanya] = useState<Kampanya | null>(null);
  const [indirimTutari, setIndirimTutari] = useState(0);
  const [aktifKampanyalar, setAktifKampanyalar] = useState<Kampanya[]>([]);
  const [kampanyalarYukleniyor, setKampanyalarYukleniyor] = useState(true);
  const [gosterimModu, setGosterimModu] = useState<'liste' | 'kod'>('liste');

  // Aktif kampanyaları yükle
  useEffect(() => {
    aktifKampanyalariYukle();
  }, [musteriData]);

  const aktifKampanyalariYukle = async () => {
    try {
      setKampanyalarYukleniyor(true);

      const simdi = new Date().toISOString();

      let query = supabase
        .from('kampanyalar')
        .select('*')
        .eq('aktif', true)
        .lte('baslangic_tarihi', simdi)
        .gte('bitis_tarihi', simdi);

      // Hedef grup filtresi
      if (musteriData) {
        if (musteriData.musteri_tipi === 'bayi') {
          query = query.in('hedef_grup', ['bayi', 'hepsi']);
        } else {
          query = query.in('hedef_grup', ['musteri', 'hepsi']);
        }
      } else {
        query = query.eq('hedef_grup', 'hepsi');
      }

      const { data, error } = await query;

      if (!error && data) {
        // Kullanım limiti kontrolü
        const uygunKampanyalar = data.filter(k =>
          !k.kullanim_limiti || k.kullanim_sayisi < k.kullanim_limiti
        );
        setAktifKampanyalar(uygunKampanyalar);
      }
    } catch (error) {
      console.error('Kampanyalar yüklenirken hata:', error);
    } finally {
      setKampanyalarYukleniyor(false);
    }
  };

  const kampanyaKontrol = async (kod: string) => {
    try {
      setYukleniyor(true);
      setHata('');

      // Kampanya kodu kontrolü (önce tek kullanımlık kodları kontrol et)
      const { data: kodData, error: kodError } = await supabase
        .rpc('validate_campaign_code', { p_kod: kod });

      if (kodError) throw kodError;

      let kampanya = null;
      let tekKullanimlikKodId = null;

      if (kodData && kodData.length > 0) {
        // Tek kullanımlık kod bulundu
        const kodBilgisi = kodData[0];
        if (kodBilgisi.kullanildi) {
          setHata('Bu kampanya kodu daha önce kullanılmış');
          setYukleniyor(false);
          return;
        }
        kampanya = kodBilgisi.kampanya_data;
        tekKullanimlikKodId = kodBilgisi.kod; // Kodun kendisini saklıyoruz
      } else {
        // Normal kampanya kodu kontrolü
        const { data: normalKampanya, error: kampanyaError } = await supabase
          .from('kampanyalar')
          .select('*')
          .eq('kod', kod.toUpperCase())
          .eq('aktif', true)
          .single();

        if (kampanyaError) {
          if (kampanyaError.code === 'PGRST116') {
            setHata('Geçersiz kampanya kodu');
          } else {
            console.error('Kampanya sorgulama hatası:', kampanyaError);
            setHata('Kampanya kontrol edilirken hata oluştu');
          }
          setYukleniyor(false);
          return;
        }
        kampanya = normalKampanya;
      }

      if (!kampanya) {
        setHata('Kampanya bulunamadı');
        setYukleniyor(false);
        return;
      }

      // Tarih kontrolü
      const simdi = new Date();
      if (new Date(kampanya.baslangic_tarihi) > simdi || new Date(kampanya.bitis_tarihi) < simdi) {
        setHata('Bu kampanyanın süresi dolmuş veya henüz başlamamış');
        setYukleniyor(false);
        return;
      }

      // Kullanım limiti kontrolü
      if (kampanya.kullanim_limiti && kampanya.kullanim_sayisi >= kampanya.kullanim_limiti) {
        setHata('Bu kampanya kullanım limitine ulaşmış');
        setYukleniyor(false);
        return;
      }

      // Hedef grup kontrolü
      if (kampanya.hedef_grup !== 'hepsi') {
        if (!musteriData) {
          setHata('Bu kampanyayı kullanmak için giriş yapmalısınız');
          setYukleniyor(false);
          return;
        }

        if (kampanya.hedef_grup === 'bayi' && musteriData.musteri_tipi !== 'bayi') {
          setHata('Bu kampanya sadece bayiler için geçerlidir');
          setYukleniyor(false);
          return;
        }

        if (kampanya.hedef_grup === 'musteri' && musteriData.musteri_tipi !== 'musteri') {
          setHata('Bu kampanya sadece müşteriler için geçerlidir');
          setYukleniyor(false);
          return;
        }
      }

      // Minimum sepet tutarı kontrolü
      if (sepetTutari < kampanya.min_sepet_tutari) {
        setHata(`Bu kampanya için minimum sepet tutarı ${kampanya.min_sepet_tutari} TL olmalıdır`);
        setYukleniyor(false);
        return;
      }

      // İndirim hesapla
      let indirim = 0;
      if (kampanya.indirim_tipi === 'yuzde') {
        indirim = (sepetTutari * kampanya.indirim_degeri) / 100;
        if (kampanya.max_indirim_tutari && indirim > kampanya.max_indirim_tutari) {
          indirim = kampanya.max_indirim_tutari;
        }
      } else {
        indirim = kampanya.indirim_degeri;
      }

      setUygulananKampanya(kampanya);
      setIndirimTutari(indirim);
      onKampanyaUygula(kampanya, indirim, tekKullanimlikKodId);

    } catch (error) {
      console.error('Kampanya kontrol hatası:', error);
      setHata('Kampanya kontrol edilirken bir hata oluştu');
    } finally {
      setYukleniyor(false);
    }
  };

  const kampanyaKaldir = () => {
    setUygulananKampanya(null);
    setIndirimTutari(0);
    setKampanyaKodu('');
    setHata('');
    onKampanyaUygula(null, 0);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (kampanyaKodu.trim()) {
      kampanyaKontrol(kampanyaKodu.trim());
    }
  };

  const kampanyaSecVeUygula = (kampanya: Kampanya) => {
    // Minimum sepet tutarı kontrolü
    if (sepetTutari < kampanya.min_sepet_tutari) {
      setHata(`Bu kampanya için minimum sepet tutarı ${kampanya.min_sepet_tutari} TL olmalıdır`);
      return;
    }

    // İndirim hesapla
    let indirim = 0;
    if (kampanya.indirim_tipi === 'yuzde') {
      indirim = (sepetTutari * kampanya.indirim_degeri) / 100;
      if (kampanya.max_indirim_tutari && indirim > kampanya.max_indirim_tutari) {
        indirim = kampanya.max_indirim_tutari;
      }
    } else {
      indirim = kampanya.indirim_degeri;
    }

    setUygulananKampanya(kampanya);
    setIndirimTutari(indirim);
    setHata('');
    onKampanyaUygula(kampanya, indirim);
  };

  const indirimHesapla = (kampanya: Kampanya) => {
    let indirim = 0;
    if (kampanya.indirim_tipi === 'yuzde') {
      indirim = (sepetTutari * kampanya.indirim_degeri) / 100;
      if (kampanya.max_indirim_tutari && indirim > kampanya.max_indirim_tutari) {
        indirim = kampanya.max_indirim_tutari;
      }
    } else {
      indirim = kampanya.indirim_degeri;
    }
    return indirim;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Tag className="w-5 h-5 text-green-600" />
          <h3 className="font-semibold text-gray-900">Kampanyalar</h3>
        </div>
        {!uygulananKampanya && (
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setGosterimModu('liste')}
              className={`px-3 py-1 text-sm rounded transition-colors ${gosterimModu === 'liste'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              Kampanyalar
            </button>
            <button
              onClick={() => setGosterimModu('kod')}
              className={`px-3 py-1 text-sm rounded transition-colors ${gosterimModu === 'kod'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              Kod Gir
            </button>
          </div>
        )}
      </div>

      {uygulananKampanya ? (
        <div className="space-y-3">
          <div className="flex items-start justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-green-900">{uygulananKampanya.kod}</span>
                <span className="text-sm text-green-700">- {uygulananKampanya.ad}</span>
              </div>
              <p className="text-sm text-green-800 mb-2">{uygulananKampanya.aciklama}</p>
              <p className="text-lg font-bold text-green-900">
                İndirim: -{indirimTutari.toFixed(2)} TL
              </p>
            </div>
            <button
              onClick={kampanyaKaldir}
              className="p-1 text-green-700 hover:text-green-900 hover:bg-green-100 rounded transition-colors"
              title="Kampanyayı kaldır"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      ) : gosterimModu === 'liste' ? (
        <div className="space-y-3">
          {kampanyalarYukleniyor ? (
            <div className="text-center py-4">
              <div className="inline-block w-6 h-6 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : aktifKampanyalar.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              Şu anda aktif kampanya bulunmuyor
            </p>
          ) : (
            <>
              <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-800">
                  ℹ️ Sadece bir kampanya seçebilirsiniz. Grup indirimi ile birlikte kullanılabilir.
                </p>
              </div>
              {aktifKampanyalar.map((kampanya) => {
                const uygunMu = sepetTutari >= kampanya.min_sepet_tutari;
                const indirim = indirimHesapla(kampanya);

                return (
                  <div
                    key={kampanya.id}
                    className={`p-3 border rounded-lg transition-all ${uygunMu
                        ? 'border-green-200 bg-green-50 hover:bg-green-100 cursor-pointer'
                        : 'border-gray-200 bg-gray-50 opacity-60'
                      }`}
                    onClick={() => uygunMu && kampanyaSecVeUygula(kampanya)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-gray-900">{kampanya.kod}</span>
                          <span className="text-xs px-2 py-0.5 bg-green-600 text-white rounded-full">
                            {kampanya.indirim_tipi === 'yuzde'
                              ? `%${kampanya.indirim_degeri}`
                              : `${kampanya.indirim_degeri} TL`}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 mb-1">{kampanya.ad}</p>
                        <p className="text-xs text-gray-600">{kampanya.aciklama}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-600 mt-2 pt-2 border-t border-gray-200">
                      <span>Min. Sepet: {kampanya.min_sepet_tutari} TL</span>
                      {uygunMu ? (
                        <span className="text-green-700 font-semibold">
                          İndirim: -{indirim.toFixed(2)} TL
                        </span>
                      ) : (
                        <span className="text-orange-600">
                          {(kampanya.min_sepet_tutari - sepetTutari).toFixed(2)} TL daha ekleyin
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={kampanyaKodu}
              onChange={(e) => setKampanyaKodu(e.target.value.toUpperCase())}
              placeholder="Kampanya kodunu girin"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent uppercase"
              disabled={yukleniyor}
            />
            <button
              type="submit"
              disabled={yukleniyor || !kampanyaKodu.trim()}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {yukleniyor ? 'Kontrol ediliyor...' : 'Uygula'}
            </button>
          </div>

          {hata && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{hata}</p>
            </div>
          )}
        </form>
      )}
    </div>
  );
}
