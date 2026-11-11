import { HSLogger } from "../hs-logger";
import { HSUtils } from "../../hs-utils/hs-utils";

interface HSDialogTemplate {
    // Several keys can share the same text: all of them, the first in alphabetical order first
    keys: string[];
    regex: RegExp;
    // Longest fixed part: a cheap substring check before the regex
    longestChunk: string;
    fixedLength: number;
}

/**
 * Class: HSDialogIdentity
 * IsExplicitHSModule: No
 * Description:
 *     Finds the translation key of a game dialog from its text, so a dialog keeps the same identity across game
 *     updates and languages. Built from the game's translation file for the current language, plus English for
 *     keys it lacks (as the game falls back). Texts without {{placeholders}} are looked up exactly; the others are
 *     matched as patterns, the most specific first. Texts with no key aren't identified.
 * Author: Shewchou
 */
export class HSDialogIdentity {
    static #context = 'HSDialogIdentity';
    // Templates with less fixed text than this would match almost any dialog (e.g. "+{{amount}}").
    // Chinese and Japanese characters count 3 (#weight)
    static readonly MIN_FIXED_CHARS = 10;

    static #lang: string | null = null;
    static #building: Promise<void> | null = null;
    static #failed: { lang: string, at: number } | null = null;
    static #exact = new Map<string, string[]>();
    static #templates: HSDialogTemplate[] = [];
    static #textByKey = new Map<string, string>();
    static #template: HTMLTemplateElement | null = null;

