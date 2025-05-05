import { CSSValue } from "../../types/module-types/hs-ui-types";
import { HSElementHooker } from "../hs-core/hs-elementhooker";
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

    static async hiddenAction(action: (...args: any[]) => any) {
        const bg = await HSElementHooker.HookElement('#transparentBG') as HTMLElement;
        const confirm = await HSElementHooker.HookElement('#alertWrapper') as HTMLElement;
        const okButton = document.querySelector('#ok_alert') as HTMLButtonElement;
        bg.style.display = 'none !important';
        confirm.style.display = 'none !important';
        await action();
        await HSUtils.wait(50);
        okButton.click();
        bg.style.display = 'none';
        confirm.style.display = 'none';
    }
}
