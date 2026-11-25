import { describe, it, expect } from 'vitest';

interface MemoryItem {
  id: string;
  space_id: string;
  title: string;
  visibility: 'draft' | 'private' | 'published';
  is_archived: boolean;
}

interface EdgeItem {
  id: string;
  source_id: string;
  target_id: string;
}

// Emulates PostgreSQL RLS policy: (visibility = 'published' AND is_archived = FALSE) OR is_space_member(space_id)
function evaluateMemoryRLS(
  memory: MemoryItem,
  isMember: boolean
): boolean {
  if (isMember) return true;
  return memory.visibility === 'published' && !memory.is_archived;
}

// Emulates PostgreSQL RLS policy on memory_edges
function evaluateEdgeRLS(
  edge: EdgeItem,
  memoryMap: Map<string, MemoryItem>,
  isMember: boolean
): boolean {
  if (isMember) return true;

  const source = memoryMap.get(edge.source_id);
  const target = memoryMap.get(edge.target_id);

  if (!source || !target) return false;

  const sourcePublic = source.visibility === 'published' && !source.is_archived;
  const targetPublic = target.visibility === 'published' && !target.is_archived;

  return sourcePublic && targetPublic;
}

// Emulates public space sanitization
function sanitizePublicSpace(space: {
  public_title: string;
  tagline: string | null;
  relationship_start_date: string | null;
  show_day_counter: boolean;
}) {
  return {
    public_title: space.public_title,
    tagline: space.tagline,
    relationship_start_date: space.show_day_counter ? space.relationship_start_date : null,
    show_day_counter: space.show_day_counter,
  };
}

describe('Milestone A: RLS Policy Invariants & Public Data Isolation', () => {
  const publishedMemory: MemoryItem = {
    id: 'mem-pub',
    space_id: 'space-1',
    title: 'First Date under Stars',
    visibility: 'published',
    is_archived: false,
  };

  const draftMemory: MemoryItem = {
    id: 'mem-draft',
    space_id: 'space-1',
    title: 'Surprise Trip (Planning)',
    visibility: 'draft',
    is_archived: false,
  };

  const privateMemory: MemoryItem = {
    id: 'mem-priv',
    space_id: 'space-1',
    title: 'Secret Letter',
    visibility: 'private',
    is_archived: false,
  };

  const archivedPublishedMemory: MemoryItem = {
    id: 'mem-arch',
    space_id: 'space-1',
    title: 'Old Event',
    visibility: 'published',
    is_archived: true,
  };

  describe('Memory RLS', () => {
    it('allows public visitor to see only published, non-archived memories', () => {
      expect(evaluateMemoryRLS(publishedMemory, false)).toBe(true);
      expect(evaluateMemoryRLS(draftMemory, false)).toBe(false);
      expect(evaluateMemoryRLS(privateMemory, false)).toBe(false);
      expect(evaluateMemoryRLS(archivedPublishedMemory, false)).toBe(false);
    });

    it('allows authorized space member to see all memories including drafts and private', () => {
      expect(evaluateMemoryRLS(publishedMemory, true)).toBe(true);
      expect(evaluateMemoryRLS(draftMemory, true)).toBe(true);
      expect(evaluateMemoryRLS(privateMemory, true)).toBe(true);
      expect(evaluateMemoryRLS(archivedPublishedMemory, true)).toBe(true);
    });
  });

  describe('Constellation Edge RLS Invariant', () => {
    const memoryMap = new Map<string, MemoryItem>([
      [publishedMemory.id, publishedMemory],
      [draftMemory.id, draftMemory],
      [privateMemory.id, privateMemory],
      [archivedPublishedMemory.id, archivedPublishedMemory],
      [
        'mem-pub-2',
        {
          id: 'mem-pub-2',
          space_id: 'space-1',
          title: 'Another Anniversary',
          visibility: 'published',
          is_archived: false,
        },
      ],
    ]);

    it('shows edge to public visitors ONLY when both connected memories are published', () => {
      const edgeBothPublished: EdgeItem = {
        id: 'edge-1',
        source_id: publishedMemory.id,
        target_id: 'mem-pub-2',
      };
      expect(evaluateEdgeRLS(edgeBothPublished, memoryMap, false)).toBe(true);
    });

    it('hides edge from public visitors if one of the memories is a draft', () => {
      const edgeWithDraft: EdgeItem = {
        id: 'edge-2',
        source_id: publishedMemory.id,
        target_id: draftMemory.id,
      };
      expect(evaluateEdgeRLS(edgeWithDraft, memoryMap, false)).toBe(false);
    });

    it('hides edge from public visitors if one of the memories is private', () => {
      const edgeWithPrivate: EdgeItem = {
        id: 'edge-3',
        source_id: publishedMemory.id,
        target_id: privateMemory.id,
      };
      expect(evaluateEdgeRLS(edgeWithPrivate, memoryMap, false)).toBe(false);
    });

    it('allows space members to see all graph edges in studio', () => {
      const edgeWithDraft: EdgeItem = {
        id: 'edge-2',
        source_id: publishedMemory.id,
        target_id: draftMemory.id,
      };
      expect(evaluateEdgeRLS(edgeWithDraft, memoryMap, true)).toBe(true);
    });
  });

  describe('Couple Settings & Day Counter Privacy', () => {
    it('hides relationship_start_date from public when show_day_counter is false', () => {
      const spaceData = {
        public_title: 'Our Universe',
        tagline: 'Stars of memories',
        relationship_start_date: '2024-02-14',
        show_day_counter: false,
      };

      const publicOutput = sanitizePublicSpace(spaceData);
      expect(publicOutput.relationship_start_date).toBeNull();
      expect(publicOutput.show_day_counter).toBe(false);
      expect(publicOutput.public_title).toBe('Our Universe');
    });

    it('exposes relationship_start_date only when show_day_counter is explicitly true', () => {
      const spaceData = {
        public_title: 'Our Universe',
        tagline: 'Stars of memories',
        relationship_start_date: '2024-02-14',
        show_day_counter: true,
      };

      const publicOutput = sanitizePublicSpace(spaceData);
      expect(publicOutput.relationship_start_date).toBe('2024-02-14');
      expect(publicOutput.show_day_counter).toBe(true);
    });
  });
});
