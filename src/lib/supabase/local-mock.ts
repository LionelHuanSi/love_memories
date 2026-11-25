import fs from 'fs';
import path from 'path';

export interface LocalStoreData {
  users: Array<{ id: string; email: string; username?: string; password?: string }>;
  spaces: Array<Record<string, unknown>>;
  space_members: Array<Record<string, unknown>>;
  memories: Array<Record<string, unknown>>;
  memory_media: Array<Record<string, unknown>>;
  partner_invites: Array<Record<string, unknown>>;
}

const STORE_PATH = path.join(process.cwd(), 'data', 'local_store.json');

export function readStore(): LocalStoreData {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Error reading local_store.json:', err);
  }
  return {
    users: [{ id: 'u-demo-001', email: 'demo@universe.love', username: 'demo', password: 'messi10' }],
    spaces: [
      {
        id: 'a0000000-0000-0000-0000-000000000001',
        slug: 'our-universe',
        public_title: 'Our Little Universe',
        tagline: 'A constellation of our unforgettable moments',
        relationship_start_date: '2024-02-14',
        show_day_counter: true,
        theme: { accentColor: '#A78BFA', musicUrl: null },
      },
    ],
    space_members: [
      {
        space_id: 'a0000000-0000-0000-0000-000000000001',
        user_id: 'u-demo-001',
        role: 'owner',
      },
    ],
    memories: [],
    memory_media: [],
    partner_invites: [],
  };
}

