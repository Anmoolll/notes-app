import './styles.css';
import { api, getToken, setToken, type Note, type NoteVersion } from './api';

const app = document.getElementById('app')!;

type View = 'auth' | 'notes';

let view: View = getToken() ? 'notes' : 'auth';
let authMode: 'login' | 'register' = 'login';
let notes: Note[] = [];
let page = 1;
let totalPages = 1;
let searchQuery = '';
let tagFilter = '';
let selectedNote: Note | null = null;
let versions: NoteVersion[] = [];
let statusMessage = '';
let statusType: 'error' | 'success' = 'error';

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function parseTags(input: string): string[] {
  return input
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}

function showStatus(message: string, type: 'error' | 'success' = 'error') {
  statusMessage = message;
  statusType = type;
  render();
}

async function loadNotes() {
  try {
    if (searchQuery.trim()) {
      const result = await api.searchNotes(searchQuery.trim(), page);
      notes = result.notes;
      totalPages = Math.max(1, Math.ceil(result.total / 20));
    } else {
      const result = await api.listNotes(page, 20, tagFilter.trim() || undefined);
      notes = result.notes;
      totalPages = result.pages;
    }
    statusMessage = '';
  } catch (err) {
    if (err instanceof Error && err.message.includes('token')) {
      setToken(null);
      view = 'auth';
    }
    showStatus(err instanceof Error ? err.message : 'Failed to load notes');
  }
}

async function openNote(id: string) {
  try {
    selectedNote = await api.getNote(id);
    versions = await api.getVersions(id);
    statusMessage = '';
    render();
  } catch (err) {
    showStatus(err instanceof Error ? err.message : 'Failed to load note');
  }
}

function closeModal() {
  selectedNote = null;
  versions = [];
  render();
}

function renderAuth(): string {
  return `
    <h1>Notes</h1>
    <p class="subtitle">Sign in to manage your notes</p>
    <div class="card">
      ${statusMessage ? `<div class="${statusType}">${escapeHtml(statusMessage)}</div>` : ''}
      <div class="auth-tabs">
        <button type="button" class="${authMode === 'login' ? 'active' : ''}" data-auth-mode="login">Log in</button>
        <button type="button" class="${authMode === 'register' ? 'active' : ''}" data-auth-mode="register">Register</button>
      </div>
      <form id="auth-form">
        <label for="email">Email</label>
        <input id="email" name="email" type="email" required autocomplete="email" />
        <label for="password">Password</label>
        <input id="password" name="password" type="password" required minlength="8" autocomplete="${authMode === 'login' ? 'current-password' : 'new-password'}" />
        <button type="submit" class="btn btn-primary">${authMode === 'login' ? 'Log in' : 'Create account'}</button>
      </form>
    </div>
  `;
}

function renderNotesList(): string {
  const list =
    notes.length === 0
      ? `<p class="empty">No notes yet. Create one below.</p>`
      : notes
          .map(
            (n) => `
        <button type="button" class="note-item" data-note-id="${n._id}">
          <h3>${escapeHtml(n.title)}</h3>
          <p>${escapeHtml(n.content)}</p>
          ${n.tags?.length ? `<div class="tags">${n.tags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join('')}</div>` : ''}
        </button>`
          )
          .join('');

  return `
    <div class="header-row">
      <div>
        <h1>Your notes</h1>
        <p class="subtitle">${searchQuery ? 'Search results' : tagFilter ? `Tag: ${escapeHtml(tagFilter)}` : 'All notes'}</p>
      </div>
      <button type="button" class="btn btn-ghost" id="logout-btn">Log out</button>
    </div>
    ${statusMessage ? `<div class="${statusType}">${escapeHtml(statusMessage)}</div>` : ''}
    <div class="toolbar">
      <input id="search-input" type="search" placeholder="Search notes…" value="${escapeHtml(searchQuery)}" />
      <input id="tag-input" type="text" placeholder="Filter by tag" value="${escapeHtml(tagFilter)}" />
      <button type="button" class="btn btn-ghost" id="apply-filters">Apply</button>
    </div>
    <div class="card" style="margin-bottom:1rem">
      <form id="create-form">
        <label for="new-title">New note</label>
        <input id="new-title" name="title" placeholder="Title" required maxlength="200" />
        <textarea id="new-content" name="content" placeholder="Write something…" required></textarea>
        <input id="new-tags" name="tags" placeholder="Tags (comma-separated)" />
        <button type="submit" class="btn btn-primary">Add note</button>
      </form>
    </div>
    <div class="notes-list">${list}</div>
    ${
      totalPages > 1
        ? `<div class="pagination">
        <button type="button" class="btn btn-ghost" id="prev-page" ${page <= 1 ? 'disabled' : ''}>Previous</button>
        <span>Page ${page} of ${totalPages}</span>
        <button type="button" class="btn btn-ghost" id="next-page" ${page >= totalPages ? 'disabled' : ''}>Next</button>
      </div>`
        : ''
    }
    ${renderModal()}
  `;
}

