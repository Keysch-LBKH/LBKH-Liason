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

// ── PDF text extraction via pdfjs-dist ────────────────────────────────────────

async function extractPdfText(base64: string): Promise<string> {
  try {
    const pdfjsLib = await import('pdfjs-dist');
    // Point the worker at the bundled worker script
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url
    ).toString();

    // Decode base64 → Uint8Array
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

    const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
    const pageTexts: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const tc = await page.getTextContent();
      pageTexts.push(
        tc.items
          .map((item: { str?: string }) => item.str ?? '')
          .join(' ')
      );
    }
    return pageTexts.join('\n\n');
  } catch (err) {
    console.warn('PDF extraction failed:', err);
    return '[PDF text extraction failed — please re-upload as a .txt file if this persists]';
  }
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

// ── Fetch all source + benchmark text for AI grounding ───────────────────────

export async function fetchAllDocumentTexts(folder: 'sources' | 'benchmarks'): Promise<{ name: string; text: string; publicUrl: string }[]> {
  const docs = await listDocuments(folder);
  const results = await Promise.allSettled(
    docs.map(async (doc) => {
      const content = await fetchDocumentContent(doc.key);
      let text: string;
      if (content.encoding === 'utf8') {
        text = content.content;
      } else if (
        content.encoding === 'base64' &&
        (doc.key.toLowerCase().endsWith('.pdf') || content.contentType?.includes('pdf'))
      ) {
        // Extract readable text from the PDF binary
        text = await extractPdfText(content.content);
      } else {
        text = '[Binary document — text extraction not available. Please upload as PDF or plain text.]';
      }
      return {
        name: doc.name,
        text,
        publicUrl: doc.publicUrl || '',
      };
    })
  );
  return results
    .filter((r): r is PromiseFulfilledResult<{ name: string; text: string; publicUrl: string }> => r.status === 'fulfilled')
    .map((r) => r.value);
}
