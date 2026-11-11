import { HSUtils } from "./hs-utils";

export interface HSSpriteRegion {
    /** Coordinates in the sheet's displayed CSS pixels, before scaling the icon. */
    x: number;
    y: number;
    width: number;
    height: number;
    sheetWidth: number;
    sheetHeight: number;
}

export interface HSIcon {
    url: string;
    sprite?: HSSpriteRegion;
}

/** Shared adapter for individual images and the game's CSS sprite sheets. */
export class HSIcons {
    static readonly #croppedIcons = new Map<string, Promise<string>>();

    /** Read the native icon so sheet coordinates and icon-set fallbacks stay owned by the game. */
    static fromElement(element: Element): HSIcon | null {
        const style = window.getComputedStyle(element);
        const match = /^url\((?:"([^"]*)"|'([^']*)'|([^()]*))\)$/.exec(style.backgroundImage);
        const backgroundUrl = match?.[1] ?? match?.[2] ?? match?.[3];

        // Sprite images use a transparent src; the artwork lives in the background.
        if (backgroundUrl) {
            const sheetSize = this.#pixelPair(style.backgroundSize);
            const position = this.#pixelPair(style.backgroundPosition);
            const width = Number.parseFloat(style.width);
            const height = Number.parseFloat(style.height);
            if (sheetSize && position && width > 0 && height > 0
                && sheetSize[0] >= width && sheetSize[1] >= height
                && position[0] <= 0 && position[1] <= 0
                && width - position[0] <= sheetSize[0] && height - position[1] <= sheetSize[1]) {
                return {
                    url: new URL(backgroundUrl, document.baseURI).href,
                    sprite: {
                        x: -position[0], y: -position[1], width, height,
                        sheetWidth: sheetSize[0], sheetHeight: sheetSize[1]
                    }
                };
            }
            // Do not accidentally return the whole sheet for unsupported sprite geometry.
            if (/Sprite(?:%20| )Sheets/i.test(backgroundUrl)) return null;
            return { url: new URL(backgroundUrl, document.baseURI).href };
        }

        if (element instanceof HTMLImageElement) {
            const url = element.currentSrc || element.src;
            if (url && !/(?:img_transparent|transparent)\.png(?:[?#]|$)/i.test(url)) return { url };
        }
        return null;
    }

    /** Paint a tile at any size without downloading or cropping another copy of the sheet. */
    static applyBackground(element: HTMLElement, icon: HSIcon, width: number, height = width): void {
        element.style.backgroundImage = HSUtils.cssUrl(icon.url);
        element.style.backgroundRepeat = 'no-repeat';
        if (icon.sprite) {
            const region = icon.sprite;
            const scaleX = width / region.width;
            const scaleY = height / region.height;
            element.style.backgroundSize = `${region.sheetWidth * scaleX}px ${region.sheetHeight * scaleY}px`;
            element.style.backgroundPosition = `${-region.x * scaleX}px ${-region.y * scaleY}px`;
        } else {
            element.style.backgroundSize = 'contain';
            element.style.backgroundPosition = 'center';
        }
    }

    /** Produce an ordinary URL for existing img elements and saved quickbar/Heater overrides. */
    static toUrl(icon: HSIcon): Promise<string> {
        if (!icon.sprite) return Promise.resolve(icon.url);
        const key = JSON.stringify(icon);
        const cached = this.#croppedIcons.get(key);
        if (cached) return cached;
        const pending = this.#crop(icon).catch(error => {
            this.#croppedIcons.delete(key);
            throw error;
        });
        this.#croppedIcons.set(key, pending);
        return pending;
    }

    static #pixelPair(value: string): [number, number] | null {
        const parts = value.trim().split(/\s+/);
        if (parts.length !== 2 || !parts.every(part => /^-?\d+(?:\.\d+)?px$/.test(part))) return null;
        return [Number.parseFloat(parts[0]), Number.parseFloat(parts[1])];
    }

    static async #crop(icon: HSIcon): Promise<string> {
        const region = icon.sprite!;
        if (![region.width, region.height, region.sheetWidth, region.sheetHeight].every(value => Number.isFinite(value) && value > 0)
            || ![region.x, region.y].every(value => Number.isFinite(value) && value >= 0)
            || region.x + region.width > region.sheetWidth || region.y + region.height > region.sheetHeight) {
            throw new Error('Invalid sprite region');
        }
        const image = new Image();
        const source = new URL(icon.url, document.baseURI);
        if (/^https?:$/.test(source.protocol) && source.origin !== window.location.origin) image.crossOrigin = 'anonymous';
        image.src = source.href;
        await image.decode();

        // Aliases can display a 32px tile at 20px or 24px. Convert CSS coordinates back to source pixels.
        const scaleX = image.naturalWidth / region.sheetWidth;
        const scaleY = image.naturalHeight / region.sheetHeight;
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(region.width * scaleX));
        canvas.height = Math.max(1, Math.round(region.height * scaleY));
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Cannot create icon canvas');
        context.drawImage(image, region.x * scaleX, region.y * scaleY,
            region.width * scaleX, region.height * scaleY, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/png');
    }
}
