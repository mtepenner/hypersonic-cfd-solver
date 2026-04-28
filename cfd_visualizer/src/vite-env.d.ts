/// <reference types="vite/client" />

declare module '*.frag?raw' {
  const shader: string;
  export default shader;
}
