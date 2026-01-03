-- Add scope columns to campaigns table
ALTER TABLE kampanyalar 
ADD COLUMN IF NOT EXISTS kapsam text DEFAULT 'tum_urunler' CHECK (kapsam IN ('tum_urunler', 'kategori', 'marka', 'secili_urunler')),
ADD COLUMN IF NOT EXISTS kategori_id uuid REFERENCES kategoriler(id),
ADD COLUMN IF NOT EXISTS marka_id uuid REFERENCES markalar(id);

-- Create table for selected products in campaigns
CREATE TABLE IF NOT EXISTS kampanya_urunler (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    kampanya_id uuid REFERENCES kampanyalar(id) ON DELETE CASCADE,
    urun_id uuid REFERENCES urunler(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),
    UNIQUE(kampanya_id, urun_id)
);

-- Add RLS policies for kampanya_urunler
ALTER TABLE kampanya_urunler ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Public read access" ON kampanya_urunler
    FOR SELECT USING (true);

-- Allow admin full access
CREATE POLICY "Admin full access" ON kampanya_urunler
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE id = auth.uid()
        )
    );
