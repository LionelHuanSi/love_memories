-- 20261013000001_initial_schema.sql
-- Schema for Memories: Our Little Universe (Single-couple, 2-editor model)

-- 1. Create Enums
CREATE TYPE user_role AS ENUM ('owner', 'partner');
CREATE TYPE memory_visibility AS ENUM ('draft', 'private', 'published');

-- 2. Spaces table (single space for MVP)
CREATE TABLE IF NOT EXISTS public.spaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    public_title TEXT NOT NULL DEFAULT 'Our Little Universe',
    tagline TEXT DEFAULT 'A constellation of our unforgettable moments',
    relationship_start_date DATE NULL,
    show_day_counter BOOLEAN NOT NULL DEFAULT FALSE,
    theme JSONB NOT NULL DEFAULT '{"accentColor": "#A78BFA", "musicUrl": null}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Space members table (enforces max 2 editors, max 1 owner)
CREATE TABLE IF NOT EXISTS public.space_members (
    space_id UUID NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role user_role NOT NULL,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (space_id, user_id)
);

-- Trigger function to enforce:
-- a) At most 2 members per space
-- b) At most 1 owner per space
CREATE OR REPLACE FUNCTION public.check_space_members_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_count INT;
    owner_count INT;
BEGIN
    -- Check total members for this space
    SELECT COUNT(*) INTO current_count
    FROM public.space_members
    WHERE space_id = NEW.space_id;

    IF current_count >= 2 THEN
        RAISE EXCEPTION 'Space cannot have more than 2 members in single-couple MVP';
    END IF;

    -- Check owner count
    IF NEW.role = 'owner' THEN
        SELECT COUNT(*) INTO owner_count
        FROM public.space_members
        WHERE space_id = NEW.space_id AND role = 'owner';

        IF owner_count >= 1 THEN
            RAISE EXCEPTION 'Space already has an owner';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_space_members_limit ON public.space_members;
CREATE TRIGGER trg_space_members_limit
    BEFORE INSERT ON public.space_members
    FOR EACH ROW
    EXECUTE FUNCTION public.check_space_members_limit();

-- 4. Partner invites table (single-use, time-limited, SHA-256 token hash)
CREATE TABLE IF NOT EXISTS public.partner_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id UUID NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ NULL,
    revoked_at TIMESTAMPTZ NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Constellations table (optional named grouping)
CREATE TABLE IF NOT EXISTS public.constellations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id UUID NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_space_constellation_slug UNIQUE (space_id, slug)
);

-- 6. Memories table
CREATE TABLE IF NOT EXISTS public.memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id UUID NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
    slug TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NULL,
    event_date DATE NOT NULL,
    location_label TEXT NULL,
    type TEXT NOT NULL DEFAULT 'everyday',
    visibility memory_visibility NOT NULL DEFAULT 'draft',
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    constellation_id UUID NULL REFERENCES public.constellations(id) ON DELETE SET NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    published_at TIMESTAMPTZ NULL,
    CONSTRAINT uq_space_memory_slug UNIQUE (space_id, slug)
);

-- Trigger to auto-set published_at and updated_at
CREATE OR REPLACE FUNCTION public.handle_memory_updates()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    IF NEW.visibility = 'published' AND OLD.visibility <> 'published' AND NEW.published_at IS NULL THEN
        NEW.published_at = now();
    ELSIF NEW.visibility <> 'published' THEN
        NEW.published_at = NULL;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_memory_updates ON public.memories;
CREATE TRIGGER trg_memory_updates
    BEFORE UPDATE ON public.memories
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_memory_updates();

-- 7. Memory media table
CREATE TABLE IF NOT EXISTS public.memory_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    memory_id UUID NOT NULL REFERENCES public.memories(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL UNIQUE,
    thumbnail_path TEXT NULL,
    mime_type TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    width INT NULL,
    height INT NULL,
    alt_text TEXT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Memory edges table (for graph constellation connections)
CREATE TABLE IF NOT EXISTS public.memory_edges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id UUID NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
    source_memory_id UUID NOT NULL REFERENCES public.memories(id) ON DELETE CASCADE,
    target_memory_id UUID NOT NULL REFERENCES public.memories(id) ON DELETE CASCADE,
    kind TEXT NOT NULL DEFAULT 'chronological',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_different_nodes CHECK (source_memory_id <> target_memory_id),
    CONSTRAINT uq_edge UNIQUE (space_id, source_memory_id, target_memory_id)
);

-- 9. Milestones table (P1)
CREATE TABLE IF NOT EXISTS public.milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id UUID NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    event_date DATE NOT NULL,
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_memories_space_vis ON public.memories(space_id, visibility, is_archived, event_date DESC);
CREATE INDEX IF NOT EXISTS idx_memories_slug ON public.memories(slug);
CREATE INDEX IF NOT EXISTS idx_media_memory ON public.memory_media(memory_id, sort_order ASC);
CREATE INDEX IF NOT EXISTS idx_invites_hash ON public.partner_invites(token_hash);
