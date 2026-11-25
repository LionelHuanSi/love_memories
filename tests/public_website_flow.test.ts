import { describe, it, expect } from 'vitest';

interface TestMemory {
  id: string;
  slug: string;
  title: string;
  event_date: string;
  type: string;
  visibility: 'draft' | 'private' | 'published';
  is_archived: boolean;
}

// Emulates deterministic layout algorithm from /api/public/graph
function calculateConstellationNodes(memories: TestMemory[]) {
  const publishedOnly = memories.filter(
    (m) => m.visibility === 'published' && !m.is_archived
  );

  const stringHash = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  };

  const nodes = publishedOnly.map((mem, index) => {
    const offsetFactor = (stringHash(mem.slug) % 50) - 25;
    const angle = index * 1.618 + offsetFactor * 0.01;
    const radius = 100 + index * 65 + offsetFactor * 0.8;

    return {
      id: mem.id,
      position: {
        x: Math.round(500 + radius * Math.cos(angle)),
        y: Math.round(400 + radius * Math.sin(angle)),
      },
      data: {
        slug: mem.slug,
        title: mem.title,
        isMilestone: mem.type === 'milestone',
      },
    };
  });

  const edges = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    edges.push({
      source: nodes[i].id,
      target: nodes[i + 1].id,
    });
  }

  return { nodes, edges };
}

// Emulates relationship day counter logic
function calculateDaysTogether(startDateString: string, currentTimestamp: number): number {
  const start = new Date(startDateString).getTime();
  const diffDays = Math.floor((currentTimestamp - start) / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

// Emulates memory detail privacy guard
function checkDetailAccess(memory: TestMemory, isMember: boolean): boolean {
  if (isMember) return true;
  return memory.visibility === 'published' && !memory.is_archived;
}

describe('Milestone C: Public Website, Constellation Graph & Mobile Timeline Flow', () => {
  const sampleDataset: TestMemory[] = [
    {
      id: 'm1',
      slug: 'chuyen-di-da-lat-111111',
      title: 'Chuyến đi Đà Lạt',
      event_date: '2024-01-15',
      type: 'trip',
      visibility: 'published',
      is_archived: false,
    },
    {
      id: 'm2',
      slug: 'sinh-nhat-em-222222',
      title: 'Sinh nhật em',
      event_date: '2024-03-20',
      type: 'milestone',
      visibility: 'published',
      is_archived: false,
    },
    {
      id: 'm3_draft',
      slug: 'ke-hoach-bi-mat-333333',
      title: 'Kế hoạch cầu hôn (Bí mật)',
      event_date: '2024-06-01',
      type: 'milestone',
      visibility: 'draft', // DRAFT!
      is_archived: false,
    },
    {
      id: 'm4_priv',
      slug: 'la-thu-tay-444444',
      title: 'Lá thư tay riêng tư',
      event_date: '2024-07-10',
      type: 'everyday',
      visibility: 'private', // PRIVATE!
      is_archived: false,
    },
    {
      id: 'm5',
      slug: 'le-dinh-hon-555555',
      title: 'Lễ đính hôn',
      event_date: '2024-12-25',
      type: 'milestone',
      visibility: 'published',
      is_archived: false,
    },
  ];

  describe('Constellation Graph Invariants', () => {
    it('strictly maps ONLY published memories to star nodes', () => {
      const { nodes } = calculateConstellationNodes(sampleDataset);

      expect(nodes).toHaveLength(3); // m1, m2, m5 only
      expect(nodes.some((n) => n.id === 'm3_draft')).toBe(false);
      expect(nodes.some((n) => n.id === 'm4_priv')).toBe(false);
    });

    it('produces 100% deterministic coordinates across repeated runs', () => {
      const run1 = calculateConstellationNodes(sampleDataset);
      const run2 = calculateConstellationNodes(sampleDataset);

      expect(run1.nodes).toEqual(run2.nodes);
      expect(run1.edges).toEqual(run2.edges);
    });

    it('correctly sets milestone indicator on milestone nodes', () => {
      const { nodes } = calculateConstellationNodes(sampleDataset);

      const m2Node = nodes.find((n) => n.id === 'm2');
      const m1Node = nodes.find((n) => n.id === 'm1');

      expect(m2Node?.data.isMilestone).toBe(true);
      expect(m1Node?.data.isMilestone).toBe(false);
    });

    it('creates edges connecting adjacent published memories without leaking drafts', () => {
      const { edges } = calculateConstellationNodes(sampleDataset);

      // Should connect m1 -> m2 and m2 -> m5
      expect(edges).toHaveLength(2);
      expect(edges[0]).toEqual({ source: 'm1', target: 'm2' });
      expect(edges[1]).toEqual({ source: 'm2', target: 'm5' });
    });
  });

  describe('Public Memory Detail Access Guard', () => {
    it('allows anonymous visitors to view published memories', () => {
      const published = sampleDataset.find((m) => m.id === 'm1')!;
      expect(checkDetailAccess(published, false)).toBe(true);
    });

    it('denies anonymous visitors from viewing draft or private memories', () => {
      const draft = sampleDataset.find((m) => m.id === 'm3_draft')!;
      const priv = sampleDataset.find((m) => m.id === 'm4_priv')!;

      expect(checkDetailAccess(draft, false)).toBe(false);
      expect(checkDetailAccess(priv, false)).toBe(false);
    });

    it('allows space members to preview drafts and private memories', () => {
      const draft = sampleDataset.find((m) => m.id === 'm3_draft')!;
      const priv = sampleDataset.find((m) => m.id === 'm4_priv')!;

      expect(checkDetailAccess(draft, true)).toBe(true);
      expect(checkDetailAccess(priv, true)).toBe(true);
    });
  });

  describe('Day Counter Accuracy', () => {
    it('accurately calculates days elapsed since relationship start date', () => {
      const start = '2024-01-01';
      // 100 days after 2024-01-01
      const hundredDaysLater = new Date('2024-01-01').getTime() + 100 * 24 * 60 * 60 * 1000;

      const days = calculateDaysTogether(start, hundredDaysLater);
      expect(days).toBe(100);
    });

    it('handles leap years correctly', () => {
      const start = '2024-02-28';
      // 2 days after in leap year (Feb 29 and Mar 1)
      const leapDaySpan = new Date('2024-02-28').getTime() + 2 * 24 * 60 * 60 * 1000;

      const days = calculateDaysTogether(start, leapDaySpan);
      expect(days).toBe(2);
    });
  });

  describe('Timeline Sorting', () => {
    it('sorts memories in reverse chronological order', () => {
      const sorted = [...sampleDataset]
        .filter((m) => m.visibility === 'published')
        .sort((a, b) => b.event_date.localeCompare(a.event_date));

      expect(sorted[0].id).toBe('m5'); // 2024-12-25
      expect(sorted[1].id).toBe('m2'); // 2024-03-20
      expect(sorted[2].id).toBe('m1'); // 2024-01-15
    });
  });
});
