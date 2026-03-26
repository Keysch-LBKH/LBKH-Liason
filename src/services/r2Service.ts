/**
 * LBKH R2 Storage Service
 * All file operations are proxied through the Cloudflare Worker (lbkh-r2-proxy).
 * No R2 credentials are ever exposed to the browser.
 *
 * Files are stored under two path prefixes within the bucket:
 *   sources/    — Company's own internal & public project documentation
 *   benchmarks/ — Oppositional / comparison project documentation
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
}

/**
 * Upload a file to R2 under a specific folder prefix (sources/ or benchmarks/)
 */
export async function uploadDocument(file: File, folder: 'sources' | 'benchmarks' = 'sources'): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', folder);

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

/**
 * List all documents in a specific folder (sources/ or benchmarks/) via the Worker proxy
 */
export async function listDocuments(folder: 'sources' | 'benchmarks' = 'sources'): Promise<R2Document[]> {
  const response = await fetch(`${WORKER_URL}/list?prefix=${folder}/`, {
    method: 'GET',
    headers: authHeaders(),
  });

  if (!response.ok) {
    throw new Error(`List failed: ${response.statusText}`);
  }

  const data = await response.json();
  return (data.files as R2Document[]).map((f) => ({ ...f, folder }));
}

/**
 * Delete a document from R2 via the Worker proxy
 */
export async function deleteDocument(key: string): Promise<void> {
  const response = await fetch(`${WORKER_URL}/delete?key=${encodeURIComponent(key)}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Delete failed: ${response.statusText}`);
  }
}

/**
 * Fetch a document's text content for AI grounding via the Worker proxy
 */
export async function fetchDocumentText(key: string): Promise<string> {
  const response = await fetch(`${WORKER_URL}/file?key=${encodeURIComponent(key)}`, {
    method: 'GET',
    headers: authHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Fetch failed: ${response.statusText}`);
  }

  return response.text();
}
