# [3.1.0](https://github.com/dtmirizzi/pi-governance/compare/v3.0.2...v3.1.0) (2026-03-31)

### Features

- add Dependency Guardian for slopsquatting and supply-chain protection ([1554dd7](https://github.com/dtmirizzi/pi-governance/commit/1554dd72772d2e0822b3f1040eed37ec98dfe671)), closes [#2](https://github.com/dtmirizzi/pi-governance/issues/2)

## [3.0.2](https://github.com/dtmirizzi/pi-governance/compare/v3.0.1...v3.0.2) (2026-03-31)

### Bug Fixes

- **ci:** add extensions subpath export for Docker smoke test ([c53ccb8](https://github.com/dtmirizzi/pi-governance/commit/c53ccb877a72fe968ea0761c480549ec7fff89d2))
- **ci:** fix Docker smoke test module resolution and formatting ([8a7e49c](https://github.com/dtmirizzi/pi-governance/commit/8a7e49c6b877ea39d9b8922378dcb90821c0e194))
- guard against undefined workingDirectory in session_start (issue [#1](https://github.com/dtmirizzi/pi-governance/issues/1)) ([8d65902](https://github.com/dtmirizzi/pi-governance/commit/8d6590253a142a2e84688da22d9e6920293022e8))

## [3.0.1](https://github.com/dtmirizzi/pi-governance/compare/v3.0.0...v3.0.1) (2026-03-31)

### Bug Fixes

- guard against undefined audit on shutdown and migrate repo URLs to dtmirizzi ([2dd0c56](https://github.com/dtmirizzi/pi-governance/commit/2dd0c56a87ecb77298e9bc17a257a3d0169ebda5))

# [3.0.0](https://github.com/Grwnd-AI/pi-governance/compare/v2.0.0...v3.0.0) (2026-03-02)

### Features

- rename PI*RBAC* env vars to PI*GOV* prefix ([aebf414](https://github.com/Grwnd-AI/pi-governance/commit/aebf41446c01f22345efad2b8096223ae5767262))

### BREAKING CHANGES

- Environment variables renamed from PI*RBAC* to PI*GOV* prefix.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>

# [2.0.0](https://github.com/Grwnd-AI/pi-governance/compare/v1.9.1...v2.0.0) (2026-03-02)

### Features

- rename GRWND* env vars to PI_RBAC* prefix ([93788b0](https://github.com/Grwnd-AI/pi-governance/commit/93788b04372b7a2df2656bbbbc4ff48be18206eb))

### BREAKING CHANGES

- Environment variables renamed from GRWND* to PI_RBAC* prefix.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>

## [1.9.1](https://github.com/Grwnd-AI/pi-governance/compare/v1.9.0...v1.9.1) (2026-03-02)

### Bug Fixes

- **openclaw:** add top-level register export for plugin loader ([c5382c1](https://github.com/Grwnd-AI/pi-governance/commit/c5382c1e984753d9952210c3accf85aa1fa4c390))

# [1.9.0](https://github.com/Grwnd-AI/pi-governance/compare/v1.8.0...v1.9.0) (2026-03-02)

### Features

- config self-protection, bash tamper detection, and openclaw manifest fix ([7b2801b](https://github.com/Grwnd-AI/pi-governance/commit/7b2801b84b942b25f791b8e0ec56e0d98d107dab))

# [1.8.0](https://github.com/Grwnd-AI/pi-governance/compare/v1.7.0...v1.8.0) (2026-03-01)

### Features

- add install commands section to docs landing page ([35b1f3d](https://github.com/Grwnd-AI/pi-governance/commit/35b1f3dee06344ac2a14c3efbe08d9e355c29860))

# [1.7.0](https://github.com/Grwnd-AI/pi-governance/compare/v1.6.0...v1.7.0) (2026-03-01)

### Features

- add /governance init wizard and revamp documentation ([0fed825](https://github.com/Grwnd-AI/pi-governance/commit/0fed825017e9e1eded138f6ca780c2e33e02ddf1))

# [1.6.0](https://github.com/Grwnd-AI/pi-governance/compare/v1.5.1...v1.6.0) (2026-03-01)

### Features

- enable DLP by default and suppress noisy rules-file warning ([3a1b035](https://github.com/Grwnd-AI/pi-governance/commit/3a1b035249de14a159537cb8c738e50d98bc7b68))

## [1.5.1](https://github.com/Grwnd-AI/pi-governance/compare/v1.5.0...v1.5.1) (2026-03-01)

### Bug Fixes

- handle missing governance-rules.yaml and replace deprecated lodash.isequal ([4d66754](https://github.com/Grwnd-AI/pi-governance/commit/4d66754a2ff03405f21925e8a3f7d216676faa2d))

# [1.5.0](https://github.com/Grwnd-AI/pi-governance/compare/v1.4.2...v1.5.0) (2026-03-01)

### Features

- add DLP module for secret/token and PII detection ([8ce7a1b](https://github.com/Grwnd-AI/pi-governance/commit/8ce7a1b9715f9231e5f2134bcf7873859aa1e586))

## [1.4.2](https://github.com/Grwnd-AI/pi-governance/compare/v1.4.1...v1.4.2) (2026-03-01)

### Bug Fixes

- retrigger release with updated npm token ([4afd522](https://github.com/Grwnd-AI/pi-governance/commit/4afd5222d7a768ffb62556e1b6d53d1216c96e9f))

## [1.4.1](https://github.com/Grwnd-AI/pi-governance/compare/v1.4.0...v1.4.1) (2026-03-01)

### Bug Fixes

- add publishConfig access public for scoped package ([c62ec09](https://github.com/Grwnd-AI/pi-governance/commit/c62ec097e6c97c2c7a9edd9111577ce81a031771))

# [1.4.0](https://github.com/Grwnd-AI/pi-governance/compare/v1.3.0...v1.4.0) (2026-03-01)

### Bug Fixes

- **ci:** include workspace root in recursive build and typecheck ([90983f0](https://github.com/Grwnd-AI/pi-governance/commit/90983f0cfa079e9dabbf97f8cb5bfa9fd3085ed0))

### Features

- add @grwnd/openclaw-governance identity bridge plugin ([6c68a20](https://github.com/Grwnd-AI/pi-governance/commit/6c68a200da1ee8343ee685a41755e6b4cad1db80))

# [1.3.0](https://github.com/Grwnd-AI/pi-governance/compare/v1.2.0...v1.3.0) (2026-03-01)

### Bug Fixes

- add NPM_TOKEN to release workflow for semantic-release auth ([a08e421](https://github.com/Grwnd-AI/pi-governance/commit/a08e421f1329a4d46120660193658bc48c535c07))
- remove registry-url from setup-node to fix npm auth ([6414efd](https://github.com/Grwnd-AI/pi-governance/commit/6414efd3055a48b2764fa8d6fcb9107cd78452cc))
- switch to npm trusted publishing via OIDC ([f893918](https://github.com/Grwnd-AI/pi-governance/commit/f893918ae40cd466a28d6c2d5455dcebe94a59d3))

### Features

- implement Phase 1 core engine ([0576964](https://github.com/Grwnd-AI/pi-governance/commit/05769646f1c2b6f175ba995fe7a56c0f49c9ca68))
- implement Phase 2 — Pi integration, audit, HITL, integration tests ([06a6686](https://github.com/Grwnd-AI/pi-governance/commit/06a66869d648d780e51d6551d7e09ead3254a2c1))
- implement Phase 3 — token budget, config hot-reload, benchmarks & examples ([4426bfb](https://github.com/Grwnd-AI/pi-governance/commit/4426bfb1a6d31d63e0005d4a05fa4ed6591f9793))

# [1.3.0](https://github.com/Grwnd-AI/pi-governance/compare/v1.2.0...v1.3.0) (2026-03-01)

### Bug Fixes

- add NPM_TOKEN to release workflow for semantic-release auth ([a08e421](https://github.com/Grwnd-AI/pi-governance/commit/a08e421f1329a4d46120660193658bc48c535c07))
- remove registry-url from setup-node to fix npm auth ([6414efd](https://github.com/Grwnd-AI/pi-governance/commit/6414efd3055a48b2764fa8d6fcb9107cd78452cc))
- switch to npm trusted publishing via OIDC ([f893918](https://github.com/Grwnd-AI/pi-governance/commit/f893918ae40cd466a28d6c2d5455dcebe94a59d3))

### Features

- implement Phase 1 core engine ([0576964](https://github.com/Grwnd-AI/pi-governance/commit/05769646f1c2b6f175ba995fe7a56c0f49c9ca68))
- implement Phase 2 — Pi integration, audit, HITL, integration tests ([06a6686](https://github.com/Grwnd-AI/pi-governance/commit/06a66869d648d780e51d6551d7e09ead3254a2c1))
- implement Phase 3 — token budget, config hot-reload, benchmarks & examples ([4426bfb](https://github.com/Grwnd-AI/pi-governance/commit/4426bfb1a6d31d63e0005d4a05fa4ed6591f9793))

# [1.3.0](https://github.com/Grwnd-AI/pi-governance/compare/v1.2.0...v1.3.0) (2026-03-01)

### Bug Fixes

- add NPM_TOKEN to release workflow for semantic-release auth ([a08e421](https://github.com/Grwnd-AI/pi-governance/commit/a08e421f1329a4d46120660193658bc48c535c07))
- remove registry-url from setup-node to fix npm auth ([6414efd](https://github.com/Grwnd-AI/pi-governance/commit/6414efd3055a48b2764fa8d6fcb9107cd78452cc))
- switch to npm trusted publishing via OIDC ([f893918](https://github.com/Grwnd-AI/pi-governance/commit/f893918ae40cd466a28d6c2d5455dcebe94a59d3))

### Features

- implement Phase 1 core engine ([0576964](https://github.com/Grwnd-AI/pi-governance/commit/05769646f1c2b6f175ba995fe7a56c0f49c9ca68))
- implement Phase 2 — Pi integration, audit, HITL, integration tests ([06a6686](https://github.com/Grwnd-AI/pi-governance/commit/06a66869d648d780e51d6551d7e09ead3254a2c1))
- implement Phase 3 — token budget, config hot-reload, benchmarks & examples ([4426bfb](https://github.com/Grwnd-AI/pi-governance/commit/4426bfb1a6d31d63e0005d4a05fa4ed6591f9793))

# [1.2.0](https://github.com/Grwnd-AI/pi-governance/compare/v1.1.0...v1.2.0) (2026-03-01)

### Features

- add social card for OG/Twitter previews ([1df9450](https://github.com/Grwnd-AI/pi-governance/commit/1df9450eb7173ac4e4b4c8d606d5bb66f3eb2e8c))

# [1.1.0](https://github.com/Grwnd-AI/pi-governance/compare/v1.0.0...v1.1.0) (2026-03-01)

### Features

- add README, logo, VitePress docs site, and GitHub Pages deployment ([f17a5d5](https://github.com/Grwnd-AI/pi-governance/commit/f17a5d57d736f1d6c71b116796dbca58ec48cc15))

# 1.0.0 (2026-03-01)

### Features

- scaffold Phase 0 — package foundation, CI/CD, and release pipeline ([2a4efb9](https://github.com/Grwnd-AI/pi-governance/commit/2a4efb9e420b164ecacf23b34e5b92aeae0aa3f3))
