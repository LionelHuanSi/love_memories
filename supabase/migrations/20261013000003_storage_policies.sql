-- 20261013000003_storage_policies.sql
-- Storage bucket and security policies for memories-media

-- 1. Create private storage bucket for memories media
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'memories-media',
    'memories-media',
    false,
    52428800, -- 50 MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = 52428800,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic'];

-- 2. Storage Policies on storage.objects
-- Note: Storage paths follow pattern: <space_id>/<memory_id>/<file_name>

-- Only authenticated space members can upload files into their space folder
CREATE POLICY "Members can upload memory media"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'memories-media'
        AND public.is_space_member((storage.foldername(name))[1]::uuid)
    );

-- Members can update their space media
CREATE POLICY "Members can update memory media"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'memories-media'
        AND public.is_space_member((storage.foldername(name))[1]::uuid)
    )
    WITH CHECK (
        bucket_id = 'memories-media'
        AND public.is_space_member((storage.foldername(name))[1]::uuid)
    );

-- Members can delete their space media
CREATE POLICY "Members can delete memory media"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'memories-media'
        AND public.is_space_member((storage.foldername(name))[1]::uuid)
    );

-- Media download/read policy:
-- Members can read all images in their space.
-- Non-members can only read images if the corresponding memory is published and not archived.
CREATE POLICY "Controlled media download"
    ON storage.objects
    FOR SELECT
    USING (
        bucket_id = 'memories-media'
        AND (
            public.is_space_member((storage.foldername(name))[1]::uuid)
            OR EXISTS (
                SELECT 1 FROM public.memories m
                WHERE m.id = (storage.foldername(name))[2]::uuid
                  AND m.visibility = 'published'
                  AND m.is_archived = FALSE
            )
        )
    );
