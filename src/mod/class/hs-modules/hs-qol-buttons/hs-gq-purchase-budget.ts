/**
 * Encode a whole-GQ budget for the game's locale-aware purchase parser.
 * ASCII digits and an integer significand avoid decimal/group separator ambiguity,
 * including scientific notation above 1e21, without rounding the budget upwards.
 */
export function formatGQPurchaseBudget(amount: number): string {
    if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount < 0) {
        throw new Error('Invalid GQ purchase budget.');
    }
    const text = amount.toString();
    const [significand, exponent] = text.split('e');
    const dot = significand.indexOf('.');
    if (dot === -1) return text;
    const decimals = significand.length - dot - 1;
    return `${significand.replace('.', '')}e${Number(exponent) - decimals}`;
}