    /** The game's current language. */
    static #currentLang(): string {
        const i18n = window.__HS_i18next;
        const lang = typeof i18n?.language === 'string' && i18n.language ? i18n.language : localStorage.getItem('language');
        return lang || 'en';
    }

    /** Builds the index for the current language, unless it's built or being built already. */
    static ensureBuilt(): Promise<void> {
        if (HSDialogIdentity.#building) return HSDialogIdentity.#building;
        const lang = HSDialogIdentity.#currentLang();
        if (HSDialogIdentity.#lang === lang) return Promise.resolve();
        // A failed build (translation file unreachable) is retried at most once a minute, not at every dialog
        if (HSDialogIdentity.#failed?.lang === lang && Date.now() - HSDialogIdentity.#failed.at < 60000) return Promise.resolve();

        HSDialogIdentity.#building = HSDialogIdentity.#build(lang)
            .catch(error => {
                HSDialogIdentity.#failed = { lang, at: Date.now() };
                HSLogger.warn(`Dialog index failed: ${error}`, HSDialogIdentity.#context);
            })
            .finally(() => { HSDialogIdentity.#building = null; });
        return HSDialogIdentity.#building;
    }

    /**
     * The translation keys of a dialog's text: usually one, several when keys share the same text (the first in
     * alphabetical order first). Undefined when no key matches, or the index isn't ready for the current language
     * (a rebuild is then started, and dialogs are unidentified until it ends).
     */
    static identify(text: unknown): string[] | undefined {
        if (typeof text !== 'string' || text.length === 0) return undefined;
        if (HSDialogIdentity.#lang !== HSDialogIdentity.#currentLang()) {
            void HSDialogIdentity.ensureBuilt();
            return undefined;
        }

        const normalized = HSDialogIdentity.normalize(text);
        const exact = HSDialogIdentity.#exact.get(normalized);
        if (exact) return exact;

        // Sorted by fixed length: the first match is the most specific
        for (const template of HSDialogIdentity.#templates) {
            if (!normalized.includes(template.longestChunk)) continue;
            if (template.regex.test(normalized)) return template.keys;
        }
        return undefined;
    }

    /** A key's text in the current language (normalized, {{placeholders}} kept), if the index has it. */
    static getText(key: string): string | undefined {
        return HSDialogIdentity.#textByKey.get(key);
    }

    /**
     * The same plain text for a translation and for the dialog the game built from it. The game's i18next
     * post-processors (i18n.ts) change texts after the lookup: ColorText turns `<<color|text>>` into a span,
     * StatSymbols (the game's "stat symbols" option) puts a symbol and a no-break space before keywords
     * ("☌ Blueberries"). So: color markup unwrapped, tags stripped, entities decoded, a symbol followed by a
     * no-break space and a capital letter removed, whitespace collapsed.
     */
    static normalize(text: string): string {
        let plain = text.includes('<<') ? text.replace(/<<(.*?)\|(.*?)>>/g, '$2') : text;
        if (plain.includes('<') || plain.includes('&')) {
            // A <template>'s content is inert: no script runs, no image loads
            const template = HSDialogIdentity.#template ??= document.createElement('template');
            template.innerHTML = plain;
            plain = template.content.textContent ?? '';
        }
        if (plain.includes('\u00A0')) plain = plain.replace(HSDialogIdentity.#statSymbol, '');
        return plain.replace(/\s+/g, ' ').trim();
    }

    // A StatSymbols symbol: anything but a letter, digit, space or brace (so numbers and {{placeholders}} stay),
    // plus the letters it uses (Talisman Power, Rune Coefficient, Purple Bar Point)
    static #statSymbol = /(?:[^\p{L}\p{N}\s{}]|ל|Ɑ|𝚫)\u00A0(?=\p{Lu})/gu;

    static async #build(lang: string): Promise<void> {
        const start = performance.now();
        const files = [await HSDialogIdentity.#loadFile(lang)];
        if (lang !== 'en') files.push(await HSDialogIdentity.#loadFile('en'));
        if (!files[0] && !files[1]) throw new Error(`no translation file for ${lang}`);

        // The current language first, then English for the keys it lacks or leaves empty (the game sets
        // returnEmptyString: false, untranslated keys are empty strings)
        const rawByKey = new Map<string, string>();
        for (const file of files) {
            if (!file) continue;
            HSDialogIdentity.#flatten(file, '', (key, value) => {
                if (!rawByKey.has(key) && value.trim()) rawByKey.set(key, value);
            });
        }
        const textByKey = new Map<string, string>();
        for (const [key, raw] of rawByKey) {
            const text = HSDialogIdentity.normalize(HSDialogIdentity.#expand(raw, rawByKey, 0));
            if (text) textByKey.set(key, text);
        }

        // Keys in alphabetical order: a text shared by several keys always lists them in the same order.
        // Templates differing only by their placeholder names ("Purchased {{n}} levels", "Purchased {{levels}}
        // levels") are one message.
        const exact = new Map<string, string[]>();
        const templatesByText = new Map<string, HSDialogTemplate>();
        const placeholder = /\{\{[^}]*\}\}/;
        const placeholders = /\{\{[^}]*\}\}/g;
        for (const key of [...textByKey.keys()].sort()) {
            const text = textByKey.get(key)!;
            if (!placeholder.test(text)) {
                const keys = exact.get(text);
                if (keys) keys.push(key);
                else exact.set(text, [key]);
                continue;
            }
            const shape = text.replace(placeholders, '{{}}');
            const shared = templatesByText.get(shape);
            if (shared) {
                shared.keys.push(key);
                continue;
            }

            const chunks = text.split(placeholder);
            const fixedLength = chunks.reduce((sum, chunk) => sum + HSDialogIdentity.#weight(chunk), 0);
            if (fixedLength < HSDialogIdentity.MIN_FIXED_CHARS) continue;

            const source = chunks.map(chunk => HSDialogIdentity.#escapeRegex(chunk)).join('[\\s\\S]*?');
            const longestChunk = chunks.reduce((longest, chunk) => chunk.length > longest.length ? chunk : longest, '');
            templatesByText.set(shape, { keys: [key], regex: new RegExp(`^${source}$`), longestChunk, fixedLength });
        }

        HSDialogIdentity.#exact = exact;
        HSDialogIdentity.#templates = [...templatesByText.values()].sort((a, b) => b.fixedLength - a.fixedLength);
        HSDialogIdentity.#textByKey = textByKey;
        HSDialogIdentity.#lang = lang;
        HSLogger.debug(() => `Dialog index (${lang}): ${exact.size} texts, ${HSDialogIdentity.#templates.length} patterns, ${Math.round(performance.now() - start)} ms`, HSDialogIdentity.#context);
    }

    /**
     * From the game's i18next when the patcher exposed it (it holds the current language and English), else the game's translation file.
     * No fetch when i18next is there, even for a language it lacks.
     */
    static async #loadFile(lang: string): Promise<Record<string, unknown> | undefined> {
        const i18n = window.__HS_i18next;
        if (typeof i18n?.getResourceBundle !== 'function') return HSUtils.getGameTranslationFile(lang);
        const bundle = i18n.getResourceBundle(lang, 'translation');
        return bundle && typeof bundle === 'object' && Object.keys(bundle).length > 0 ? bundle : undefined;
    }

    static #flatten(node: Record<string, unknown>, prefix: string, add: (key: string, value: string) => void): void {
        for (const [name, value] of Object.entries(node)) {
            const key = prefix ? `${prefix}.${name}` : name;
            if (typeof value === 'string') add(key, value);
            else if (value && typeof value === 'object') HSDialogIdentity.#flatten(value as Record<string, unknown>, key, add);
        }
    }

    /**
     * What i18next resolves before the dialog is built: nested translations `$t(key)` (a dynamic `$t({{name}})`
     * becomes a placeholder), and the NumberLocale post-processor's `num:((123))`, formatted by the game.
     */
    static #expand(raw: string, rawByKey: Map<string, string>, depth: number): string {
        let text = raw.includes('num:((') ? raw.replace(/num:\(\((.*?)\)\)/g, '{{num}}') : raw;
        if (!text.includes('$t(')) return text;
        text = text.replace(/\$t\(([^)]*)\)/g, (match, inner: string) => {
            if (inner.includes('{{')) return '{{nested}}';
            const nested = rawByKey.get(inner.split(',')[0].trim());
            return nested !== undefined && depth < 3 ? HSDialogIdentity.#expand(nested, rawByKey, depth + 1) : match;
        });
        return text;
    }

    /** Fixed text weight: a Chinese or Japanese character says as much as a few Latin ones. */
    static #weight(chunk: string): number {
        let weight = 0;
        for (const char of chunk) weight += char >= '\u2E80' ? 3 : 1;
        return weight;
    }

    static #escapeRegex(text: string): string {
        return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
}
