/*
    Type definition collection: index.d.ts
    Description: 
        Module declarations mainly for inline-import esbuild plugin
        https://www.npmjs.com/package/esbuild-plugin-inline-import
    Author: Swiffy
*/

declare module '*.txt' {
    const content: string;
    export default content;
}

declare module '*.html' {
    const html: string;
    export default html;
}

declare module '*.css' {
    const css: string;
    export default css;
}

declare module '*.json' {
    const json: string;
    export default json;
}