function renderModal(): string {
  if (!selectedNote) return '';
  const n = selectedNote;
  return `
    <div class="modal-backdrop" id="modal-backdrop">
      <div class="modal" role="dialog" aria-labelledby="modal-title">
        <form id="edit-form">
          <label for="edit-title">Title</label>
          <input id="edit-title" name="title" value="${escapeHtml(n.title)}" required maxlength="200" />
          <label for="edit-content">Content</label>
          <textarea id="edit-content" name="content" required>${escapeHtml(n.content)}</textarea>
          <label for="edit-tags">Tags</label>
          <input id="edit-tags" name="tags" value="${escapeHtml((n.tags ?? []).join(', '))}" placeholder="comma-separated" />
          <label for="share-email">Share with email</label>
          <input id="share-email" name="share_email" type="email" placeholder="friend@example.com" />
          <div class="modal-actions">
            <button type="submit" class="btn btn-primary">Save</button>
            <button type="button" class="btn btn-ghost" id="share-btn">Share</button>
            <button type="button" class="btn btn-danger" id="delete-btn">Delete</button>
            <button type="button" class="btn btn-ghost" id="close-modal">Close</button>
          </div>
        </form>
        ${
          versions.length
            ? `<div class="versions">
            <h4>Version history</h4>
            ${versions
              .slice()
              .reverse()
              .map(
                (v) => `
              <div class="version-item">
                <time>${formatDate(v.savedAt)}</time>
                <strong>${escapeHtml(v.title)}</strong>
                <p>${escapeHtml(v.content)}</p>
              </div>`
              )
              .join('')}
          </div>`
            : '<p class="empty" style="padding:0.5rem 0">No previous versions yet.</p>'
        }
      </div>
    </div>
  `;
}

function render() {
  app.innerHTML = view === 'auth' ? renderAuth() : renderNotesList();
  bindEvents();
}

function bindEvents() {
  if (view === 'auth') {
    document.querySelectorAll('[data-auth-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        authMode = (btn as HTMLElement).dataset.authMode as 'login' | 'register';
        statusMessage = '';
        render();
      });
    });

    document.getElementById('auth-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.target as HTMLFormElement;
      const email = (form.elements.namedItem('email') as HTMLInputElement).value.trim();
      const password = (form.elements.namedItem('password') as HTMLInputElement).value;

      try {
        if (authMode === 'register') {
          await api.register(email, password);
          showStatus('Account created. Log in to continue.', 'success');
          authMode = 'login';
          return;
        }
        const { access_token } = await api.login(email, password);
        setToken(access_token);
        view = 'notes';
        page = 1;
        await loadNotes();
        render();
      } catch (err) {
        showStatus(err instanceof Error ? err.message : 'Authentication failed');
      }
    });
    return;
  }

  document.getElementById('logout-btn')?.addEventListener('click', () => {
    setToken(null);
    view = 'auth';
    notes = [];
    selectedNote = null;
    statusMessage = '';
    render();
  });

  document.getElementById('create-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const title = (form.elements.namedItem('title') as HTMLInputElement).value.trim();
    const content = (form.elements.namedItem('content') as HTMLTextAreaElement).value.trim();
    const tagsRaw = (form.elements.namedItem('tags') as HTMLInputElement).value;
    const tags = parseTags(tagsRaw);

    try {
      await api.createNote(title, content, tags.length ? tags : undefined);
      form.reset();
      page = 1;
      await loadNotes();
      showStatus('Note created.', 'success');
    } catch (err) {
      showStatus(err instanceof Error ? err.message : 'Failed to create note');
    }
  });

  document.getElementById('apply-filters')?.addEventListener('click', async () => {
    searchQuery = (document.getElementById('search-input') as HTMLInputElement).value;
    tagFilter = (document.getElementById('tag-input') as HTMLInputElement).value.trim();
    page = 1;
    await loadNotes();
    render();
  });

  document.getElementById('search-input')?.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      document.getElementById('apply-filters')?.click();
    }
  });

  document.getElementById('prev-page')?.addEventListener('click', async () => {
    if (page > 1) {
      page--;
      await loadNotes();
      render();
    }
  });

  document.getElementById('next-page')?.addEventListener('click', async () => {
    if (page < totalPages) {
      page++;
      await loadNotes();
      render();
    }
  });

  document.querySelectorAll('[data-note-id]').forEach((btn) => {
    btn.addEventListener('click', () => openNote((btn as HTMLElement).dataset.noteId!));
  });

  document.getElementById('modal-backdrop')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal();
  });

  document.getElementById('close-modal')?.addEventListener('click', closeModal);

  document.getElementById('edit-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!selectedNote) return;
    const form = e.target as HTMLFormElement;
    const title = (form.elements.namedItem('title') as HTMLInputElement).value.trim();
    const content = (form.elements.namedItem('content') as HTMLTextAreaElement).value.trim();
    const tags = parseTags((form.elements.namedItem('tags') as HTMLInputElement).value);

    try {
      selectedNote = await api.updateNote(selectedNote._id, { title, content, tags });
      versions = await api.getVersions(selectedNote._id);
      await loadNotes();
      showStatus('Note saved.', 'success');
    } catch (err) {
      showStatus(err instanceof Error ? err.message : 'Failed to save');
    }
  });

  document.getElementById('share-btn')?.addEventListener('click', async () => {
    if (!selectedNote) return;
    const email = (document.getElementById('share-email') as HTMLInputElement).value.trim();
    if (!email) {
      showStatus('Enter an email to share with.');
      return;
    }
    try {
      await api.shareNote(selectedNote._id, email);
      (document.getElementById('share-email') as HTMLInputElement).value = '';
      showStatus('Note shared successfully.', 'success');
    } catch (err) {
      showStatus(err instanceof Error ? err.message : 'Failed to share');
    }
  });

  document.getElementById('delete-btn')?.addEventListener('click', async () => {
    if (!selectedNote || !confirm('Delete this note?')) return;
    try {
      await api.deleteNote(selectedNote._id);
      closeModal();
      await loadNotes();
      showStatus('Note deleted.', 'success');
    } catch (err) {
      showStatus(err instanceof Error ? err.message : 'Failed to delete');
    }
  });
}

async function init() {
  if (view === 'notes') {
    await loadNotes();
  }
  render();
}

init();
