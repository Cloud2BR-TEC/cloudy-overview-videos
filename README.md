# Cloud2BR TEC Hub Cloudy's YouTube Videos

[![GitHub](https://camo.githubusercontent.com/3d6e70cdbf17b7ad9eaa0d34b05c2bc930aa7ae4238ec215244b20ed6917e19f/68747470733a2f2f696d672e736869656c64732e696f2f62616467652f2d2d3138313731373f6c6f676f3d676974687562266c6f676f436f6c6f723d666666666666)](https://github.com/) [Cloud2BR TEC](https://github.com/Cloud2BR-TEC)

Last updated: 2026-07-21

-----------------

Cloudy Repository Video Studio is a static GitHub Pages application. Paste a public GitHub repository URL to create an editable Cloudy storyboard from repository metadata, README content, and images discovered across the repository. Cloudy can preview narration using a locally available female voice when the browser provides one. Editing remains in the current browser session; project setup, SRT captions, and WebM video downloads unlock after all export requirements are complete.

> [!IMPORTANT]
> Paste a canonical public repository URL such as `https://github.com/owner/repository`, then select **Generate explainer**.

Cloudy reads public GitHub API data to assemble the storyboard. Slide titles, bullets, and narration come from substantive sections in the main README and English or default-language Markdown under `docs/`; localized non-English docs are ignored. Repository layout, configuration, automation, contribution, license, and file-path details are not used as presentation filler. Internal editorial directions are never shown as presentation content. Each slide reserves different material evidence, and substantially similar slide content fails validation instead of being repeated. Repository planning files named `agenda.yml` or `agenda.yaml` are excluded. Cloudy does not write to repositories or upload content. Private repositories cannot be used in this browser-only version.

Each generated storyboard follows a balanced ten-minute template: five sections, ten Markdown slides per section, and twelve seconds per slide. The resulting 50 slides total 600 seconds and cycle repository images one image per slide. Edited narration remains constrained to the 10-15 second slide pacing range.

The browser creates the downloadable WebM video locally with Cloudy narration and on-screen captions. On first export, it downloads and caches a browser-local female voice model; later exports reuse that model automatically. No screen-sharing permission or tab-audio selection is required. Keep the tab active until the real-time render finishes.

<!-- START BADGE -->
<div align="center">
  <img src="https://img.shields.io/badge/Total%20views-1865-limegreen" alt="Total views">
  <p>Refresh Date: 2026-07-13</p>
</div>
<!-- END BADGE -->