// Utils cöass
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

    static typedObjectEntries<T extends object>(obj: T): [keyof T, T[keyof T]][] {
        return Object.entries(obj) as [keyof T, T[keyof T]][];
    }

    static N(num: string | number) {
        let tempNum = 0;
        let numString = '';

        try {
            if(typeof num === "string")
                tempNum = parseFloat(num);
            else
                tempNum = num;

            if(tempNum > 1_000_000) {
                numString = tempNum.toExponential(2).replace('+', '');
            } else {
                numString = tempNum.toFixed(2);
            }
        } catch (e) {
            console.error(`[HS]: HSUtil.N FAILED FOR ${num}`);
            return numString;
        }

        return numString;
    }
}
