/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />

declare const __GIT_SHA__: string;
declare const __BUILD_DATE__: string;

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
}

// biome-ignore lint/correctness/noUnusedVariables: Vite environment type augmentation
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
