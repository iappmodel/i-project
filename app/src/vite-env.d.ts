/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_POP_VALIDATOR_URL?: string
  readonly VITE_DEMO_USER_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
