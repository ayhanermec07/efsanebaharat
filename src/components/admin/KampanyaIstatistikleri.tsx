import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { TrendingUp, Users, DollarSign, ShoppingCart } from 'lucide-react';

interface KampanyaIstatistik {
  id: string;
  kod: string;
  ad: string;
  kullanim_sayisi: number;
  kullanim_limiti: number | null;
  siparis_sayisi: number;
  toplam_indirim: number;
  toplam_satis: number;
}

interface Props {
  kampanyaId?: string;
}

export default function KampanyaIstatistikleri({ kampanyaId }: Props) {
  const [istatistikler, setIstatistikler] = useState<KampanyaIstatistik[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);

  useEffect(() => {
    istatistikleriGetir();
  }, [kampanyaId]);

  const istatistikleriGetir = async () => {
    try {
      setYukleniyor(true);
      
      let query = supabase
        .from('kampanya_istatistikleri')
        .select('*');
      
      if (kampanyaId) {
        query = query.eq('id', kampanyaId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      setIstatistikler(data || []);
    } catch (error) {
      console.error('İstatistik getirme hatası:', error);
    } finally {
      setYukleniyor(false);
    }
  };

  if (yukleniyor) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (istatistikler.length === 0) {
    return (
      <div className="text-center p-8 text-gray-500">
        Henüz istatistik verisi bulunmuyor
      </div>
    );
  }

  const toplamIstatistikler = istatistikler.reduce(
    (acc, curr) => ({
      siparis_sayisi: acc.siparis_sayisi + (curr.siparis_sayisi || 0),
      toplam_indirim: acc.toplam_indirim + (curr.toplam_indirim || 0),
      toplam_satis: acc.toplam_satis + (curr.toplam_satis || 0),
      kullanim_sayisi: acc.kullanim_sayisi + (curr.kullanim_sayisi || 0),
    }),
    { siparis_sayisi: 0, toplam_indirim: 0, toplam_satis: 0, kullanim_sayisi: 0 }
  );

  return (
    <div className="space-y-6">
      {/* Genel İstatistikler */}
      {!kampanyaId && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Toplam Kullanım</span>
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {toplamIstatistikler.kullanim_sayisi}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Toplam Sipariş</span>
              <ShoppingCart className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {toplamIstatistikler.siparis_sayisi}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Toplam İndirim</span>
              <TrendingUp className="w-5 h-5 text-red-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {toplamIstatistikler.toplam_indirim.toFixed(2)} ₺
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Toplam Satış</span>
              <DollarSign className="w-5 h-5 text-orange-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {toplamIstatistikler.toplam_satis.toFixed(2)} ₺
            </p>
          </div>
        </div>
      )}

      {/* Kampanya Detay İstatistikleri */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Kampanya
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Kullanım
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Sipariş
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Toplam İndirim
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Toplam Satış
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ort. İndirim
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {istatistikler.map((stat) => {
              const ortalamaIndirim = stat.siparis_sayisi > 0 
                ? stat.toplam_indirim / stat.siparis_sayisi 
                : 0;
              
              return (
                <tr key={stat.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{stat.ad}</div>
                      <div className="text-sm text-gray-500">{stat.kod}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {stat.kullanim_sayisi}
                      {stat.kullanim_limiti && (
                        <span className="text-gray-500"> / {stat.kullanim_limiti}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {stat.siparis_sayisi}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600">
                    {stat.toplam_indirim.toFixed(2)} ₺
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                    {stat.toplam_satis.toFixed(2)} ₺
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {ortalamaIndirim.toFixed(2)} ₺
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
