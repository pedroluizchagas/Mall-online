/// <reference types="react/experimental" />
/// <reference types="react-dom/experimental" />

/**
 * Carrega as tipagens EXPERIMENTAIS do React 18.3 (`cache`, `form action`
 * como função) e do react-dom (`useFormState`, `useFormStatus`) a partir
 * do `@types/react` e `@types/react-dom` DESTE app.
 *
 * O `next/types/index.d.ts` já faz esta referência, mas ela é resolvida a
 * partir de onde o Next mora (`node_modules/.pnpm/...`), e o pnpm decide por
 * hoist oculto qual `@types/react` fica visível ali — na Vercel caía numa
 * versão diferente (ou em nenhuma) e o build quebrava em "checking validity
 * of types" com erros que o tsc local não reproduzia. Referenciar daqui
 * resolve sempre para `./node_modules/@types/react`, o mesmo dos `paths`.
 */
