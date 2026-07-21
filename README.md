# Cloud2BR TEC Hub Cloudy's YouTube Videos

[![GitHub](https://img.shields.io/badge/--181717?logo=github&logoColor=ffffff)](https://github.com/)
[Cloud2BR TEC](https://github.com/Cloud2BR-TEC)

Last updated: 2026-07-13

----------

## Scope

Cloudy Repository Video Studio turns an authorized public GitHub repository into an editable, accessible YouTube explainer. It starts with a public repository snapshot and an editable Cloudy-led storyboard, then will connect to protected services for GitHub App authorization, AI assistance, source retrieval, and video rendering.

## Local Development

```bash
npm install
npm run dev
```

## Quality and Deployment

```bash
npm run lint
npm run build
```

The `Pages` workflow deploys the static frontend. No GitHub token, AI credential, private repository content, or rendering workload is stored in the frontend; those capabilities require the separate protected service described in the project plan.

## License

This project is licensed under the [GNU Affero General Public License v3.0](LICENSE).# Cloudy Overview Videos Generator

[![GitHub](https://img.shields.io/badge/--181717?logo=github&logoColor=ffffff)](https://github.com/)
[Cloud2BR TEC](https://github.com/Cloud2BR-TEC)

Last updated: 2026-07-13

----------

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

<!-- START BADGE -->
<div align="center">
	<img src="https://img.shields.io/badge/Total%20views-1865-limegreen" alt="Total views">
	<p>Refresh Date: 2026-07-13</p>
</div>
<!-- END BADGE -->