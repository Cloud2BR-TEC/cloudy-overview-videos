# Cloud2BR TEC Hub Cloudy's YouTube Videos

[Cloud2BR-TEC/Cloudy-overview-videos](https://github.com/Cloud2BR-TEC/Cloudy-overview-videos)

[![Total views](https://camo.githubusercontent.com/4e8da418f66f37f31e68bbb1db39e91dab33fc87128f2172966a1d7a457d5377/68747470733a2f2f696d672e736869656c64732e696f2f62616467652f546f74616c25323076696577732d313836352d6c696d65677265656e)](https://camo.githubusercontent.com/4e8da418f66f37f31e68bbb1db39e91dab33fc87128f2172966a1d7a457d5377/68747470733a2f2f696d672e736869656c64732e696f2f62616467652f546f74616c25323076696577732d313836352d6c696d65677265656e)

Refresh Date: 2026-07-13

## GitHub Pages Application

Cloudy Repository Video Studio is a static GitHub Pages application. It reads public GitHub repositories directly from the GitHub API, collects repository metadata, README content, and root image assets, then creates an editable Cloudy storyboard. Projects remain in browser local storage and can be exported as JSON with editable SRT captions.

### Private Repositories

For a private repository, users can connect a fine-grained GitHub personal access token with read-only access to selected repositories. The token is held only in `sessionStorage` for the active browser session and is sent only to `api.github.com`; it is not committed, logged, or stored in local project files.

GitHub Pages cannot safely host an OAuth client secret, shared AI credential, or server-side video renderer. This release therefore does not claim GitHub ownership validation, hosted AI generation, direct YouTube upload, or MP4 server rendering. All active features run in the browser.

## Run Locally

```bash
npm install
npm run dev
```

## Validate and Deploy

```bash
npm run lint
npm run build
```

The `Quality` workflow verifies every change. The `Pages` workflow publishes the static `dist` output from `main`.

## License

This project is licensed under the [GNU Affero General Public License v3.0](LICENSE).