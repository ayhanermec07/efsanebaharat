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
  X
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

export default function CanliDestek() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [otomatikMesajlar, setOtomatikMesajlar] = useState<OtomatikMesaj[]>([])
  const [editingMesaj, setEditingMesaj] = useState<OtomatikMesaj | null>(null)
  const [loading, setLoading] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadConversations()
    loadOtomatikMesajlar()
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
      // Supabase'den konuşmaları çek
      // Not: Canlı destek tabloları henüz oluşturulmadı
      setConversations([])
      
      // Gerçek implementasyon:
      // const { data, error } = await supabase
      //   .from('canli_destek_konusmalar')
      //   .select('*')
      //   .order('son_mesaj_zamani', { ascending: false })
      // 
      // if (error) throw error
      // setConversations(data || [])
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
      // Supabase'den mesajları çek
      setMessages([])
      
      // Gerçek implementasyon:
      // const { data, error } = await supabase
      //   .from('canli_destek_mesajlar')
      //   .select('*')
      //   .eq('konusma_id', conversationId)
      //   .order('olusturma_tarihi', { ascending: true })
      // 
      // if (error) throw error
      // setMessages(data || [])
    } catch (error) {
      console.error('Mesajlar yüklenemedi:', error)
      toast.error('Mesajlar yüklenemedi')
      setMessages([])
    }
  }

  async function loadOtomatikMesajlar() {
    try {
      // Supabase'den otomatik mesajları çek
      setOtomatikMesajlar([])
      
      // Gerçek implementasyon:
      // const { data, error } = await supabase
      //   .from('canli_destek_otomatik_mesajlar')
      //   .select('*')
      //   .order('baslik', { ascending: true })
      // 
      // if (error) throw error
      // setOtomatikMesajlar(data || [])
    } catch (error) {
      console.error('Otomatik mesajlar yüklenemedi:', error)
      setOtomatikMesajlar([])
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
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
            showSettings
              ? 'bg-orange-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50 border'
          }`}
        >
          <Settings className="w-5 h-5" />
          Otomatik Mesajlar
        </button>
      </div>

      {showSettings ? (
        /* Otomatik Mesajlar Ayarları */
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Otomatik Mesajlar</h2>
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
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border-2 border-orange-200">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Başlık
                  </label>
                  <input
                    type="text"
                    value={editingMesaj.baslik}
                    onChange={(e) => setEditingMesaj({ ...editingMesaj, baslik: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Mesaj başlığı"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mesaj İçeriği
                  </label>
                  <textarea
                    value={editingMesaj.mesaj}
                    onChange={(e) => setEditingMesaj({ ...editingMesaj, mesaj: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Otomatik mesaj içeriği"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tetikleyici
                  </label>
                  <select
                    value={editingMesaj.tetikleyici}
                    onChange={(e) => setEditingMesaj({ ...editingMesaj, tetikleyici: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="konusma_baslangic">Konuşma Başlangıcı</option>
                    <option value="mesai_disi">Mesai Dışı Saatler</option>
                    <option value="siparis_sorgusu">Sipariş Sorgusu</option>
                    <option value="urun_sorgusu">Ürün Sorgusu</option>
                  </select>
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editingMesaj.aktif}
                      onChange={(e) => setEditingMesaj({ ...editingMesaj, aktif: e.target.checked })}
                      className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                    />
                    <span className="text-sm text-gray-700">Aktif</span>
                  </label>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveOtomatikMesaj}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                  >
                    <Save className="w-4 h-4" />
                    Kaydet
                  </button>
                  <button
                    onClick={() => setEditingMesaj(null)}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                  >
                    <X className="w-4 h-4" />
                    İptal
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {otomatikMesajlar.map((mesaj) => (
              <div
                key={mesaj.id}
                className="p-4 bg-white border rounded-lg hover:shadow-md transition"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900">{mesaj.baslik}</h3>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        mesaj.aktif
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {mesaj.aktif ? 'Aktif' : 'Pasif'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{mesaj.mesaj}</p>
                    <p className="text-xs text-gray-500">
                      Tetikleyici: <span className="font-medium">{mesaj.tetikleyici}</span>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingMesaj(mesaj)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteOtomatikMesaj(mesaj.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
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
              {filteredConversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv.id)}
                  className={`w-full p-4 border-b hover:bg-gray-50 transition text-left ${
                    selectedConversation === conv.id ? 'bg-orange-50 border-l-4 border-l-orange-600' : ''
                  }`}
                >
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
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      conv.durum === 'aktif' ? 'bg-green-100 text-green-700' :
                      conv.durum === 'beklemede' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {conv.durum === 'aktif' ? 'Aktif' : conv.durum === 'beklemede' ? 'Beklemede' : 'Kapalı'}
                    </span>
                  </div>
                </button>
              ))}
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
                  <span className={`px-3 py-1 rounded-full text-sm ${
                    selectedConv.durum === 'aktif' ? 'bg-green-100 text-green-700' :
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
                        className={`max-w-[70%] rounded-lg p-3 ${
                          message.gonderen === 'admin'
                            ? 'bg-orange-600 text-white'
                            : 'bg-white text-gray-900 shadow-sm'
                        }`}
                      >
                        <p className="text-sm">{message.mesaj}</p>
                        <div className="flex items-center justify-between gap-2 mt-1">
                          <p className={`text-xs ${
                            message.gonderen === 'admin' ? 'text-orange-100' : 'text-gray-500'
                          }`}>
                            {new Date(message.olusturma_tarihi).toLocaleTimeString('tr-TR', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                          {message.gonderen === 'admin' && (
                            <CheckCheck className={`w-4 h-4 ${
                              message.okundu ? 'text-blue-300' : 'text-orange-200'
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
