# Game icons and sprite sheets

Use `HSIcons` from `src/mod/class/hs-utils/hs-icons.ts` when reusing a game icon.
Read the game's native element by its stable ID rather than hardcoding a removed
image path or copying the game's sprite sheet registry:

```ts
const source = document.getElementById('octeractCorruptionImage');
const icon = source ? HSIcons.fromElement(source) : null;
if (icon) HSIcons.applyBackground(target, icon, 35);
```

`fromElement` handles individual `img` sources and the game's sprite backgrounds.
For sprite images, it prioritizes the background over the transparent placeholder
in `src`. It reads the sheet URL, pixel offsets, displayed sheet dimensions and
tile dimensions, including elements inside hidden game tabs. This also uses the
game's current icon set and any sheet fallback it has already selected.

`applyBackground` scales the selected tile to the requested width and height.
It resets sprite positioning when switching back to an individual image.

Automation quickbar configurations can set `iconElementId` to reuse a native
game icon through this helper. Keep `iconSrc` as an individual-image fallback
for game versions that do not expose the native element.

For an existing `img` element or a setting that stores an image URL, use
`await HSIcons.toUrl(icon)`. It returns individual URLs directly and converts
sprite tiles into standalone PNG data URLs. This keeps quickbar and Heater icon
settings compatible with their existing string format. Crops use the original
sheet resolution, even for scaled aliases. Identical crops share a cached promise;
failed loads can be retried. Handle load or canvas errors without changing the
previous saved icon. Cross-origin sheets need to allow anonymous CORS for cropping.

For sheets without a native game element, construct an `HSIcon` with a `url` and
`sprite: { x, y, width, height, sheetWidth, sheetHeight }`. All six measurements
must use the same coordinate scale; rectangular sheets and tiles are supported.
The native adapter expects the game's single-layer backgrounds with pixel sizes
and offsets. Unsupported sprite geometry returns `null` rather than saving the
whole sheet. Read the native element again after a game icon-set change if the
consumer should follow that change.

The mod launcher includes the original 32px icon as a fallback for game versions
that do not expose the native icon. Source: SynergismOfficial,
`Pictures/Default/OcteractCorruptions.png` at commit
`f9e5f2bc282901b1d4d7b3e4e374ad8263a4a13f`.
