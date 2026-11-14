# Changelog

All notable changes to CineView. Versions follow [Semantic Versioning](https://semver.org): **MAJOR.MINOR.PATCH**.
Every version is archived as a ready-to-load zip in [`releases/`](releases/) and tagged in git (`vX.Y.Z`).

## Website update (2026-11-14)
- Added a privacy policy page at /privacy (linked from the footer) for the Chrome Web Store listing.

## v2.4.3 (2026-11-14)
- BookMyShow's newer seat layout (drawn on a canvas with Konva) is now read directly: real rows, seat numbers, booked seats, section breaks and your selected seats, instead of falling back to a typical hall. A small page script (`content/konva-bridge.js`) reads the seat objects and never changes the page. Needs Chrome 111 or later.
- Trailer search ignores a language suffix in the title ("Jailer 2 - Tamil", "Coolie (Telugu)") and uses it as the language hint instead, so these films find their trailer.
- Notices now appear below the top pills instead of under the format pill.

## Website update — mobile fixes (2026-11-14)
- Hero live demo now shows on iPhone Safari: the stage is sized in pixels instead of relying on `aspect-ratio`.
- Hero hall is now drawn on canvas with the same camera maths, so iPhone Safari renders it exactly like Chrome (CSS 3D drew the seats and the trailer at the wrong size there). The trailer sits in a flat layer placed exactly where the screen projects.
- Screen-format demo now resizes the trailer screen for each format (Scope, IMAX, Widescreen, 16:9) on mobile; all formats share one base width so IMAX reads taller, not just bigger.

## v2.4.2 — 2026-11-14
- Fixed seat numbers in rows where every seat is booked. The extension showed "Seat –" there; it now takes the number from the seat in the same column of another row, and reads the numbering direction (16→1 or 1→16) from rows that show at least two numbers. Seen on District halls that are nearly sold out.
- Promo video for LinkedIn (54 s, 1440 × 1080), made with HyperFrames.

## Website update — 2026-11-14 (live demo)
- Hero: the static screenshot is replaced by a **live demo** with two separate panels. On the left, the cinema view plays an official trailer (muted autoplay, with a sound button). On the right, you choose the movie and pick a seat, and the view, score and stats update. There's no connecting divider between the panels.
- Trailers: F1 The Movie (Warner Bros.) and Spider-Man: Brand New Day (Sony Pictures), embedded from the studios' official YouTube channels. They play only while visible.
- IMAX section: the selected trailer plays inside the screen and covers it at each format's real proportions. The section has a mobile layout (screen sized to the viewport, 2×2 format picker, tighter spacing) with no sideways scrolling.
- Removed all Ramayana images. The share image now shows original CineView artwork on the screen.

## v2.4.1 — 2026-11-14
- New **CINEVIEW** logo on the website header and footer, the extension popup and settings page, and the README. The circular icon is unchanged.
- New social share image (option B, "Cinematic") with an absolute URL and size tags, so WhatsApp, X, LinkedIn and Slack show it reliably.

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
