const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

const TOKEN_KEY = 'notes_access_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export interface Note {
  _id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface NoteVersion {
  title: string;
  content: string;
  savedAt: string;
}

export interface NotesPage {
  notes: Note[];
  total: number;
  page: number;
  pages: number;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  auth = true
): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (auth) {
    const token = getToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      typeof data.message === 'string'
        ? data.message
        : Array.isArray(data.errors)
          ? data.errors.map((e: { message: string }) => e.message).join(', ')
          : `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data as T;
}

export const api = {
  register(email: string, password: string) {
    return request<{ message: string }>(
      '/register',
      { method: 'POST', body: JSON.stringify({ email, password }) },
      false
    );
  },

  login(email: string, password: string) {
    return request<{ access_token: string }>(
      '/login',
      { method: 'POST', body: JSON.stringify({ email, password }) },
      false
    );
  },

  listNotes(page = 1, limit = 20, tag?: string) {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (tag) params.set('tag', tag);
    return request<NotesPage>(`/notes?${params}`);
  },

  searchNotes(q: string, page = 1, limit = 20) {
    const params = new URLSearchParams({ q, page: String(page), limit: String(limit) });
    return request<{ notes: Note[]; total: number }>(`/notes/search?${params}`);
  },

  getNote(id: string) {
    return request<Note>(`/notes/${id}`);
  },

  createNote(title: string, content: string, tags?: string[]) {
    return request<Note>('/notes', {
      method: 'POST',
      body: JSON.stringify({ title, content, tags }),
    });
  },

  updateNote(id: string, data: { title?: string; content?: string; tags?: string[] }) {
    return request<Note>(`/notes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteNote(id: string) {
    return request<void>(`/notes/${id}`, { method: 'DELETE' });
  },

  shareNote(id: string, share_with_email: string) {
    return request<{ message: string }>(`/notes/${id}/share`, {
      method: 'POST',
      body: JSON.stringify({ share_with_email }),
    });
  },

  getVersions(id: string) {
    return request<NoteVersion[]>(`/notes/${id}/versions`);
  },
};
