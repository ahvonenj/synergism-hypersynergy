/**
 * Type definition collection: hs-inline-imports.d.ts
 * Description:
 *     Types of the imports esbuild turns into strings: `inline:` imports (esbuild-plugin-inline-import),
 *     images (data URLs) and the heater worker's source
 * Author: Swiffy
*/

declare module '*.html' {
    const html: string;
    export default html;
}

declare module '*.css' {
    const css: string;
    export default css;
}

// Through `inline:` only: a plain import of a JSON file gives its parsed content
declare module '*.json' {
    const json: string;
    export default json;
}

// A userscript from src/loader, inlined as text
declare module '*.user.js' {
    const script: string;
    export default script;
}

declare module '*.png' {
    const dataUrl: string;
    export default dataUrl;
}

/** Built and watched separately, then embedded into the mod bundle. */
declare module 'hs-heater-worker-source' {
    const source: string;
    export default source;
}
