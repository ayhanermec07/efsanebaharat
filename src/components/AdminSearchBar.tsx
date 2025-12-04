import { useState, useEffect } from 'react'
import { Search, X } from 'lucide-react'

interface AdminSearchBarProps {
  placeholder?: string
  onSearch: (query: string) => void
  onClear?: () => void
  suggestions?: string[]
}

export default function AdminSearchBar({
  placeholder = 'Ara...',
  onSearch,
  onClear,
  suggestions = []
}: AdminSearchBarProps) {
  const [query, setQuery] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([])

  useEffect(() => {
    if (query.trim()) {
      const filtered = suggestions.filter(s =>
        s.toLowerCase().includes(query.toLowerCase())
      )
      setFilteredSuggestions(filtered)
      setShowSuggestions(filtered.length > 0)
    } else {
      setFilteredSuggestions([])
      setShowSuggestions(false)
    }
  }, [query, suggestions])

  const handleSearch = (searchQuery: string) => {
    setQuery(searchQuery)
    onSearch(searchQuery)
    setShowSuggestions(false)
  }

  const handleClear = () => {
    setQuery('')
    setShowSuggestions(false)
    onClear?.()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch(query)
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto mb-8">
      <div className="relative">
        {/* Ana Arama Çubuğu */}
        <div className="flex items-center bg-white rounded-full shadow-lg hover:shadow-xl transition-shadow border border-gray-200">
          <Search className="w-5 h-5 text-gray-400 ml-4" />
          
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => query && setShowSuggestions(true)}
            placeholder={placeholder}
            className="flex-1 px-4 py-3 outline-none text-gray-900 placeholder-gray-500 bg-transparent"
          />

          {query && (
            <button
              onClick={handleClear}
              className="pr-4 text-gray-400 hover:text-gray-600 transition"
              title="Temizle"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          <button
            onClick={() => handleSearch(query)}
            className="px-6 py-3 bg-orange-600 text-white rounded-full hover:bg-orange-700 transition font-medium"
          >
            Ara
          </button>
        </div>

        {/* Öneriler Dropdown */}
        {showSuggestions && filteredSuggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
            <div className="max-h-64 overflow-y-auto">
              {filteredSuggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSearch(suggestion)}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 transition border-b last:border-b-0 flex items-center space-x-3"
                >
                  <Search className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-700">{suggestion}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Arama İpuçları */}
      {!query && (
        <div className="mt-4 text-center text-sm text-gray-500">
          <p>💡 İpucu: Ad, telefon, email veya diğer bilgilerle arayabilirsiniz</p>
        </div>
      )}
    </div>
  )
}
