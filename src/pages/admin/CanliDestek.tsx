import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import {
  MessageCircle,
  Send,
  Search,
  Settings,
  Clock,
  User,
  CheckCheck,
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  Phone,
  QrCode
} from 'lucide-react'
import toast from 'react-hot-toast'

interface Conversation {
  id: string
  musteri_adi: string
  musteri_email: string
  son_mesaj: string
  son_mesaj_zamani: string
  okunmamis_sayisi: number
  durum: 'aktif' | 'beklemede' | 'kapali'
}

interface Message {
  id: string
  konusma_id: string
  mesaj: string
  gonderen: 'musteri' | 'admin'
  olusturma_tarihi: string
  okundu: boolean
}

interface OtomatikMesaj {
  id: string
  baslik: string
  mesaj: string
  tetikleyici: string
  aktif: boolean
}

interface WhatsappNumber {
  id: string
  phone_number: string
  name: string
  is_active: boolean
  created_at: string
}

export default function CanliDestek() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showSettings, setShowSettings] = useState(false)

  // Settings Tabs
  const [activeTab, setActiveTab] = useState<'otomatik' | 'whatsapp'>('otomatik')

  // Otomatik Mesaj States
  const [otomatikMesajlar, setOtomatikMesajlar] = useState<OtomatikMesaj[]>([])
  const [editingMesaj, setEditingMesaj] = useState<OtomatikMesaj | null>(null)

  // WhatsApp States
  const [whatsappNumbers, setWhatsappNumbers] = useState<WhatsappNumber[]>([])
  const [newWhatsappNumber, setNewWhatsappNumber] = useState('')
  const [newWhatsappName, setNewWhatsappName] = useState('')
  const [whatsappLoading, setWhatsappLoading] = useState(false)

  const [loading, setLoading] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadConversations()
    loadOtomatikMesajlar()
    loadWhatsappNumbers()
  }, [])

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation)
    }
  }, [selectedConversation])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  async function loadConversations() {
    try {
      // Supabase'den konuşmaları çek (Mock)
      setConversations([])
    } catch (error) {
      console.error('Konuşmalar yüklenemedi:', error)
      toast.error('Konuşmalar yüklenemedi')
      setConversations([])
    } finally {
      setLoading(false)
    }
  }

  async function loadMessages(conversationId: string) {
    try {
      setMessages([])
    } catch (error) {
      console.error('Mesajlar yüklenemedi:', error)
      toast.error('Mesajlar yüklenemedi')
      setMessages([])
    }
  }

  async function loadOtomatikMesajlar() {
    try {
      // Supabase'den otomatik mesajları çek (Mock)
      setOtomatikMesajlar([])
    } catch (error) {
      console.error('Otomatik mesajlar yüklenemedi:', error)
      setOtomatikMesajlar([])
    }
  }

  async function loadWhatsappNumbers() {
    try {
      const { data, error } = await supabase
        .from('whatsapp_numbers')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setWhatsappNumbers(data || [])
    } catch (error) {
      console.error('WhatsApp numaraları yüklenemedi:', error)
      toast.error('WhatsApp numaraları yüklenemedi')
    }
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!newMessage.trim() || !selectedConversation) return

    const message: Message = {
      id: Date.now().toString(),
      konusma_id: selectedConversation,
      mesaj: newMessage,
      gonderen: 'admin',
      olusturma_tarihi: new Date().toISOString(),
      okundu: false
    }

    setMessages([...messages, message])
    setNewMessage('')
    toast.success('Mesaj gönderildi')
  }

  async function handleSaveOtomatikMesaj() {
    if (!editingMesaj) return

    if (editingMesaj.id === 'new') {
      setOtomatikMesajlar([...otomatikMesajlar, { ...editingMesaj, id: Date.now().toString() }])
      toast.success('Otomatik mesaj eklendi')
    } else {
      setOtomatikMesajlar(otomatikMesajlar.map(m => m.id === editingMesaj.id ? editingMesaj : m))
      toast.success('Otomatik mesaj güncellendi')
    }
    setEditingMesaj(null)
  }

  async function handleDeleteOtomatikMesaj(id: string) {
    if (confirm('Bu otomatik mesajı silmek istediğinizden emin misiniz?')) {
      setOtomatikMesajlar(otomatikMesajlar.filter(m => m.id !== id))
      toast.success('Otomatik mesaj silindi')
    }
  }

  async function handleAddWhatsappNumber(e: React.FormEvent) {
    e.preventDefault()
    if (!newWhatsappNumber.trim()) return

    setWhatsappLoading(true)
    try {
      const { error } = await supabase
        .from('whatsapp_numbers')
        .insert({
          phone_number: newWhatsappNumber,
          name: newWhatsappName || 'WhatsApp Destek',
          is_active: whatsappNumbers.length === 0 // İlk numara ise aktif yap
        })

      if (error) throw error

      toast.success('Numara eklendi')
      setNewWhatsappNumber('')
      setNewWhatsappName('')
      loadWhatsappNumbers()
    } catch (error) {
      console.error(error)
      toast.error('Numara eklenemedi')
    } finally {
      setWhatsappLoading(false)
    }
  }

  async function handleToggleWhatsapp(id: string, currentStatus: boolean) {
    try {
      // Eğer zaten aktifse ve kapatıyorsak, basit update.
      // Eğer aktif yapıyorsak, trigger diğerlerini kapatacak.

      const { error } = await supabase
        .from('whatsapp_numbers')
        .update({ is_active: !currentStatus })
        .eq('id', id)

      if (error) throw error

      toast.success('Durum güncellendi')
      loadWhatsappNumbers() // Listeyi yenile ki trigger sonucu diğerlerinin kapandığını görelim
    } catch (error) {
      console.error(error)
      toast.error('Güncelleme başarısız')
    }
  }

  async function handleDeleteWhatsapp(id: string) {
    if (!confirm('Bu numarayı silmek istediğinizden emin misiniz?')) return

    try {
      const { error } = await supabase
        .from('whatsapp_numbers')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast.success('Numara silindi')
      loadWhatsappNumbers()
    } catch (error) {
      console.error(error)
      toast.error('Silme işlemi başarısız')
    }
  }

  const filteredConversations = conversations.filter(conv =>
    conv.musteri_adi.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.musteri_email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const selectedConv = conversations.find(c => c.id === selectedConversation)

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = Math.floor(diff / 3600000)

    if (hours < 1) return 'Az önce'
    if (hours < 24) return `${hours} saat önce`
    return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Canlı Destek</h1>
          <p className="text-gray-600 mt-2">Müşterilerinizle anlık iletişim kurun</p>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${showSettings
              ? 'bg-orange-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50 border'
            }`}
        >
          <Settings className="w-5 h-5" />
          Ayarlar
        </button>
      </div>

      {showSettings ? (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {/* Settings Tabs */}
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('otomatik')}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition ${activeTab === 'otomatik'
                ? 'border-b-2 border-orange-500 text-orange-600 bg-orange-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
            >
              <MessageCircle className="w-4 h-4" />
              Otomatik Mesajlar
            </button>
            <button
              onClick={() => setActiveTab('whatsapp')}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition ${activeTab === 'whatsapp'
                ? 'border-b-2 border-orange-500 text-orange-600 bg-orange-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
            >
              <QrCode className="w-4 h-4" />
              WhatsApp & QR
            </button>
          </div>

          <div className="p-6">
            {activeTab === 'otomatik' && (
              /* Otomatik Mesajlar İçeriği */
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900">Otomatik Yanıtlar</h2>
                  <button
                    onClick={() => setEditingMesaj({
                      id: 'new',
                      baslik: '',
                      mesaj: '',
                      tetikleyici: 'konusma_baslangic',
                      aktif: true
                    })}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition"
                  >
                    <Plus className="w-5 h-5" />
                    Yeni Mesaj
                  </button>
                </div>

                {editingMesaj && (
                  <div className="p-4 bg-gray-50 rounded-lg border-2 border-orange-200">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Başlık</label>
                        <input
                          type="text"
                          value={editingMesaj.baslik}
                          onChange={(e) => setEditingMesaj({ ...editingMesaj, baslik: e.target.value })}
                          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          placeholder="Örn: Karşılama Mesajı"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Mesaj</label>
                        <textarea
                          value={editingMesaj.mesaj}
                          onChange={(e) => setEditingMesaj({ ...editingMesaj, mesaj: e.target.value })}
                          rows={3}
                          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          placeholder="Müşteriye gönderilecek mesaj..."
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Tetikleyici</label>
                        <select
                          value={editingMesaj.tetikleyici}
                          onChange={(e) => setEditingMesaj({ ...editingMesaj, tetikleyici: e.target.value })}
                          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        >
                          <option value="konusma_baslangic">Konuşma Başlangıcı</option>
                          <option value="mesai_disi">Mesai Dışı Saatler</option>
                          <option value="siparis_sorgusu">Sipariş Sorgusu</option>
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={editingMesaj.aktif}
                          onChange={(e) => setEditingMesaj({ ...editingMesaj, aktif: e.target.checked })}
                          className="w-4 h-4 text-orange-600 rounded"
                        />
                        <label className="text-sm text-gray-700">Aktif</label>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleSaveOtomatikMesaj}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                        >
                          Kaydet
                        </button>
                        <button
                          onClick={() => setEditingMesaj(null)}
                          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                        >
                          İptal
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  {otomatikMesajlar.map((mesaj) => (
                    <div key={mesaj.id} className="p-4 bg-white border rounded-lg flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">{mesaj.baslik}</h3>
                        <p className="text-sm text-gray-600">{mesaj.mesaj}</p>
                        <div className="mt-1 flex gap-2 text-xs">
                          <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-600">
                            {mesaj.tetikleyici === 'konusma_baslangic' ? 'Konuşma Başlangıcı' :
                              mesaj.tetikleyici === 'mesai_disi' ? 'Mesai Dışı' : 'Sipariş'}
                          </span>
                          {mesaj.aktif ? (
                            <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded">Aktif</span>
                          ) : (
                            <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded">Pasif</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setEditingMesaj(mesaj)} className="p-2 text-blue-600 hover:bg-blue-50 rounded">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteOtomatikMesaj(mesaj.id)} className="p-2 text-red-600 hover:bg-red-50 rounded">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'whatsapp' && (
              <div className="space-y-8">
                <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
                  <div className="flex">
                    <QrCode className="h-5 w-5 text-blue-500 mr-3" />
                    <div>
                      <p className="text-sm text-blue-700 font-medium">WhatsApp QR Kodu</p>
                      <p className="text-sm text-blue-600 mt-1">
                        Buraya eklediğiniz numaralardan "Aktif" olanı, sitenizdeki canlı destek penceresinde QR kod olarak gösterilecektir.
                        Yalnızca bir numara aynı anda aktif olabilir.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Yeni Numara Formu */}
                <div className="bg-gray-50 p-6 rounded-lg border">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Yeni Numara Ekle</h3>
                  <form onSubmit={handleAddWhatsappNumber} className="flex gap-4 items-end">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Başlık (Opsiyonel)</label>
                      <input
                        type="text"
                        value={newWhatsappName}
                        onChange={(e) => setNewWhatsappName(e.target.value)}
                        placeholder="Örn: Müşteri Hizmetleri"
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Telefon Numarası</label>
                      <input
                        type="text"
                        value={newWhatsappNumber}
                        onChange={(e) => setNewWhatsappNumber(e.target.value)}
                        placeholder="905xxxxxxxxx"
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={whatsappLoading}
                      className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Ekle
                    </button>
                  </form>
                </div>

                {/* Numara Listesi */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Kayıtlı Numaralar</h3>
                  <div className="space-y-3">
                    {whatsappNumbers.length === 0 ? (
                      <p className="text-gray-500 text-center py-4 bg-white border border-dashed rounded-lg">
                        Henüz kayıtlı WhatsApp numarası yok.
                      </p>
                    ) : (
                      whatsappNumbers.map((wp) => (
                        <div key={wp.id} className={`flex items-center justify-between p-4 border rounded-lg ${wp.is_active ? 'bg-green-50 border-green-200' : 'bg-white'}`}>
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${wp.is_active ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                              <Phone className="w-5 h-5" />
                            </div>
                            <div>
                              <h4 className="font-medium text-gray-900">{wp.name}</h4>
                              <p className="text-sm text-gray-500 font-mono">{wp.phone_number}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <span className={`text-sm ${wp.is_active ? 'text-green-700 font-medium' : 'text-gray-500'}`}>
                                {wp.is_active ? 'Aktif' : 'Pasif'}
                              </span>
                              <button
                                onClick={() => handleToggleWhatsapp(wp.id, wp.is_active)}
                                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${wp.is_active ? 'bg-green-600' : 'bg-gray-200'}`}
                              >
                                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${wp.is_active ? 'translate-x-5' : 'translate-x-0'}`} />
                              </button>
                            </div>
                            <button
                              onClick={() => handleDeleteWhatsapp(wp.id)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Canlı Destek Ana Ekran */
        <div className="grid grid-cols-12 gap-6 h-[calc(100vh-250px)]">
          {/* Konuşma Listesi */}
          <div className="col-span-4 bg-white rounded-lg shadow-sm flex flex-col">
            <div className="p-4 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Müşteri ara..."
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {filteredConversations.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  Konuşma bulunamadı.
                </div>
              ) : (
                filteredConversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConversation(conv.id)}
                    className={`w-full p-4 border-b hover:bg-gray-50 transition text-left ${selectedConversation === conv.id ? 'bg-orange-50 border-l-4 border-l-orange-600' : ''
                      }`}
                  >
                    {/* Existing list item code */}
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-orange-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{conv.musteri_adi}</h3>
                          <p className="text-xs text-gray-500">{conv.musteri_email}</p>
                        </div>
                      </div>
                      {conv.okunmamis_sayisi > 0 && (
                        <span className="bg-orange-600 text-white text-xs px-2 py-1 rounded-full">
                          {conv.okunmamis_sayisi}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 truncate mb-1">{conv.son_mesaj}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTime(conv.son_mesaj_zamani)}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full ${conv.durum === 'aktif' ? 'bg-green-100 text-green-700' :
                          conv.durum === 'beklemede' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-600'
                        }`}>
                        {conv.durum === 'aktif' ? 'Aktif' : conv.durum === 'beklemede' ? 'Beklemede' : 'Kapalı'}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Mesaj Alanı */}
          <div className="col-span-8 bg-white rounded-lg shadow-sm flex flex-col">
            {selectedConv ? (
              <>
                {/* Konuşma Header */}
                <div className="p-4 border-b flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-orange-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{selectedConv.musteri_adi}</h3>
                      <p className="text-sm text-gray-500">{selectedConv.musteri_email}</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm ${selectedConv.durum === 'aktif' ? 'bg-green-100 text-green-700' :
                      selectedConv.durum === 'beklemede' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-600'
                    }`}>
                    {selectedConv.durum === 'aktif' ? 'Aktif' : selectedConv.durum === 'beklemede' ? 'Beklemede' : 'Kapalı'}
                  </span>
                </div>

                {/* Mesajlar */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.gonderen === 'admin' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg p-3 ${message.gonderen === 'admin'
                            ? 'bg-orange-600 text-white'
                            : 'bg-white text-gray-900 shadow-sm'
                          }`}
                      >
                        <p className="text-sm">{message.mesaj}</p>
                        <div className="flex items-center justify-between gap-2 mt-1">
                          <p className={`text-xs ${message.gonderen === 'admin' ? 'text-orange-100' : 'text-gray-500'
                            }`}>
                            {new Date(message.olusturma_tarihi).toLocaleTimeString('tr-TR', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                          {message.gonderen === 'admin' && (
                            <CheckCheck className={`w-4 h-4 ${message.okundu ? 'text-blue-300' : 'text-orange-200'
                              }`} />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Mesaj Gönderme */}
                <form onSubmit={handleSendMessage} className="p-4 border-t bg-white">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Mesajınızı yazın..."
                      className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                    <button
                      type="submit"
                      disabled={!newMessage.trim()}
                      className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <Send className="w-5 h-5" />
                      Gönder
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <MessageCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">Konuşma Seçin</p>
                  <p className="text-sm">Müşteri ile sohbet başlatmak için sol taraftan bir konuşma seçin</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
