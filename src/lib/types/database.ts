export type UserRole = 'owner' | 'partner';
export type MemoryVisibility = 'draft' | 'private' | 'published';
export type MemoryType = 'date' | 'trip' | 'milestone' | 'everyday' | 'other';

export interface SpaceTheme {
  accentColor?: string;
  musicUrl?: string | null;
  coverImage?: string | null;
}

export interface Space {
  id: string;
  slug: string;
  public_title: string;
  tagline: string | null;
  relationship_start_date: string | null;
  show_day_counter: boolean;
  theme: SpaceTheme;
  created_at: string;
  updated_at: string;
}

export interface SpaceMember {
  space_id: string;
  user_id: string;
  role: UserRole;
  joined_at: string;
}

export interface PartnerInvite {
  id: string;
  space_id: string;
  token_hash: string;
  expires_at: string;
  used_at: string | null;
  revoked_at: string | null;
  created_by: string | null;
  created_at: string;
}

export interface Memory {
  id: string;
  space_id: string;
  slug: string;
  title: string;
  description: string | null;
  event_date: string;
  location_label: string | null;
  type: MemoryType;
  visibility: MemoryVisibility;
  is_archived: boolean;
  constellation_id: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

export interface MemoryMedia {
  id: string;
  memory_id: string;
  storage_path: string;
  thumbnail_path: string | null;
  mime_type: string;
  file_size_bytes: number;
  width: number | null;
  height: number | null;
  alt_text: string | null;
  sort_order: number;
  created_at: string;
}

export interface Constellation {
  id: string;
  space_id: string;
  name: string;
  slug: string;
  description: string | null;
  created_at: string;
}

export interface MemoryEdge {
  id: string;
  space_id: string;
  source_memory_id: string;
  target_memory_id: string;
  kind: string;
  created_at: string;
}

export interface Milestone {
  id: string;
  space_id: string;
  title: string;
  event_date: string;
  is_public: boolean;
  created_at: string;
}
