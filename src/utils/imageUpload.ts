import { supabase } from '../lib/supabase'

export const uploadImage = async (file: File, bucket = 'urun-gorselleri'): Promise<string | null> => {
    if (file.size > 8 * 1024 * 1024) return null
    try {
        const imageData = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(String(reader.result))
            reader.onerror = () => reject(new Error('Görsel okunamadı'))
            reader.readAsDataURL(file)
        })
        const { data, error } = await supabase.functions.invoke('image-storage-upload', {
            body: { imageData, bucketName: bucket, fileName: file.name },
        })
        if (error || !data?.success || !data?.data?.publicUrl) return null
        return data.data.publicUrl
    } catch { return null }
}
