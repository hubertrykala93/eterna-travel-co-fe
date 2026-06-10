/**
 * PostCSS plugin: auto-inject `@reference 'tailwindcss'` into any stylesheet that
 * uses Tailwind's `@apply` / `@variant` / `theme()` APIs.
 *
 * Why this exists:
 *   Tailwind v4 compiles every stylesheet in isolation, so Angular component styles
 *   (.scss / inline) can't resolve utility classes used via @apply unless they first
 *   import the theme with `@reference`. Writing that line by hand in every component
 *   file is tedious — this plugin adds it automatically.
 *
 * Why a .cjs file (and not postcss.config.js):
 *   @angular/build only discovers `.postcssrc.json` / `postcss.config.json` (parsed as
 *   JSON), and loads each plugin by name via createRequire() relative to the config
 *   file. A JSON config can't hold a function, but it CAN reference this local module
 *   by relative path. The loader requires the export to be a function with
 *   `.postcss === true`, so that's exactly what we export.
 *
 * It must run BEFORE @tailwindcss/postcss in the plugin list.
 */
const plugin = () => ({
  postcssPlugin: 'postcss-tailwind-reference',
  Once(root) {
    let usesTailwindApi = false;
    let alreadyHasTheme = false;

    root.walkAtRules((rule) => {
      if (rule.name === 'apply' || rule.name === 'variant') {
        usesTailwindApi = true;
      }
      // Skip files that already pull in the theme themselves (e.g. global styles.scss).
      if (rule.name === 'tailwind') {
        alreadyHasTheme = true;
      }
      if (
        (rule.name === 'reference' || rule.name === 'import' || rule.name === 'use') &&
        /tailwindcss/.test(rule.params)
      ) {
        alreadyHasTheme = true;
      }
    });

    // theme() is a function, not an at-rule — also scan declaration values.
    if (!usesTailwindApi) {
      root.walkDecls((decl) => {
        if (decl.value.includes('theme(')) usesTailwindApi = true;
      });
    }

    if (!usesTailwindApi || alreadyHasTheme) return;

    root.prepend({ name: 'reference', params: "'tailwindcss'" });
  },
});

plugin.postcss = true;

module.exports = plugin;
