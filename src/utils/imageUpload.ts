import { supabase } from '../lib/supabase'

export const uploadImage = async (file: File, bucket = 'urun-gorselleri'): Promise<string | null> => {
    try {
        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}_${Math.random()}.${fileExt}`
        const filePath = `${fileName}`

        const { error: uploadError } = await supabase.storage
            .from(bucket)
            .upload(filePath, file)

        if (uploadError) {
            throw uploadError
        }

        const { data } = supabase.storage
            .from(bucket)
            .getPublicUrl(filePath)

        return data.publicUrl
    } catch (error) {
        console.error('Görsel yükleme hatası:', error)
        return null
    }
}
