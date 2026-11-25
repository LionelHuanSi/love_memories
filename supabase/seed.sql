-- ============================================================================
-- MEMORIES: Dữ liệu mẫu (mock data) — một cặp đôi hư cấu
-- Ảnh nằm trong public/demo/couple/ (ảnh CC0 từ Wikimedia Commons)
-- Chạy sau khi đã áp dụng các migration trong supabase/migrations/.
-- ============================================================================

-- 1. Space
INSERT INTO public.spaces (id, slug, public_title, tagline, relationship_start_date, show_day_counter, theme)
VALUES (
  'a0000000-0000-0000-0000-000000000001', 'our-universe', 'Our Little Universe',
  'A constellation of our unforgettable moments',
  '2024-02-14', true,
  jsonb_build_object('accentColor', '#A78BFA', 'coupleNames', 'Minh ♡ Lan', 'musicUrl', null)
)
ON CONFLICT (slug) DO UPDATE SET
  public_title = EXCLUDED.public_title,
  tagline = EXCLUDED.tagline,
  relationship_start_date = EXCLUDED.relationship_start_date,
  show_day_counter = EXCLUDED.show_day_counter,
  theme = EXCLUDED.theme;

-- 2. Memories
-- space_id lấy theo slug, để chạy được cả khi space đã được tạo bởi scripts/bootstrap.mjs (id ngẫu nhiên)
INSERT INTO public.memories (id, space_id, slug, title, description, event_date, location_label, type, visibility, is_archived)
VALUES
  ('c1000000-0000-0000-0000-000000000001', (SELECT id FROM public.spaces WHERE slug = 'our-universe'), 'lan-dau-gap-nhau', 'Lần đầu gặp nhau', 'Một quán cà phê nhỏ, hai ly latte và cuộc trò chuyện kéo dài đến lúc quán đóng cửa.', '2023-11-04', 'The Little Café, Hà Nội', 'date', 'published', false),
  ('c1000000-0000-0000-0000-000000000002', (SELECT id FROM public.spaces WHERE slug = 'our-universe'), 'buoi-hen-duoi-mua', 'Buổi hẹn dưới mưa', 'Trời đổ mưa đúng lúc ra về, hai đứa chung một chiếc ô và cố tình đi thật chậm.', '2023-12-16', 'Phố cổ Hà Nội', 'date', 'published', false),
  ('c1000000-0000-0000-0000-000000000003', (SELECT id FROM public.spaces WHERE slug = 'our-universe'), 'lan-dau-nam-tay', 'Lần đầu nắm tay', 'Không ai nói gì, chỉ là bàn tay tự tìm thấy nhau trên đường đi dạo.', '2024-01-20', 'Hồ Gươm', 'everyday', 'published', false),
  ('c1000000-0000-0000-0000-000000000004', (SELECT id FROM public.spaces WHERE slug = 'our-universe'), 'ngay-chinh-thuc-yeu-nhau', 'Ngày chính thức yêu nhau', 'Pháo hoa que, một lời tỏ tình hơi run và một cái gật đầu.', '2024-02-14', 'Sân thượng nhà Lan', 'milestone', 'published', false),
  ('c1000000-0000-0000-0000-000000000005', (SELECT id FROM public.spaces WHERE slug = 'our-universe'), 'picnic-cuoi-tuan', 'Picnic cuối tuần', 'Một tấm thảm, ít bánh mì và cả buổi chiều nằm nhìn mây trôi.', '2024-04-07', 'Công viên Thống Nhất', 'everyday', 'published', false),
  ('c1000000-0000-0000-0000-000000000006', (SELECT id FROM public.spaces WHERE slug = 'our-universe'), 'chuyen-di-bien-dau-tien', 'Chuyến đi biển đầu tiên', 'Ngắm hoàng hôn trên bãi cát, chụp mãi không ra một tấm ảnh nghiêm túc.', '2024-06-22', 'Đà Nẵng', 'trip', 'published', false),
  ('c1000000-0000-0000-0000-000000000007', (SELECT id FROM public.spaces WHERE slug = 'our-universe'), 'mua-thu-di-dao', 'Mùa thu đi dạo', 'Lá vàng rơi đầy đường, hai đứa quàng chung một chiếc khăn.', '2024-10-12', 'Đà Lạt', 'trip', 'published', false),
  ('c1000000-0000-0000-0000-000000000008', (SELECT id FROM public.spaces WHERE slug = 'our-universe'), 'lam-viec-cung-nhau', 'Một ngày làm việc cùng nhau', 'Hai chiếc laptop, hai cái tai nghe và rất nhiều lần quay sang nhìn nhau.', '2025-01-18', 'Nhà mình', 'everyday', 'published', false),
  ('c1000000-0000-0000-0000-000000000009', (SELECT id FROM public.spaces WHERE slug = 'our-universe'), 'ky-nghi-dau-tien', 'Kỳ nghỉ đầu tiên', 'Biển xanh, cát trắng và một lời hứa sẽ còn đi thật nhiều nơi nữa.', '2025-05-01', 'Phú Quốc', 'milestone', 'published', false)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  event_date = EXCLUDED.event_date,
  location_label = EXCLUDED.location_label,
  type = EXCLUDED.type,
  visibility = EXCLUDED.visibility,
  is_archived = EXCLUDED.is_archived;

