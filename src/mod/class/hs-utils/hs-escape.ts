/**
 * For a line given to HSLogger: the log tab renders it as HTML, and the same
 * string goes to the console. Only what would be read as markup is escaped,
 * so quotes and ">" stay readable there (a stack trace, the input's JSON).
 */
export function escapeLogText(value: string): string {
    return value.replace(/&/g, '&amp;').replace(/</g, '&lt;');
}

export function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
