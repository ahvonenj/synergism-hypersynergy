import { EventBuffType } from "../../types/data-types/hs-event-data";
import { CSSValue } from "../../types/module-types/hs-ui-types";
import { HSGithub } from "../hs-core/github/hs-github";
import { HSElementHooker } from "../hs-core/hs-elementhooker";
import { HSGlobal } from "../hs-core/hs-global";
import { HSLogger } from "../hs-core/hs-logger";

/*
    Class: HSUtils
    IsExplicitHSModule: No
    Description: 
        Static utility module for Hypersynergism.
        Functionalities include:
            - wait() method to wait for an arbitrary amount of time
            - uuidv4() for generating UUIDs
            - domid() method for generating DOM-compliant unique ids
            - hashCode() for calculating a unique hash for arbitrary string
            - N() for pertty printing numbers
    Author: Swiffy
*/
export class HSUtils {

    // Simple promise-based wait/delay utility method
    static wait(delay: number) {
        return new Promise(function(resolve) {
            setTimeout(resolve, delay);
        });
    }

    static uuidv4() : string {
        return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, c =>
            (+c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> +c / 4).toString(16)
        );
    }

    static domid() : string {
        return "hs-rnd-00000000000".replace(/[018]/g, c =>
            (+c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> +c / 4).toString(16)
        );
    }

    static hashCode(str: string): number {
        let hash = 0;
        let i; 
        let chr;

        if (str.length === 0) return hash;

        for (i = 0; i < str.length; i++) {
            chr = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + chr;
            hash |= 0;
        }

        return hash;
    }  

    static async computeHash(data: string): Promise<string> {
        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(data);
        const hashBuffer = await crypto.subtle.digest('SHA-1', dataBuffer);
        
        return Array.from(new Uint8Array(hashBuffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    static N(num: string | number, precision : number = 2, expDecimals : number = 2) {
        let tempNum = 0;
        let numString = '';

        try {
            if(typeof num === "string")
                tempNum = parseFloat(num);
            else
                tempNum = num;

            if(tempNum > 1_000_000) {
                numString = tempNum.toExponential(expDecimals).replace('+', '');
            } else {
                numString = tempNum.toFixed(precision);
            }
        } catch (e) {
            console.error(`[HS]: HSUtil.N FAILED FOR ${num}`);
            return numString;
        }

        return numString;
    }

    static getTime() : string {
        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes();

        const formattedHours = hours.toString().padStart(2, '0');
        const formattedMinutes = minutes.toString().padStart(2, '0');

        return `${formattedHours}:${formattedMinutes}`;
    }

    static camelToKebab(str: string) {
        return str
            .replace(/^([A-Z])/, (match) => match.toLowerCase())
            .replace(/([A-Z])/g, (match) => '-' + match.toLowerCase());
    }

    static kebabToCamel(str: string) {
        return str.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    }

    static objectToCSS<T extends Record<string, CSSValue>>(obj: T) : string {
        let cssString = ``;

        if(obj === undefined || obj === null) {
            return '';
        }

        for(const [key, value] of Object.entries(obj)) {
            if (value !== undefined && value !== null) {
                cssString += `${this.camelToKebab(key)}: ${value};\n`;
            }
        }

        return cssString;
    }

    // This is jQuery's solution to this problem - it is surprisingly difficult
    // https://github.com/jquery/jquery/blob/76687566f0569dc832f13e901f0d2ce74016cd4d/test/data/jquery-3.7.1.js#L10641
    static isNumeric(n: any) {
        return !isNaN(n - parseFloat(n));
    }

    static isString(n: any) {
        return (typeof n === 'string' || n instanceof String);
    }

    static isBoolean(n: any) {
        return (typeof n == "boolean");
    }

    // JS native float parsing is fucky and won't work for when the number uses , like "123,456"...
    static parseFloat2(float: any) {
        if(!float) return NaN;

        const posC = float.indexOf(',');
        if(posC === -1) {
            return parseFloat(float);
        } else {
            float = float.replace(/,/g, '');
        }

        const posFS = float.indexOf('.');
        if(posFS === -1) return parseFloat(float.replace(/\,/g, '.'));

        const parsed = ((posC < posFS) ? (float.replace(/\,/g,'')) : (float.replace(/\./g,'').replace(',', '.')));

        return parseFloat(parsed);
    }

    static nullProxy<T>(proxyName: string) : T {
        const nullProxy = new Proxy({}, {
            get: () => {
                HSLogger.warn(`Get operation intercepted by Null Proxy '${proxyName}', something is not right`, 'Proxy');
                return nullProxy;
            },
            set: () => {
                HSLogger.warn(`Set operation intercepted by Null Proxy '${proxyName}', something is not right`, 'Proxy');
                return true;
            }
        });

        return nullProxy as T;
    }

    // Replace color tags for panel logging
    static parseColorTags(msg: string) : string {
        const tagPattern = /<([a-zA-Z]+|#[0-9A-Fa-f]{3,6})>(.*?)<\/\1>/g;
        
        // Replace all matched patterns with span elements
        return msg.replace(tagPattern, (match, colorName, content) => {
            return `<span style="color: ${colorName}">${content}</span>`;
        });
    }

    // Remove color tags for console logging
    static removeColorTags(msg: string) : string {
        try {
            const tagPattern = /<([a-zA-Z]+|#[0-9A-Fa-f]{3,6})>(.*?)<\/\1>/g;
        
            return msg.replace(tagPattern, (match, colorName, content) => {
                return `${content}`;
            });
        } catch(e) {
            console.warn("Error removing color tags from log message", e);
            return `${msg}`;
        }
    }

    static #numberSeparators?: { group: string; decimal: string };

    /**
     * Returns the thousand-group and decimal separators of the browser's default locale.
     * Synergism formats its numbers with `new Intl.NumberFormat(undefined, ...)`,
     * so this matches whatever the game is rendering (e.g. sv-SE: "2 048 000" / "2,04e6").
     */
    static getNumberSeparators() : { group: string; decimal: string } {
        if(!HSUtils.#numberSeparators) {
            const parts = new Intl.NumberFormat().formatToParts(1234567.5);

            HSUtils.#numberSeparators = {
                group: parts.find(p => p.type === 'group')?.value ?? ',',
                decimal: parts.find(p => p.type === 'decimal')?.value ?? '.'
            };
        }

        return HSUtils.#numberSeparators;
    }

    /**
     * Converts a number string rendered by the game (in the user's locale, possibly in
     * e-notation) into a string that parseFloat() understands.
     *
     * Examples (sv-SE):  "2,04e6" -> "2.04e6",  "32 000" -> "32000",  "1,02e6 / 1,02e6" -> "1.02e6"
     * Examples (en-US):  "2.04e6" -> "2.04e6",  "32,000" -> "32000"
     * Examples (de-DE):  "2,04e6" -> "2.04e6",  "32.000" -> "32000"
     */
    static unfuckNumericString(str: string) : string {
        if(!str) return str;

        const { group, decimal } = HSUtils.getNumberSeparators();

        // Remove group separators. Whitespace is stripped as well because locales use
        // various space characters (NBSP, narrow NBSP...) as group separators.
        let normalized = str.split(group).join('').replace(/[\s  ]/g, '');

        // Normalize the locale's decimal separator to '.'
        if(decimal !== '.') {
            normalized = normalized.split(decimal).join('.');
        }

        // Grab the first number (optionally in e-notation) from what is left
        const match = normalized.match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/i);

        return match ? match[0] : '';
    }

    /*
        Warning: This is really hacky

        We override the original display property setter and getters, as well as setProperty method for the element's style

        This is becase the game forces the inline display style in a weird way when it wants to show e.g. alert modals
        and thus we can't simply force the display to none, but instead we need to prevent the game from setting it in the first place
    */
    static #killElementDisplayProperties(element: HTMLElement) {
        const originalSetProperty = CSSStyleDeclaration.prototype.setProperty;
        let originalDisplayDescriptor;

        try {
            // First try the prototype (which might be CSSStyleDeclaration.prototype)
            originalDisplayDescriptor = Object.getOwnPropertyDescriptor(
                Object.getPrototypeOf(element.style), 
                'display'
            );

            // If that fails, try getting it from CSSStyleDeclaration.prototype directly
            if (!originalDisplayDescriptor) {
                originalDisplayDescriptor = Object.getOwnPropertyDescriptor(
                    CSSStyleDeclaration.prototype,
                    'display'
                );
            }

            // If still not found, create a default descriptor that will at least restore functionality
            if (!originalDisplayDescriptor) {
                originalDisplayDescriptor = {
                    configurable: true,
                    enumerable: true,

                    get: function() { 
                        return this.getPropertyValue('display'); 
                    },

                    set: function(value: any) { 
                        this.setProperty('display', value, '');
                    }
                };
            }
        } catch (e) {
            // Create a fallback descriptor that will restore basic functionality
            originalDisplayDescriptor = {
                configurable: true,
                enumerable: true,

                get: function() { 
                    return this.getPropertyValue('display'); 
                },

                set: function(value: any) { 
                    this.setProperty('display', value, '');
                }
            };
        }
        
        Object.defineProperty(element.style, 'display', { get: function() { return 'none'; }, set: function() { return; }, configurable: true });
        
        element.style.setProperty = function(propertyName, value, priority) {
            if (propertyName === 'display') 
                return originalSetProperty.call(this, propertyName, 'none');

            return originalSetProperty.call(this, propertyName, value, priority);
        };

        return {
            restore: () => {
                Object.defineProperty(element.style, 'display', originalDisplayDescriptor);
                element.style.setProperty = originalSetProperty;
            }
        };
    }

    static #cachedBG: HTMLElement | null = null;
    static #cachedConfirmBox: HTMLElement | null = null;
    static #cachedAlertWrapper: HTMLElement | null = null;

    // This might be very volatile, but it works for now and hides alert/confirmation boxes
    static async hiddenAction(action: (...args: any[]) => any, alertOrConfirm: "alert" | "confirm" = "alert", isDoubleModal = false, waitMs = 25) {

        const bg = !this.#cachedBG ? await HSElementHooker.HookElement('#transparentBG') as HTMLElement : this.#cachedBG;
        const confirmBox = !this.#cachedConfirmBox ? await HSElementHooker.HookElement('#confirmationBox') as HTMLElement : this.#cachedConfirmBox;
        const alertWrapper = !this.#cachedAlertWrapper ? await HSElementHooker.HookElement('#alertWrapper') as HTMLElement : this.#cachedAlertWrapper;

        this.#cachedBG = bg;
        this.#cachedConfirmBox = confirmBox;
        this.#cachedAlertWrapper = alertWrapper;

        const okAlert = document.querySelector('#ok_alert') as HTMLButtonElement;
        const okConfirm = document.querySelector('#ok_confirm') as HTMLButtonElement;

        const killedBg = HSUtils.#killElementDisplayProperties(bg);
        const killedConfirm = HSUtils.#killElementDisplayProperties(confirmBox);
        const killedAlertWrapper = HSUtils.#killElementDisplayProperties(alertWrapper);

        await action();
        await HSUtils.wait(waitMs);

        if(isDoubleModal) {
            okConfirm.click();
            await HSUtils.wait(waitMs);

            killedBg.restore();
            killedConfirm.restore();
            killedAlertWrapper.restore();

            okAlert.click();
        } else {
            killedBg.restore();
            killedConfirm.restore();
            killedAlertWrapper.restore();

            if(alertOrConfirm === "alert") {
                okAlert.click();
            } else {
                okConfirm.click();
            }
        }      
    }

    static async Noop() {
        return;
    }

    static eventBuffNumToName(buff: EventBuffType) {
        const reverse = {
            0: 'Quark',
            1: 'GoldenQuark',
            2: 'Cubes',
            3: 'PowderConversion',
            4: 'AscensionSpeed',
            5: 'GlobalSpeed',
            6: 'AscensionScore',
            7: 'AntSacrifice',
            8: 'Offering',
            9: 'Obtainium',
            10: 'Octeract',
            11: 'BlueberryTime',
            12: 'AmbrosiaLuck',
            13: 'OneMind',
        }

        return reverse[buff];
    }

    static async isLatestVersion() {
        const latestRelease = await HSGithub.getLatestRelease();
        
        if(latestRelease) {
            if(latestRelease.version !== HSGlobal.General.currentModVersion) {
                return false;
            }
        }

        return true;
    }
}
