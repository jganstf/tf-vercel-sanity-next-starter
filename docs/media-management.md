# Media management in Studio

Two ways to give editors a browsable asset library in Studio. This repo uses **`sanity-plugin-media`**.

## `sanity-plugin-media` (in use)

Free, community plugin. Adds a "Media" tool to Studio's nav with a grid/browser for assets already uploaded to this dataset.

- No cost, no external setup — registered in [studio/sanity.config.ts](../studio/sanity.config.ts) via `media()`.
- Scoped to this dataset only; assets aren't shared across projects/datasets.

## Native Sanity Media Library (not in use)

Sanity's first-party, project-level asset library that can span multiple datasets/projects. Enabled via the `mediaLibrary: { enabled: true }` option in `defineConfig`, with no extra dependency.

- **Requires a paid plan**: not included on Free; available on Growth only as a paid add-on; included on Enterprise. See [sanity.io/pricing](https://www.sanity.io/pricing).
- Also requires a Media Library to be created and connected to the project via [manage.sanity.io](https://manage.sanity.io) — that setup step lives outside this codebase.

## When to revisit

If the Sanity project moves to a plan that includes the Media Library add-on and cross-project/dataset asset sharing becomes a real need, switch back to the native option: drop the `mediaLibrary` config back in, and decide whether to keep or remove `sanity-plugin-media` alongside it.
