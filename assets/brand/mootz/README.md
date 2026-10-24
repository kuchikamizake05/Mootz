# Mootz brand assets

Mootz is the selected name for the social Map + Feed / Meet product. Repository: [kuchikamizake05/mootz](https://github.com/kuchikamizake05/mootz). This folder contains the first logo exports, used in the root README; client UI implementation has not started.

## Assets

- Horizontal logo: [PNG](mootz-logo-v1.png) and [SVG](mootz-logo-v1.svg), canvas 2129 x 739.
- Standalone symbol: [PNG](mootz-symbol-v1.png) and [SVG](mootz-symbol-v1.svg), canvas 1254 x 1254.
- [Exact generation prompts](PROMPTS.md).

Concept: two people meeting form a rounded M, paired with a chunky friendly Mootz wordmark. The palette follows the existing purple brand direction. PNGs retain the original imagegen concept; SVGs provide transparent, flat-purple vector outlines in `#6D28D9`. Both formats remain a first brand exploration; manual typography/kerning refinement can follow owner review.

## Using the SVGs

Both SVGs use closed cubic paths with a scalable `viewBox`; they contain no embedded PNG, scripts, external URLs, or font dependency. The wordmark is outlined, so it does not require an installed font. Change the group's `fill` value to recolor the asset. Preserve the aspect ratio when scaling and retain the accessible title/description when embedding inline.

The SVGs trace the PNG alpha silhouette at threshold 128, simplify contours at a 0.7-pixel tolerance, and fit closed cubic curves with a half-pixel alignment for SVG rasterization. A compound path preserves the counters in both o letters. The SVGs intentionally use a single solid color rather than tracing the generated PNG's subtle color variation.
