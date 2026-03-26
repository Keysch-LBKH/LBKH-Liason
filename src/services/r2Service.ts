/**
 * LBKH R2 Storage Service
 * All file operations are proxied through the Cloudflare Worker (lbkh-r2-proxy).
 * No R2 credentials are ever exposed to the browser.
 */

const WORKER_URL = import.meta.env.VITE_R2_WORKER_URL as string;
const UPLOAD_SECRET = import.meta.env.VITE_R2_UPLOAD_SECRET as string;
const BUCKET = import.meta.env.VITE_R2_BUCKET as string; // 'liaison' or 'krambu'

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
}

/**
 * Upload a file to R2 via the Worker proxy
 */
export async function uploadDocument(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);

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
 * List all documents in the R2 bucket via the Worker proxy
 */
export async function listDocuments(): Promise<R2Document[]> {
  const response = await fetch(`${WORKER_URL}/list`, {
    method: 'GET',
    headers: authHeaders(),
  });

  if (!response.ok) {
    throw new Error(`List failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data.files as R2Document[];
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
