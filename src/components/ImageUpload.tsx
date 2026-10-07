import { SiteImage } from './SiteImage'
import React, { useEffect, useId, useRef, useState } from 'react'
import { Clipboard, Image as ImageIcon, Link, Smartphone, Upload, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { getImageUrl } from '../utils/imageUtils'

interface ImageUploadProps {
  maxFiles?: number
  bucketName: string
  onUploadComplete: (urls: string[]) => void
  existingImages?: string[]
  accept?: string
  maxSizeMB?: number
  previewFit?: 'contain' | 'cover'
}

type UploadStatus = 'pending' | 'uploading' | 'success' | 'error'
type UploadItem = { id: string; previewUrl: string; file?: File; remoteUrl?: string; status: UploadStatus; error?: string }
const newId = () => crypto.randomUUID()
const EMPTY_IMAGES: string[] = []

export const ImageUpload: React.FC<ImageUploadProps> = ({ maxFiles = 1, bucketName, onUploadComplete, existingImages = EMPTY_IMAGES, accept = 'image/*', maxSizeMB = 8, previewFit = 'cover' }) => {
  const urlInputId = useId()
  const [items, setItems] = useState<UploadItem[]>(() => existingImages.map((remoteUrl) => ({ id: newId(), previewUrl: remoteUrl, remoteUrl, status: 'success' })))
  const [isDragging, setIsDragging] = useState(false)
  const [activeTab, setActiveTab] = useState<'device' | 'url'>('device')
  const [urlInput, setUrlInput] = useState('')
  const [addingFromUrl, setAddingFromUrl] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const lastPublishedUrls = useRef<string[]>(existingImages)

  useEffect(() => {
    if (sameUrls(existingImages, lastPublishedUrls.current)) return
    lastPublishedUrls.current = existingImages
    setItems(existingImages.map((remoteUrl) => ({ id: newId(), previewUrl: remoteUrl, remoteUrl, status: 'success' })))
  }, [existingImages])

  const completedUrls = (nextItems: UploadItem[]) => nextItems.filter((item) => item.status === 'success' && item.remoteUrl).map((item) => item.remoteUrl!)
  const updateItems = (updater: (current: UploadItem[]) => UploadItem[]) => setItems((current) => updater(current))
  const publish = (nextItems: UploadItem[]) => {
    const urls = completedUrls(nextItems)
    lastPublishedUrls.current = urls
    onUploadComplete(urls)
  }

  const addFiles = (files: File[]) => {
    const available = Math.max(0, maxFiles - items.length)
    const candidates = files.slice(0, available)
    if (candidates.length === 0) return toast.error(`Maksimum ${maxFiles} görsel yükleyebilirsiniz`)
    const valid = candidates.filter((file) => file.type.startsWith('image/') && file.size <= maxSizeMB * 1024 * 1024)
    if (valid.length !== candidates.length) toast.error(`Yalnız görsel ve en fazla ${maxSizeMB}MB dosya ekleyebilirsiniz`)
    if (files.length > available) toast.error(`Yalnız ${available} dosya daha eklenebilir`)
    updateItems((current) => [...current, ...valid.map((file) => ({ id: newId(), file, previewUrl: URL.createObjectURL(file), status: 'pending' as const }))])
  }

  const removeImage = (id: string) => {
    updateItems((current) => {
      const removed = current.find((item) => item.id === id)
      if (removed?.previewUrl.startsWith('blob:')) URL.revokeObjectURL(removed.previewUrl)
      const next = current.filter((item) => item.id !== id)
      publish(next)
      return next
    })
  }

  const handleUrlAdd = async () => {
    if (!urlInput.trim()) return toast.error('Lütfen geçerli bir URL girin')
    if (items.length >= maxFiles) return toast.error(`Maksimum ${maxFiles} görsel yükleyebilirsiniz`)
    setAddingFromUrl(true)
    try {
      const { data, error } = await supabase.functions.invoke('image-storage-upload', { body: { imageUrl: urlInput.trim(), bucketName } })
      if (error || data?.error || !data?.success || !data?.data?.publicUrl) throw error || new Error(data?.error?.message || 'Görsel yüklenemedi')
      const added: UploadItem = { id: newId(), previewUrl: data.data.publicUrl, remoteUrl: data.data.publicUrl, status: 'success' }
      updateItems((current) => { const next = [...current, added]; publish(next); return next })
      setUrlInput('')
      toast.success('Görsel başarıyla yüklendi')
    } catch (error: any) { toast.error(error.message || 'Görsel yüklenirken hata oluştu') } finally { setAddingFromUrl(false) }
  }

  const handleUpload = async () => {
    const pending = items.filter((item) => item.status === 'pending' || item.status === 'error')
    if (!pending.length) return
    for (const item of pending) {
      if (!item.file) continue
      updateItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, status: 'uploading', error: undefined } : entry))
      try {
        const imageData = await fileToBase64(item.file)
        const { data, error } = await supabase.functions.invoke('image-storage-upload', { body: { imageData, bucketName, fileName: item.file.name } })
        if (error || data?.error || !data?.success || !data?.data?.publicUrl) throw error || new Error(data?.error?.message || 'Görsel yüklenemedi')
        if (item.previewUrl.startsWith('blob:')) URL.revokeObjectURL(item.previewUrl)
        updateItems((current) => {
          const next = current.map((entry) => entry.id === item.id ? { ...entry, remoteUrl: data.data.publicUrl, previewUrl: data.data.publicUrl, status: 'success' as const } : entry)
          publish(next); return next
        })
      } catch (error: any) {
        updateItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, status: 'error', error: error.message || 'Yükleme başarısız' } : entry))
      }
    }
  }

  const pendingCount = items.filter((item) => item.status === 'pending' || item.status === 'error').length
  const successCount = items.filter((item) => item.status === 'success').length
  const uploading = items.some((item) => item.status === 'uploading')

  return <div className="space-y-4">
    <div className="flex rounded-lg bg-gray-100 p-1" role="tablist" aria-label="Görsel ekleme yöntemi">
      <button type="button" role="tab" aria-selected={activeTab === 'device'} onClick={() => setActiveTab('device')} className={`flex min-h-10 flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 font-medium ${activeTab === 'device' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-600'}`}><Smartphone className="h-4 w-4" />Cihazdan Seç</button>
      <button type="button" role="tab" aria-selected={activeTab === 'url'} onClick={() => setActiveTab('url')} className={`flex min-h-10 flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 font-medium ${activeTab === 'url' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-600'}`}><Link className="h-4 w-4" />Link ile Ekle</button>
    </div>
    {activeTab === 'device' && <div onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }} onDragLeave={() => setIsDragging(false)} onDrop={(e) => { e.preventDefault(); setIsDragging(false); addFiles(Array.from(e.dataTransfer.files)) }} onClick={() => items.length < maxFiles && fileInputRef.current?.click()} className={`rounded-lg border-2 border-dashed p-6 text-center ${isDragging ? 'border-orange-500 bg-orange-50' : 'border-gray-300'} ${items.length >= maxFiles ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
      <input ref={fileInputRef} type="file" accept={accept} multiple={maxFiles > 1} onChange={(e) => { if (e.target.files) addFiles(Array.from(e.target.files)); e.target.value = '' }} className="sr-only" disabled={items.length >= maxFiles} />
      <Upload className="mx-auto mb-3 h-10 w-10 text-gray-400" /><p className="text-gray-700">Dosyaları sürükleyin veya seçmek için tıklayın</p><p className="mt-1 text-sm text-gray-500">En fazla {maxFiles} görsel, her biri {maxSizeMB}MB</p>
    </div>}
    {activeTab === 'url' && <div className="space-y-2"><label htmlFor={urlInputId} className="text-sm font-medium text-gray-700">Görsel URL’si</label><div className="flex flex-col gap-2 sm:flex-row"><input id={urlInputId} type="url" value={urlInput} onChange={(e) => setUrlInput(e.target.value)} placeholder="https://..." className="min-w-0 flex-1 rounded-lg border px-3 py-2" disabled={addingFromUrl} /><button type="button" onClick={async () => { try { setUrlInput((await navigator.clipboard.readText()).trim()) } catch { toast.error('URL’yi manuel girin') } }} className="min-h-10 rounded-lg bg-gray-600 px-3 text-white"><Clipboard className="h-4 w-4" aria-hidden="true" /><span className="sr-only">Panodan URL yapıştır</span></button><button type="button" onClick={handleUrlAdd} disabled={addingFromUrl || !urlInput.trim() || items.length >= maxFiles} className="min-h-10 rounded-lg bg-brand px-4 text-white disabled:bg-gray-400">{addingFromUrl ? 'Ekleniyor...' : 'Ekle'}</button></div></div>}
    {items.length > 0 && <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">{items.map((item, index) => <div key={item.id} className="relative min-w-0"><SiteImage variant="thumb" src={getImageUrl(item.previewUrl)} alt={`Görsel önizleme ${index + 1}`} className={`h-28 w-full rounded-lg border-2 ${previewFit === 'contain' ? 'object-contain' : 'object-cover'}`} /><button type="button" onClick={() => removeImage(item.id)} className="absolute right-2 top-2 flex min-h-10 min-w-10 items-center justify-center rounded-full bg-red-600 text-white shadow" aria-label={`Görsel ${index + 1} sil`}><X className="h-4 w-4" /></button><p className={`mt-1 break-words text-xs ${item.status === 'error' ? 'text-red-600' : 'text-gray-600'}`}>{item.status === 'success' ? 'Yüklendi' : item.status === 'uploading' ? 'Yükleniyor...' : item.status === 'error' ? item.error : 'Yükleme bekliyor'}</p></div>)}</div>}
    {pendingCount > 0 && <button type="button" onClick={handleUpload} disabled={uploading} className="flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-brand py-2 text-white disabled:bg-gray-400"><ImageIcon className="h-5 w-5" />{uploading ? 'Yükleniyor...' : `${pendingCount} görseli ${items.some((item) => item.status === 'error') ? 'yeniden ' : ''}yükle`}</button>}
    <p className="text-center text-xs text-gray-500" aria-live="polite">{successCount}/{items.length} başarılı · {items.length}/{maxFiles} görsel seçildi</p>
  </div>
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result as string); reader.onerror = () => reject(new Error('Dosya okunamadı')); reader.readAsDataURL(file) })
}

function sameUrls(left: string[], right: string[]) {
  return left.length === right.length && left.every((url, index) => url === right[index])
}
