-- 20261013000002_rls_policies.sql
-- RLS policies and security procedures for Memories

-- 1. Helper Security Functions (SECURITY DEFINER to prevent recursion)
CREATE OR REPLACE FUNCTION public.is_space_member(target_space_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.space_members
        WHERE space_id = target_space_id
          AND user_id = auth.uid()
    );
$$;

CREATE OR REPLACE FUNCTION public.get_user_space_role(target_space_id UUID)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
STABLE
AS $$
    SELECT role::text FROM public.space_members
    WHERE space_id = target_space_id
      AND user_id = auth.uid()
    LIMIT 1;
$$;

-- 2. Enable RLS on all tables
ALTER TABLE public.spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.space_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.constellations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;

-- 3. Spaces Policies
-- Public can view active space details (title, tagline, day counter, theme)
CREATE POLICY "Public can view spaces"
    ON public.spaces
    FOR SELECT
    USING (true);

-- Only authenticated space members can update their space
CREATE POLICY "Members can update space"
    ON public.spaces
    FOR UPDATE
    TO authenticated
    USING (public.is_space_member(id))
    WITH CHECK (public.is_space_member(id));

-- 4. Space Members Policies
-- Members can view other members of their space
CREATE POLICY "Members can view space members"
    ON public.space_members
    FOR SELECT
    TO authenticated
    USING (public.is_space_member(space_id));

-- Only owner can remove a partner (cannot remove self as owner)
CREATE POLICY "Owner can remove members"
    ON public.space_members
    FOR DELETE
    TO authenticated
    USING (
        public.get_user_space_role(space_id) = 'owner'
        AND user_id <> auth.uid()
    );

-- 5. Partner Invites Policies
-- Only owner can view, create, or revoke invites
CREATE POLICY "Owner can view invites"
    ON public.partner_invites
    FOR SELECT
    TO authenticated
    USING (public.get_user_space_role(space_id) = 'owner');

CREATE POLICY "Owner can create invites"
    ON public.partner_invites
    FOR INSERT
    TO authenticated
    WITH CHECK (
        public.get_user_space_role(space_id) = 'owner'
        AND created_by = auth.uid()
    );

CREATE POLICY "Owner can update invites"
    ON public.partner_invites
    FOR UPDATE
    TO authenticated
    USING (public.get_user_space_role(space_id) = 'owner')
    WITH CHECK (public.get_user_space_role(space_id) = 'owner');

-- 6. Memories Policies
-- Public can only see published, non-archived memories
-- Members of the space can see all memories (draft, private, published, archived)
CREATE POLICY "Public and members can select memories"
    ON public.memories
    FOR SELECT
    USING (
        (visibility = 'published' AND is_archived = FALSE)
        OR public.is_space_member(space_id)
    );

-- Only space members can insert memories
CREATE POLICY "Members can insert memories"
    ON public.memories
    FOR INSERT
    TO authenticated
    WITH CHECK (public.is_space_member(space_id));

-- Only space members can update memories
CREATE POLICY "Members can update memories"
    ON public.memories
    FOR UPDATE
    TO authenticated
    USING (public.is_space_member(space_id))
    WITH CHECK (public.is_space_member(space_id));

-- Only space members can delete memories
CREATE POLICY "Members can delete memories"
    ON public.memories
    FOR DELETE
    TO authenticated
    USING (public.is_space_member(space_id));

-- 7. Memory Media Policies
-- Public can only select media for published, non-archived memories
-- Members can select all media in their space
CREATE POLICY "Public and members can select media"
    ON public.memory_media
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.memories m
            WHERE m.id = memory_media.memory_id
              AND (
                  (m.visibility = 'published' AND m.is_archived = FALSE)
                  OR public.is_space_member(m.space_id)
              )
        )
    );

CREATE POLICY "Members can insert media"
    ON public.memory_media
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.memories m
            WHERE m.id = memory_media.memory_id
              AND public.is_space_member(m.space_id)
        )
    );

CREATE POLICY "Members can update media"
    ON public.memory_media
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.memories m
            WHERE m.id = memory_media.memory_id
              AND public.is_space_member(m.space_id)
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.memories m
            WHERE m.id = memory_media.memory_id
              AND public.is_space_member(m.space_id)
        )
    );

CREATE POLICY "Members can delete media"
    ON public.memory_media
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.memories m
            WHERE m.id = memory_media.memory_id
              AND public.is_space_member(m.space_id)
        )
    );

-- 8. Constellations Policies
CREATE POLICY "Public and members can select constellations"
    ON public.constellations
    FOR SELECT
    USING (true);

CREATE POLICY "Members can manage constellations"
    ON public.constellations
    FOR ALL
    TO authenticated
    USING (public.is_space_member(space_id))
    WITH CHECK (public.is_space_member(space_id));

-- 9. Memory Edges Policies
-- Public can only see edges where BOTH connected nodes are published and non-archived
CREATE POLICY "Public and members can select edges"
    ON public.memory_edges
    FOR SELECT
    USING (
        (
            EXISTS (
                SELECT 1 FROM public.memories s, public.memories t
                WHERE s.id = memory_edges.source_memory_id
                  AND t.id = memory_edges.target_memory_id
                  AND s.visibility = 'published' AND s.is_archived = FALSE
                  AND t.visibility = 'published' AND t.is_archived = FALSE
            )
        )
        OR public.is_space_member(memory_edges.space_id)
    );

CREATE POLICY "Members can manage edges"
    ON public.memory_edges
    FOR ALL
    TO authenticated
    USING (public.is_space_member(space_id))
    WITH CHECK (public.is_space_member(space_id));

-- 10. Milestones Policies
CREATE POLICY "Public and members can select milestones"
    ON public.milestones
    FOR SELECT
    USING (
        is_public = TRUE
        OR public.is_space_member(space_id)
    );

CREATE POLICY "Members can manage milestones"
    ON public.milestones
    FOR ALL
    TO authenticated
    USING (public.is_space_member(space_id))
    WITH CHECK (public.is_space_member(space_id));

-- 11. Transactional Stored Procedure for Partner Invite Acceptance
CREATE OR REPLACE FUNCTION public.accept_partner_invite(
    p_token_hash TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_invite RECORD;
    v_member_count INT;
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
    END IF;

    -- Lock and retrieve invite
    SELECT * INTO v_invite
    FROM public.partner_invites
    WHERE token_hash = p_token_hash
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid invitation token');
    END IF;

    IF v_invite.used_at IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invitation has already been used');
    END IF;

    IF v_invite.revoked_at IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invitation has been revoked');
    END IF;

    IF v_invite.expires_at < now() THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invitation has expired');
    END IF;

    -- Check member limit in the space
    SELECT COUNT(*) INTO v_member_count
    FROM public.space_members
    WHERE space_id = v_invite.space_id;

    IF v_member_count >= 2 THEN
        RETURN jsonb_build_object('success', false, 'error', 'This space already has two members');
    END IF;

    -- Check if user is already a member
    IF EXISTS (SELECT 1 FROM public.space_members WHERE space_id = v_invite.space_id AND user_id = v_user_id) THEN
        RETURN jsonb_build_object('success', false, 'error', 'You are already a member of this space');
    END IF;

    -- Insert into space_members as partner
    INSERT INTO public.space_members (space_id, user_id, role, joined_at)
    VALUES (v_invite.space_id, v_user_id, 'partner', now());

    -- Mark invite as used
    UPDATE public.partner_invites
    SET used_at = now()
    WHERE id = v_invite.id;

    RETURN jsonb_build_object('success', true, 'space_id', v_invite.space_id);
END;
$$;
