/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GEMINI_API_KEY: string;
  readonly VITE_R2_WORKER_URL: string;
  readonly VITE_R2_UPLOAD_SECRET: string;
  readonly VITE_R2_BUCKET: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
