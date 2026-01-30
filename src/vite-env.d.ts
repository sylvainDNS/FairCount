/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
}

// biome-ignore lint/correctness/noUnusedVariables: Vite environment type augmentation
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
