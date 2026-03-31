import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'pi-governance',
  description: 'Governance, RBAC, audit, and HITL for Pi-based coding agents',
  base: '/pi-governance/',

  head: [
    ['link', { rel: 'icon', href: '/pi-governance/logo.png' }],
    ['meta', { property: 'og:image', content: '/pi-governance/social-card.png' }],
    ['meta', { property: 'og:image:width', content: '1200' }],
    ['meta', { property: 'og:image:height', content: '630' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:image', content: '/pi-governance/social-card.png' }],
  ],

  themeConfig: {
    logo: '/logo.png',

    nav: [
      { text: 'Guide', link: '/guide/quickstart' },
      { text: 'Reference', link: '/reference/config' },
      {
        text: 'npm',
        link: 'https://www.npmjs.com/package/@grwnd/pi-governance',
      },
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Getting Started',
          items: [
            { text: 'Quick Start', link: '/guide/quickstart' },
            { text: 'Why Governance?', link: '/guide/why' },
            { text: 'Common Scenarios', link: '/guide/scenarios' },
            { text: 'Team Deployment', link: '/guide/team-deployment' },
            { text: 'Architecture', link: '/guide/architecture' },
            { text: 'Worked Examples', link: '/guide/examples' },
          ],
        },
        {
          text: 'Policy',
          items: [
            { text: 'YAML Policies', link: '/guide/yaml-policies' },
            { text: 'Oso/Polar Policies', link: '/guide/oso-policies' },
            { text: 'Bash Classifier', link: '/guide/bash-classifier' },
          ],
        },
        {
          text: 'Operations',
          items: [
            { text: 'Human-in-the-Loop', link: '/guide/hitl' },
            { text: 'Audit Logging', link: '/guide/audit' },
            { text: 'Data Loss Prevention', link: '/guide/dlp' },
            { text: 'Dependency Guardian', link: '/guide/dependency-guardian' },
            { text: 'Guardian Roadmap', link: '/guide/dependency-guardian-roadmap' },
            { text: 'Security', link: '/guide/security' },
            { text: 'OpenClaw', link: '/guide/openclaw' },
          ],
        },
      ],
      '/reference/': [
        {
          text: 'Reference',
          items: [
            { text: 'Configuration', link: '/reference/config' },
            { text: 'API', link: '/reference/api' },
            { text: 'Bash Patterns', link: '/reference/bash-patterns' },
            { text: 'DLP Patterns', link: '/reference/dlp-patterns' },
            { text: 'Audit Schema', link: '/reference/audit-schema' },
          ],
        },
      ],
    },

    socialLinks: [{ icon: 'github', link: 'https://github.com/dtmirizzi/pi-governance' }],

    footer: {
      message: 'Released under the Apache-2.0 License.',
      copyright: 'Copyright 2026 dtmirizzi',
    },
  },
});
