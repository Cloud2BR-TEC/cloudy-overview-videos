# Cloud2BR TEC Hub Cloudy's YouTube Videos

[![GitHub](https://camo.githubusercontent.com/3d6e70cdbf17b7ad9eaa0d34b05c2bc930aa7ae4238ec215244b20ed6917e19f/68747470733a2f2f696d672e736869656c64732e696f2f62616467652f2d2d3138313731373f6c6f676f3d676974687562266c6f676f436f6c6f723d666666666666)](https://github.com/) [Cloud2BR TEC](https://github.com/Cloud2BR-TEC)

Last updated: 2026-07-21

-----------------

Cloudy Repository Video Studio is a static GitHub Pages application. Paste a public GitHub repository URL to create an editable Cloudy storyboard from repository metadata, README content, and images discovered across the repository. Cloudy can preview narration using a locally available female voice when the browser provides one. Editing remains in the current browser session; project setup, SRT captions, and WebM video downloads unlock after all export requirements are complete.

> [!IMPORTANT]
> Paste a canonical public repository URL such as `https://github.com/owner/repository`, then select **Generate explainer**.

The source field also accepts copied GitHub tree or file-page URLs, `www.github.com` links, trailing slashes, and Markdown-style links. Select **Generate explainer** or press Enter. Transient GitHub failures are retried, progress remains visible while slides are built, and requests time out with a visible message instead of remaining indefinitely in the reading state. A repository must contain at least 50 distinct substantive passages across its README and English docs to produce the required non-repeating storyboard.

Cloudy reads public GitHub API data to assemble the storyboard. It uses substantive Markdown from the repository's `docs/` folder as the primary source. When `docs/` contains internationalized content, Cloudy selects the English variant, including common `i18n`, `l10n`, `locale`, and `translations` directory layouts, and avoids duplicate default-language copies. The main README is used only when no usable `docs/` Markdown is available. Repository layout, configuration, automation, contribution, license, and file-path details are not used as presentation filler. Internal editorial directions are never shown as presentation content. Each slide reserves different material evidence, and substantially similar slide content fails validation instead of being repeated. Repository planning files named `agenda.yml` or `agenda.yaml` are excluded. Cloudy does not write to repositories or upload content. Private repositories cannot be used in this browser-only version.

Slide imagery follows the documentation's own section placement. Cloudy uses an image only when that image is embedded in the same Markdown section as the slide content; otherwise, the slide uses a neutral material-focused placeholder instead of an unrelated repository image.

Each generated storyboard follows a balanced ten-minute template: five sections, ten Markdown slides per section, and twelve seconds per slide. The resulting 50 slides total 600 seconds and cycle repository images one image per slide. Cloudy introduces every slide title and narrates all displayed text; exports are blocked if an edit creates on-screen text that is not covered by the narration. Edited narration remains constrained to the 10-15 second slide pacing range.

The browser creates the downloadable WebM video locally with Cloudy narration, on-screen captions, and an embedded Cloud2BR watermark. The live preview supports `1x`, `1.25x`, `1.5x`, `1.75x`, `2x`, and `2.5x` narration speeds. The selected speed is also used for video downloads and every timing-based publishing artifact. The export panel provides SRT and WebVTT caption files, a plain-text transcript, a timestamped descriptive transcript with the visual context of every slide, YouTube chapter markers, and a Markdown publishing package with upload-ready video details, chapters, caption guidance, and the full transcript. These assets remain synchronized with the selected video timing, so published video can include a selectable captions track, an accessible text alternative, and navigable chapters. On first export, it downloads and caches a browser-local female voice model; later exports reuse that model automatically. No screen-sharing permission or tab-audio selection is required. Keep the tab active until the real-time render finishes.

<!-- START BADGE -->
<div align="center">
  <img src="https://img.shields.io/badge/Total%20views-1865-limegreen" alt="Total views">
  <p>Refresh Date: 2026-07-13</p>
</div>
<!-- END BADGE -->