-- 3. Media (static files served from /public)
INSERT INTO public.memory_media (id, memory_id, storage_path, thumbnail_path, mime_type, file_size_bytes, sort_order)
VALUES
  ('d1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', '/demo/couple/cafe-1.jpg', '/demo/couple/cafe-1.jpg', 'image/jpeg', 219306, 0),
  ('d1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000002', '/demo/couple/rain-1.jpg', '/demo/couple/rain-1.jpg', 'image/jpeg', 245927, 0),
  ('d1000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000003', '/demo/couple/hands-1.jpg', '/demo/couple/hands-1.jpg', 'image/jpeg', 347457, 0),
  ('d1000000-0000-0000-0000-000000000004', 'c1000000-0000-0000-0000-000000000004', '/demo/couple/sparkler-1.jpg', '/demo/couple/sparkler-1.jpg', 'image/jpeg', 270756, 0),
  ('d1000000-0000-0000-0000-000000000005', 'c1000000-0000-0000-0000-000000000004', '/demo/couple/sparkler-2.jpg', '/demo/couple/sparkler-2.jpg', 'image/jpeg', 416367, 1),
  ('d1000000-0000-0000-0000-000000000006', 'c1000000-0000-0000-0000-000000000005', '/demo/couple/picnic-1.jpg', '/demo/couple/picnic-1.jpg', 'image/jpeg', 479800, 0),
  ('d1000000-0000-0000-0000-000000000007', 'c1000000-0000-0000-0000-000000000005', '/demo/couple/picnic-2.jpg', '/demo/couple/picnic-2.jpg', 'image/jpeg', 343297, 1),
  ('d1000000-0000-0000-0000-000000000008', 'c1000000-0000-0000-0000-000000000006', '/demo/couple/beach-1.jpg', '/demo/couple/beach-1.jpg', 'image/jpeg', 264275, 0),
  ('d1000000-0000-0000-0000-000000000009', 'c1000000-0000-0000-0000-000000000006', '/demo/couple/beach-2.jpg', '/demo/couple/beach-2.jpg', 'image/jpeg', 125432, 1),
  ('d1000000-0000-0000-0000-000000000010', 'c1000000-0000-0000-0000-000000000006', '/demo/couple/beach-3.jpg', '/demo/couple/beach-3.jpg', 'image/jpeg', 352099, 2),
  ('d1000000-0000-0000-0000-000000000011', 'c1000000-0000-0000-0000-000000000007', '/demo/couple/autumn-1.jpg', '/demo/couple/autumn-1.jpg', 'image/jpeg', 864078, 0),
  ('d1000000-0000-0000-0000-000000000012', 'c1000000-0000-0000-0000-000000000008', '/demo/couple/home-1.jpg', '/demo/couple/home-1.jpg', 'image/jpeg', 197253, 0),
  ('d1000000-0000-0000-0000-000000000013', 'c1000000-0000-0000-0000-000000000009', '/demo/couple/trip-1.jpg', '/demo/couple/trip-1.jpg', 'image/jpeg', 393516, 0)
ON CONFLICT (id) DO NOTHING;

-- 4. Storage Bucket Configuration for Media
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'memories-media',
    'memories-media',
    true, -- Public read for CDN delivery on 3D galaxy canvas
    52428800, -- 50 MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'audio/mpeg', 'audio/mp3', 'audio/wav']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 52428800;

-- Ensure public select policy on storage.objects for memories-media
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' AND policyname = 'Public Access for memories-media'
    ) THEN
        CREATE POLICY "Public Access for memories-media"
            ON storage.objects
            FOR SELECT
            USING (bucket_id = 'memories-media');
    END IF;
END $$;
