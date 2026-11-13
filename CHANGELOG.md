# Changelog

All notable changes to CineView. Versions follow [Semantic Versioning](https://semver.org): **MAJOR.MINOR.PATCH**.
Every version is archived as a ready-to-load zip in [`releases/`](releases/) and tagged in git (`vX.Y.Z`).

## Website update — 2026-11-14
- Typography: the site uses Netflix Sans where it's installed, with Inter (self-hosted) as the bundled fallback, everywhere.
- Single favicon: the circular CinemaScope mark (PNG and ICO only). Removed the SVG, Apple touch and manifest icon variants.
- Header shows the full CineView wordmark, the same one as the footer.
- Hero: no CinemaScope mask. The headline stays fixed and fades as the preview scrolls up over it with a gentle parallax. The effect is turned off on small screens and for reduced motion.
- Images: removed the 7-day cache on `/assets`, which could keep a failed image response cached in the browser, and added `?v=3` to image URLs so browsers fetch fresh copies.
- No horizontal scrolling: grid and flex children can shrink, long words wrap, and the page clips sideways overflow. Tested at 320–1440 px, including with every image failing.

## v2.4.0 — 2026-11-14
- New app icon: the red concave screen on a white disk, used for the toolbar icon and site favicon (SVG, ICO, PNG and Apple touch icon).
- **CineView website** in `website/`: landing page, how it works, interactive screen-format demo, install guide with a direct download, and FAQ. It's a static site with a self-hosted Archivo font, live at **https://cineview-ten.vercel.app**. Vercel deploys it from `website/` on every push to `main`.

## v2.3.0 — 2026-11-14
- **Screen format dropdown** at the top right of the preview, showing *where* the format was detected (showtime chip, cinema name or header) with an **Auto** badge; pick any format manually and the screen animates to it.
- Better format detection: reads the selected showtime chip and its caption (for example "10:30 PM · IMAX 3D") and IMAX in the cinema or screen name, and updates when you switch shows while the preview is open.
- New brand: the **CineView wordmark** in the popup, settings page and README. Toolbar icons use the wordmark's "C" inside its frame.
- "From this seat" list: content wraps cleanly with no horizontal scrolling; the panel width adapts to the window.
- Seat map legend centred.
- Format picker removed from Settings, since the dropdown replaces it.
- Project restructured: the extension lives in `extension/`, versions are archived in `releases/`, and brand assets are in `docs/logo/`.

## v2.2.0 — 2026-11-14
- Zoomable seat map: − / + / fit buttons, trackpad pinch, drag and two-finger pan, seat numbers when zoomed, keys + / − / 0.
- Seat map moved above "From this seat".
- Format detected from the showtime chip; the IMAX screen is larger and floor-to-ceiling.
- Camera framing keeps tall screens in view.
- *(manifest still reported 2.0.0 in this build)*

## v2.1.0 — 2026-11-14
- Fixed the side panel flickering over the playing trailer.
- Smaller seat score ring.
- *(manifest still reported 2.0.0 in this build)*

## v2.0.0 — 2026-11-14
- Renamed from SeatView to **CineView**, with an Apple-style redesign.
- Seats drawn individually, no people in the preview.
- Screen formats: CinemaScope, IMAX, Flat, 16:9.
- Strict trailer matching: platform trailer links verified by title, filtered YouTube search, and no unrelated videos.
- Settings behind a gear icon next to Close.

## v1.0.0 — 2026-11-14 (SeatView prototype)
- First working extension: seat map detection on District and BookMyShow, a CSS-3D view from the seat, YouTube trailer on the screen, and seat scoring.
