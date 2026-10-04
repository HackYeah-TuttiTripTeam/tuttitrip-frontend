// Architecture rules for src/. Run with `pnpm test:arch` (also runs scripts/check-arch.mjs
// for the rules dependency-cruiser cannot express). Documented in AGENTS.md.

const NPM = ['npm', 'npm-dev', 'npm-optional', 'npm-peer', 'npm-no-pkg', 'npm-unknown']

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'views-no-cross-import',
      comment:
        'Rule 1: a view must not import another view. Move shared UI to components/ and shared logic to hooks/.',
      severity: 'error',
      from: { path: '^src/views/([^/.]+)' },
      to: { path: '^src/views/', pathNot: '^src/views/$1([./]|$)' },
    },
    {
      name: 'components-are-presentational',
      comment:
        'Rule 2: components/** must not import views, hooks, stores, loaders or routes. Pass data and callbacks in as props.',
      severity: 'error',
      from: { path: '^src/components/' },
      to: { path: '^src/(views|hooks|stores|loaders|routes)/', dependencyTypesNot: ['type-only'] },
    },
    {
      name: 'components-no-data-layer',
      comment:
        'Rule 2: components/** must not fetch or hold app state (api client, TanStack Query, Zustand, Auth0). Type-only imports of API types are fine.',
      severity: 'error',
      from: { path: '^src/components/' },
      to: {
        path: [
          '^src/api/',
          'node_modules/(@tanstack/react-query|zustand|@auth0/auth0-react|openapi-fetch|openapi-react-query)/',
        ],
        dependencyTypesNot: ['type-only'],
      },
    },
    {
      name: 'hooks-no-jsx',
      comment:
        'Rule 3: hooks/ hold logic only. No components, views or the JSX runtime (no .tsx files is checked by scripts/check-arch.mjs).',
      severity: 'error',
      from: { path: '^src/hooks/' },
      to: { path: ['^src/(components|views|routes)/', 'node_modules/react/jsx(-dev)?-runtime'] },
    },
    {
      name: 'routes-only-views-and-loaders',
      comment:
        'Rule 4: route files only wire things up: views, loaders (search schemas, loader functions, router context), @tanstack/react-router and zod.',
      severity: 'error',
      from: { path: '^src/routes/' },
      to: {
        pathNot: [
          '^src/(views|loaders)/',
          'node_modules/(@tanstack/react-router|@tanstack/router-core|zod)/',
        ],
      },
    },
    {
      name: 'loaders-no-ui',
      comment: 'Loaders run before render: no React components, views, hooks or stores.',
      severity: 'error',
      from: { path: '^src/loaders/' },
      to: { path: '^src/(components|views|hooks|stores|routes)/' },
    },
    {
      name: 'stores-and-api-no-ui',
      comment: 'Stores and the API layer stay UI-free.',
      severity: 'error',
      from: { path: '^src/(stores|api)/' },
      to: { path: '^src/(components|views|hooks|routes|loaders)/' },
    },
    {
      name: 'ag-ui-only-in-hooks-and-api',
      comment:
        'Rule 9: the AG-UI client (@ag-ui/*) is used by hooks/ and api/ only; components, views, routes, loaders, lib and stores get its results as props and plain types. Decision of spike #24.',
      severity: 'error',
      from: { path: '^src/', pathNot: '^src/(hooks|api)/' },
      to: { path: 'node_modules/@ag-ui/' },
    },
    {
      name: 'no-copilotkit',
      comment:
        'Rule 9: CopilotKit was rejected in spike #24 (production needs a licence key, its runtime does not start in a Worker). @copilotkit/* is not allowed anywhere.',
      severity: 'error',
      from: {},
      to: { path: 'node_modules/@copilotkit/' },
    },
    {
      name: 'no-circular',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
    {
      name: 'not-to-unresolvable',
      severity: 'error',
      from: {},
      to: { couldNotResolve: true, pathNot: '^virtual:' },
    },
    {
      name: 'no-non-package-json',
      comment: 'Every npm import must be declared in package.json.',
      severity: 'error',
      from: {},
      to: { dependencyTypes: ['npm-no-pkg', 'npm-unknown'] },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules', dependencyTypes: NPM },
    exclude: { path: ['^src/routeTree\\.gen\\.ts$'] },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.app.json' },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
      mainFields: ['module', 'main', 'types', 'typings'],
    },
    reporterOptions: { text: { highlightFocused: true } },
  },
}
