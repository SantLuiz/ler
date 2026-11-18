# Bun 1.4.4 and its bundled libraries

LER redistributes the Bun Windows x64 runtime as a separate, unmodified executable. The MIT license for LER covers LER's own code. Bun and the code bundled with it are governed by their respective upstream licenses.

- [Bun 1.4.4 release](https://github.com/oven-sh/bun/releases/tag/bun-v1.4.4) and [corresponding Bun source](https://github.com/oven-sh/bun/tree/bun-v1.4.4).
- [Bun 1.4.4 license notice and dependency list](https://github.com/oven-sh/bun/blob/bun-v1.4.4/LICENSE.md), reproduced in `Bun-LICENSE.md`.
- [Corresponding patched WebKit source](https://github.com/oven-sh/WebKit/tree/d6375c72affe0f70222cdcb45012b10f0bf3a9d5) for JavaScriptCore and WebCore, with the exact revision taken from [Bun's build configuration](https://github.com/oven-sh/bun/blob/bun-v1.4.4/scripts/build/deps/webkit.ts). The JavaScriptCore and WebCore license texts in this folder come from that revision.
- [Upstream instructions to rebuild Bun and relink JavaScriptCore](https://github.com/oven-sh/bun/blob/bun-v1.4.4/LICENSE.md#javascriptcore).