export function writeStore(store: LocalStoreData): void {
  try {
    const dir = path.dirname(STORE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing local_store.json:', err);
  }
}

interface FilterRule {
  field: string;
  op: 'eq' | 'lt' | 'gt';
  value: unknown;
}

class QueryBuilder {
  private table: keyof LocalStoreData;
  private filters: FilterRule[] = [];
  private orderRule?: { field: string; ascending: boolean };
  private limitCount?: number;
  private selectColumns = '*';
  private action: 'select' | 'insert' | 'update' | 'delete' = 'select';
  private payload: unknown = null;

  constructor(table: keyof LocalStoreData) {
    this.table = table;
  }

  select(columns = '*') {
    this.selectColumns = columns;
    return this;
  }

  eq(field: string, value: unknown) {
    this.filters.push({ field, op: 'eq', value });
    return this;
  }

  lt(field: string, value: unknown) {
    this.filters.push({ field, op: 'lt', value });
    return this;
  }

  gt(field: string, value: unknown) {
    this.filters.push({ field, op: 'gt', value });
    return this;
  }

  order(field: string, options?: { ascending?: boolean }) {
    this.orderRule = { field, ascending: options?.ascending !== false };
    return this;
  }

  limit(n: number) {
    this.limitCount = n;
    return this;
  }

  insert(data: unknown) {
    this.action = 'insert';
    this.payload = data;
    return this;
  }

  update(data: unknown) {
    this.action = 'update';
    this.payload = data;
    return this;
  }

  delete() {
    this.action = 'delete';
    return this;
  }

  private applyFilters(items: Record<string, unknown>[]): Record<string, unknown>[] {
    return items.filter((item) => {
      for (const f of this.filters) {
        const itemVal = item[f.field];
        if (f.op === 'eq') {
          // Xử lý giá trị boolean mặc định (như is_archived: false khi thuộc tính là undefined/null)
          if (f.field === 'is_archived' && f.value === false) {
            if (Boolean(itemVal)) return false;
          } else if (itemVal !== f.value) {
            return false;
          }
        }
        if (f.op === 'lt' && !(String(itemVal) < String(f.value))) return false;
        if (f.op === 'gt' && !(String(itemVal) > String(f.value))) return false;
      }
      return true;
    });
  }

  private execute() {
    const store = readStore();
    const tableData = (store[this.table] as Record<string, unknown>[]) || [];

    if (this.action === 'insert') {
      const recordsToInsert = Array.isArray(this.payload) ? this.payload : [this.payload];
      const inserted: Record<string, unknown>[] = [];
      for (const rec of recordsToInsert) {
        const newRecord = {
          id: rec.id || `local-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_archived: false,
          ...rec,
        };
        tableData.push(newRecord);
        inserted.push(newRecord);
      }
      writeStore(store);
      return { data: Array.isArray(this.payload) ? inserted : inserted[0], error: null };
    }

    if (this.action === 'update') {
      const matching = this.applyFilters(tableData);
      for (const item of matching) {
        Object.assign(item, this.payload, { updated_at: new Date().toISOString() });
      }
      writeStore(store);
      return { data: matching, error: null };
    }

    if (this.action === 'delete') {
      const remaining = tableData.filter((item) => {
        for (const f of this.filters) {
          if (f.op === 'eq' && item[f.field] === f.value) return false;
        }
        return true;
      });
      (store as unknown as Record<string, unknown>)[this.table] = remaining;
      writeStore(store);
      return { data: null, error: null };
    }

    // Action === 'select'
    let results = this.applyFilters(tableData);

    // Apply relations if needed
    if (this.table === 'memories' && this.selectColumns.includes('memory_media')) {
      const mediaList = store.memory_media as Record<string, unknown>[];
      results = results.map((m) => {
        const related = mediaList
          .filter((media) => media.memory_id === m.id)
          .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
        return { ...m, memory_media: related };
      });
    }

    if (this.table === 'memory_media' && this.selectColumns.includes('memories')) {
      const memoryList = store.memories as Record<string, unknown>[];
      results = results.map((media) => ({
        ...media,
        memories: memoryList.find((m) => m.id === media.memory_id) || null,
      }));
    }

    if (this.table === 'space_members' && this.selectColumns.includes('spaces')) {
      const spaces = store.spaces as Record<string, unknown>[];
      results = results.map((m) => {
        const space = spaces.find((s) => s.id === m.space_id);
        return { ...m, spaces: space || null };
      });
    }

    // Apply ordering
    if (this.orderRule) {
      const { field, ascending } = this.orderRule;
      results.sort((a, b) => {
        const valA = String(a[field] || '');
        const valB = String(b[field] || '');
        return ascending ? valA.localeCompare(valB) : valB.localeCompare(valA);
      });
    }

    // Apply limit
    if (typeof this.limitCount === 'number') {
      results = results.slice(0, this.limitCount);
    }

    return { data: results, error: null };
  }

  // Promise resolution support for `await supabase.from(...)`
  then(
    onfulfilled?: ((value: { data: unknown; error: unknown }) => unknown) | null,
    onrejected?: ((reason: unknown) => unknown) | null
  ) {
    try {
      const res = this.execute();
      return Promise.resolve(res).then(onfulfilled, onrejected);
    } catch (err) {
      return Promise.reject(err).then(onfulfilled, onrejected);
    }
  }

  async single() {
    const res = this.execute();
    const item = Array.isArray(res.data) ? res.data[0] : res.data;
    if (!item) return { data: null, error: { message: 'Row not found' } };
    return { data: item, error: null };
  }

  async maybeSingle() {
    const res = this.execute();
    const item = Array.isArray(res.data) ? res.data[0] || null : res.data;
    return { data: item, error: null };
  }
}

export function createLocalMockClient(sessionUserId?: string) {
  const store = readStore();
  const defaultUser = sessionUserId
    ? store.users.find((u) => u.id === sessionUserId) || null
    : null;

  return {
    from: (table: string) => new QueryBuilder(table as keyof LocalStoreData),
    auth: {
      getUser: async () => {
        if (!defaultUser) return { data: { user: null }, error: null };
        return {
          data: {
            user: {
              id: defaultUser.id,
              email: defaultUser.email,
              role: 'authenticated',
            },
          },
          error: null,
        };
      },
      signInWithPassword: async ({ email, password }: { email: string; password?: string }) => {
        const matched = store.users.find(
          (u) =>
            (u.email.toLowerCase() === email.toLowerCase() ||
              u.username?.toLowerCase() === email.toLowerCase()) &&
            u.password === password
        );
        if (!matched) {
          return {
            data: { user: null, session: null },
            error: { message: 'Tên đăng nhập hoặc mật khẩu không chính xác.' },
          };
        }
        return {
          data: {
            user: { id: matched.id, email: matched.email },
            session: { access_token: `mock-token-${matched.id}` },
          },
          error: null,
        };
      },
      signInWithOtp: async () => {
        return { data: {}, error: null };
      },
      signUp: async ({ email }: { email: string }) => {
        const newUser = {
          id: `u-${Date.now()}`,
          email,
          username: email.split('@')[0],
        };
        store.users.push(newUser);
        writeStore(store);
        return { data: { user: newUser }, error: null };
      },
      signOut: async () => {
        return { error: null };
      },
      admin: {
        createUser: async ({ email, password }: { email: string; password?: string }) => {
          const user = {
            id: `u-${Date.now()}`,
            email,
            username: email.split('@')[0],
            password,
          };
          store.users.push(user);
          writeStore(store);
          return { data: { user }, error: null };
        },
        listUsers: async () => {
          return { data: { users: store.users }, error: null };
        },
      },
    },
    storage: {
      from: () => ({
        createSignedUploadUrl: async (filePath: string) => {
          return { data: { path: filePath, token: 'mock-upload-token' }, error: null };
        },
        uploadToSignedUrl: async () => {
          return { error: null };
        },
        createSignedUrl: async (filePath: string) => {
          if (filePath.startsWith('http://') || filePath.startsWith('https://') || filePath.startsWith('data:')) {
            return { data: { signedUrl: filePath }, error: null };
          }
          return { data: { signedUrl: `/api/mock-media?path=${encodeURIComponent(filePath)}` }, error: null };
        },
        remove: async () => {
          return { error: null };
        },
      }),
    },
  };
}
