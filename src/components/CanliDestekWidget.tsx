import { useState, useEffect, useRef } from 'react'
import { MessageCircle, X, Send, Minimize2 } from 'lucide-react'

export default function CanliDestekWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [messages, setMessages] = useState<Array<{ text: string; isUser: boolean; time: string }>>([
    {
      text: 'Merhaba! Efsane Baharat\'a hoş geldiniz. Size nasıl yardımcı olabilirim?',
      isUser: false,
      time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
    }
  ])
  const [inputMessage, setInputMessage] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputMessage.trim()) return

    const newMessage = {
      text: inputMessage,
      isUser: true,
      time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
    }

    setMessages([...messages, newMessage])
    setInputMessage('')

    // Otomatik yanıt simülasyonu
    setTimeout(() => {
      const autoReply = {
        text: 'Mesajınız alındı. Müşteri temsilcimiz en kısa sürede size dönüş yapacaktır.',
        isUser: false,
        time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
      }
      setMessages(prev => [...prev, autoReply])
    }, 1000)
  }

  return (
    <>
      {/* Chat Butonu */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 z-50 group"
          aria-label="Canlı Destek"
        >
          <MessageCircle className="w-6 h-6" />
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
          <span className="absolute bottom-full right-0 mb-2 px-3 py-1 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            Canlı Destek
          </span>
        </button>
      )}

      {/* Chat Penceresi */}
      {isOpen && (
        <div
          className={`fixed bottom-6 right-6 w-96 bg-white rounded-lg shadow-2xl z-50 flex flex-col transition-all duration-300 ${
            isMinimized ? 'h-14' : 'h-[500px]'
          }`}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-orange-500 to-red-600 text-white p-4 rounded-t-lg flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                  <MessageCircle className="w-6 h-6 text-orange-600" />
                </div>
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></span>
              </div>
              <div>
                <h3 className="font-semibold">Canlı Destek</h3>
                <p className="text-xs text-orange-100">Çevrimiçi</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="hover:bg-white/20 rounded p-1 transition"
                aria-label="Küçült"
              >
                <Minimize2 className="w-5 h-5" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="hover:bg-white/20 rounded p-1 transition"
                aria-label="Kapat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messages */}
          {!isMinimized && (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        message.isUser
                          ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white'
                          : 'bg-white text-gray-900 shadow-sm'
                      }`}
                    >
                      <p className="text-sm">{message.text}</p>
                      <p
                        className={`text-xs mt-1 ${
                          message.isUser ? 'text-orange-100' : 'text-gray-500'
                        }`}
                      >
                        {message.time}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <form onSubmit={handleSendMessage} className="p-4 bg-white border-t">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Mesajınızı yazın..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <button
                    type="submit"
                    disabled={!inputMessage.trim()}
                    className="bg-gradient-to-r from-orange-500 to-red-600 text-white p-2 rounded-lg hover:shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Gönder"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      )}
    </>
  )
}
