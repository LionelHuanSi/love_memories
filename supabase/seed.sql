-- ============================================================================
-- MEMORIES: Demo seed data (Lionel Messi career moments)
-- Ảnh nằm trong public/demo/messi/ — nguồn & giấy phép: public/demo/messi/CREDITS.md
-- Chạy sau khi đã áp dụng các migration trong supabase/migrations/.
-- ============================================================================

-- 1. Space
INSERT INTO public.spaces (id, slug, public_title, tagline, relationship_start_date, show_day_counter, theme)
VALUES (
  'a0000000-0000-0000-0000-000000000001', 'our-universe', 'Messi Universe',
  'A constellation of Leo Messi''s unforgettable moments',
  '2004-10-16', true,
  jsonb_build_object('accentColor', '#75AADB', 'coupleNames', 'Leo Messi ♡ Football', 'musicUrl', null)
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
  ('c1000000-0000-0000-0000-000000000001', (SELECT id FROM public.spaces WHERE slug = 'our-universe'), 'nhung-ngay-dau-o-barca', 'Những ngày đầu ở Barça', 'Cậu bé Rosario 18 tuổi khoác áo số 30, chạy cánh phải và khiến cả Camp Nou phải đứng dậy mỗi lần chạm bóng.', '2005-10-26', 'Camp Nou, Barcelona', 'milestone', 'published', false),
  ('c1000000-0000-0000-0000-000000000002', (SELECT id FROM public.spaces WHERE slug = 'our-universe'), 'qua-bong-vang-2010', 'Quả bóng Vàng FIFA 2010', 'Danh hiệu cá nhân cao quý nhất lần đầu được trao dưới tên gọi FIFA Ballon d''Or — chiếc cúp hiện được trưng bày tại bảo tàng của Barça.', '2011-01-10', 'Zürich, Thụy Sĩ', 'milestone', 'published', false),
  ('c1000000-0000-0000-0000-000000000003', (SELECT id FROM public.spaces WHERE slug = 'our-universe'), 'vo-dich-club-world-cup-2011', 'Vô địch FIFA Club World Cup 2011', 'Barça thắng Santos 4–0 trong trận chung kết tại Nhật Bản, Messi ghi hai bàn và nhận Quả bóng Vàng của giải.', '2011-12-18', 'Yokohama, Nhật Bản', 'trip', 'published', false),
  ('c1000000-0000-0000-0000-000000000004', (SELECT id FROM public.spaces WHERE slug = 'our-universe'), 'da-phat-truoc-elche', 'Đá phạt trước Elche', 'Một buổi tối Copa del Rey bình thường ở Camp Nou — và khoảnh khắc cả sân nín thở chờ chân trái số 10.', '2015-01-08', 'Camp Nou, Barcelona', 'everyday', 'published', false),
  ('c1000000-0000-0000-0000-000000000005', (SELECT id FROM public.spaces WHERE slug = 'our-universe'), 'la-remontada-6-1', 'La Remontada 6–1', 'Thua 0–4 ở lượt đi, Barça lội ngược dòng thắng PSG 6–1 ở lượt về. Một đêm không ai tin là có thật.', '2017-03-08', 'Camp Nou, Barcelona', 'milestone', 'published', false),
  ('c1000000-0000-0000-0000-000000000006', (SELECT id FROM public.spaces WHERE slug = 'our-universe'), 'world-cup-2018-iceland', 'World Cup 2018: Argentina – Iceland', 'Trận ra quân tại Nga kết thúc 1–1, Messi đá hỏng phạt đền. Không phải kỷ niệm nào cũng ngọt ngào.', '2018-06-16', 'Spartak Stadium, Moskva', 'trip', 'published', false),
  ('c1000000-0000-0000-0000-000000000007', (SELECT id FROM public.spaces WHERE slug = 'our-universe'), 'le-classique-cung-psg', 'Le Classique cùng PSG', 'Mùa giải đầu tiên rời Barça, đá cặp cùng Mbappé và Neymar trong trận PSG gặp Marseille.', '2021-10-24', 'Stade Vélodrome, Marseille', 'trip', 'published', false),
  ('c1000000-0000-0000-0000-000000000008', (SELECT id FROM public.spaces WHERE slug = 'our-universe'), 'world-cup-2022-mexico', 'World Cup 2022: Argentina – Mexico', 'Bàn mở tỷ số giúp Argentina thắng 2–0 và hồi sinh hành trình tại Qatar, kết thúc bằng chức vô địch thế giới ngày 18/12/2022.', '2022-11-26', 'Lusail Stadium, Qatar', 'milestone', 'published', false),
  ('c1000000-0000-0000-0000-000000000009', (SELECT id FROM public.spaces WHERE slug = 'our-universe'), 'mua-he-2023-inter-miami', 'Mùa hè 2023 cùng Inter Miami', 'Chương mới ở nước Mỹ: bán kết US Open Cup với Cincinnati và những trận đấu chật kín khán giả mặc áo hồng.', '2023-08-23', 'TQL Stadium, Cincinnati', 'trip', 'published', false)
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
  ('d1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', '/demo/messi/barca-debut-2005.jpg', '/demo/messi/barca-debut-2005.jpg', 'image/jpeg', 374851, 0),
  ('d1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000002', '/demo/messi/ballon-dor-2010.jpg', '/demo/messi/ballon-dor-2010.jpg', 'image/jpeg', 402393, 0),
  ('d1000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000003', '/demo/messi/tokyo-2011-a.jpg', '/demo/messi/tokyo-2011-a.jpg', 'image/jpeg', 363755, 0),
  ('d1000000-0000-0000-0000-000000000004', 'c1000000-0000-0000-0000-000000000003', '/demo/messi/tokyo-2011-b.jpg', '/demo/messi/tokyo-2011-b.jpg', 'image/jpeg', 502083, 1),
  ('d1000000-0000-0000-0000-000000000005', 'c1000000-0000-0000-0000-000000000004', '/demo/messi/free-kick-2015.jpg', '/demo/messi/free-kick-2015.jpg', 'image/jpeg', 336214, 0),
  ('d1000000-0000-0000-0000-000000000006', 'c1000000-0000-0000-0000-000000000005', '/demo/messi/remontada-2017-a.jpg', '/demo/messi/remontada-2017-a.jpg', 'image/jpeg', 557325, 0),
  ('d1000000-0000-0000-0000-000000000007', 'c1000000-0000-0000-0000-000000000005', '/demo/messi/remontada-2017-b.jpg', '/demo/messi/remontada-2017-b.jpg', 'image/jpeg', 336900, 1),
  ('d1000000-0000-0000-0000-000000000008', 'c1000000-0000-0000-0000-000000000006', '/demo/messi/russia-2018.jpg', '/demo/messi/russia-2018.jpg', 'image/jpeg', 673662, 0),
  ('d1000000-0000-0000-0000-000000000009', 'c1000000-0000-0000-0000-000000000007', '/demo/messi/psg-2021-a.jpg', '/demo/messi/psg-2021-a.jpg', 'image/jpeg', 358180, 0),
  ('d1000000-0000-0000-0000-000000000010', 'c1000000-0000-0000-0000-000000000007', '/demo/messi/psg-2021-b.jpg', '/demo/messi/psg-2021-b.jpg', 'image/jpeg', 406875, 1),
  ('d1000000-0000-0000-0000-000000000011', 'c1000000-0000-0000-0000-000000000008', '/demo/messi/qatar-2022.jpg', '/demo/messi/qatar-2022.jpg', 'image/jpeg', 272850, 0),
  ('d1000000-0000-0000-0000-000000000012', 'c1000000-0000-0000-0000-000000000009', '/demo/messi/miami-2023-a.jpg', '/demo/messi/miami-2023-a.jpg', 'image/jpeg', 214083, 0),
  ('d1000000-0000-0000-0000-000000000013', 'c1000000-0000-0000-0000-000000000009', '/demo/messi/miami-2023-b.jpg', '/demo/messi/miami-2023-b.jpg', 'image/jpeg', 277621, 1)
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
