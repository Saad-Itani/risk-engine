/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_ENABLE_LLM: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
