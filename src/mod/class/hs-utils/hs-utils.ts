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
}
