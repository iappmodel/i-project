/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_POP_VALIDATOR_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
