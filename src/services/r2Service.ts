/**
 * LBKH R2 Storage Service
 * All file operations are proxied through the Cloudflare Worker (lbkh-r2-proxy).
 * No R2 credentials are ever exposed to the browser.
 *
 * Files are stored under two path prefixes within the bucket:
 *   sources/    — Company's own internal & public project documentation
 *   benchmarks/ — Oppositional / comparison project documentation
 *   meta/       — Per-document metadata (publicUrl, redacted flag) — worker-internal
 *
 * PRIVACY: Raw document text is ONLY fetched by the authenticated Settings page.
 * The public chat interface never receives full document content.
 */

const WORKER_URL = import.meta.env.VITE_R2_WORKER_URL as string;
const UPLOAD_SECRET = import.meta.env.VITE_R2_UPLOAD_SECRET as string;
const BUCKET = import.meta.env.VITE_R2_BUCKET as string;

function authHeaders(extra: Record<string, string> = {}): HeadersInit {
  return {
    'X-Upload-Secret': UPLOAD_SECRET,
    'X-Bucket': BUCKET,
    ...extra,
  };
}

export interface R2Document {
  key: string;
  name: string;
  size: number;
  lastModified: string;
  type: string;
  folder: 'sources' | 'benchmarks';
  publicUrl: string;
  redacted: boolean;
}

export interface DocumentContent {
  content: string;
  encoding: 'utf8' | 'base64';
  contentType: string;
}

// ── Upload ────────────────────────────────────────────────────────────────────

export async function uploadDocument(
  file: File,
  folder: 'sources' | 'benchmarks' = 'sources',
  publicUrl = ''
): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', folder);
  if (publicUrl) formData.append('publicUrl', publicUrl);

  const response = await fetch(`${WORKER_URL}/upload`, {
    method: 'POST',
    headers: authHeaders(),
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(`Upload failed: ${err.error || response.statusText}`);
  }

  const data = await response.json();
  return data.key as string;
}

// ── List ──────────────────────────────────────────────────────────────────────

export async function listDocuments(folder: 'sources' | 'benchmarks' = 'sources'): Promise<R2Document[]> {
  const response = await fetch(`${WORKER_URL}/list?prefix=${folder}/`, {
    method: 'GET',
    headers: authHeaders(),
  });

  if (!response.ok) throw new Error(`List failed: ${response.statusText}`);

  const data = await response.json();
  return (data.files as R2Document[]).map((f) => ({ ...f, folder }));
}

// ── Fetch document text (Settings only — never called from public chat) ───────

export async function fetchDocumentContent(key: string): Promise<DocumentContent> {
  const response = await fetch(`${WORKER_URL}/file?key=${encodeURIComponent(key)}`, {
    method: 'GET',
    headers: authHeaders(),
  });

  if (!response.ok) throw new Error(`Fetch failed: ${response.statusText}`);

  return response.json() as Promise<DocumentContent>;
}

// ── Save redacted version back to R2 (replaces original) ─────────────────────

export async function saveRedactedDocument(key: string, redactedText: string): Promise<void> {
  const response = await fetch(`${WORKER_URL}/save-redacted`, {
    method: 'PUT',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' } as HeadersInit,
    body: JSON.stringify({ key, text: redactedText }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(`Save failed: ${err.error || response.statusText}`);
  }
}

// ── Update document metadata (public URL) ────────────────────────────────────

export async function updateDocumentMetadata(key: string, publicUrl: string): Promise<void> {
  const response = await fetch(`${WORKER_URL}/metadata`, {
    method: 'PUT',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' } as HeadersInit,
    body: JSON.stringify({ key, publicUrl }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(`Metadata update failed: ${err.error || response.statusText}`);
  }
}

// ── Delete ────────────────────────────────────────────────────────────────────

export async function deleteDocument(key: string): Promise<void> {
  const response = await fetch(`${WORKER_URL}/delete?key=${encodeURIComponent(key)}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });

  if (!response.ok) throw new Error(`Delete failed: ${response.statusText}`);
}

// ── Fetch all source + benchmark text for AI grounding (Settings/server only) ─

export async function fetchAllDocumentTexts(folder: 'sources' | 'benchmarks'): Promise<{ name: string; text: string; publicUrl: string }[]> {
  const docs = await listDocuments(folder);
  const results = await Promise.allSettled(
    docs.map(async (doc) => {
      const content = await fetchDocumentContent(doc.key);
      return {
        name: doc.name,
        text: content.encoding === 'utf8' ? content.content : '[Binary document — text extraction not available]',
        publicUrl: doc.publicUrl || '',
      };
    })
  );
  return results
    .filter((r): r is PromiseFulfilledResult<{ name: string; text: string; publicUrl: string }> => r.status === 'fulfilled')
    .map((r) => r.value);
}
