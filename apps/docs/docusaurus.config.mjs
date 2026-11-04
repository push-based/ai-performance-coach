import { themes } from 'prism-react-renderer';
import adrStatus from './src/remark/adr-status.mjs';
import obsidianCallouts from './src/remark/obsidian-callouts.mjs';
import repoLinks from './src/remark/repo-links.mjs';
import {
  BRANCH,
  EXCLUDE,
  INCLUDE,
  REPOSITORY,
  pageFor,
  repoRelative,
  repoRoot,
} from './src/sources.mjs';

const [owner, project] = REPOSITORY.split('/');
const github = `https://github.com/${REPOSITORY}`;

export default {
  title: 'ai-coach',
  tagline:
    'A study partner that makes you explain what you have read, in your own words.',
  favicon: 'img/favicon.svg',
  url: `https://${owner}.github.io`,
  baseUrl: `/${project}/`,
  organizationName: owner,
  projectName: project,
  trailingSlash: false,
  onBrokenLinks: 'throw',
  onBrokenAnchors: 'throw',
  onDuplicateRoutes: 'throw',
  i18n: { defaultLocale: 'en', locales: ['en'] },
  markdown: {
    format: 'detect',
    hooks: { onBrokenMarkdownLinks: 'throw' },
    parseFrontMatter: async (params) => {
      const result = await params.defaultParseFrontMatter(params);
      const page = pageFor(repoRelative(params.filePath), result.frontMatter);
      return { ...result, frontMatter: { ...result.frontMatter, ...page } };
    },
  },
  presets: [
    [
      'classic',
      {
        docs: {
          path: repoRoot,
          include: INCLUDE,
          exclude: EXCLUDE,
          routeBasePath: '/',
          sidebarPath: './sidebars.mjs',
          editUrl: ({ docPath }) => `${github}/edit/${BRANCH}/${docPath}`,
          beforeDefaultRemarkPlugins: [obsidianCallouts, repoLinks, adrStatus],
        },
        blog: false,
        pages: false,
        theme: { customCss: './src/css/custom.css' },
      },
    ],
  ],
  themes: [
    [
      '@easyops-cn/docusaurus-search-local',
      {
        hashed: true,
        indexBlog: false,
        indexPages: false,
        docsRouteBasePath: '/',
        docsDir: repoRoot,
        language: ['en'],
        highlightSearchTermsOnTargetPage: true,
        explicitSearchResultPath: true,
        searchResultLimits: 10,
      },
    ],
  ],
  themeConfig: {
    colorMode: { respectPrefersColorScheme: true },
    navbar: {
      title: 'ai-coach',
      logo: { alt: 'ai-coach', src: 'img/favicon.svg' },
      items: [
        {
          to: '/',
          label: 'Getting started',
          position: 'left',
          activeBaseRegex: '^/[^/]*/?$',
        },
        { to: '/architecture', label: 'Architecture', position: 'left' },
        { to: '/planning', label: 'Planning', position: 'left' },
        { to: '/decisions', label: 'Decisions', position: 'left' },
        { href: github, label: 'GitHub', position: 'right' },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            { label: 'Getting started', to: '/' },
            { label: 'Architecture', to: '/architecture' },
            { label: 'Planning with Claude Code', to: '/planning' },
            { label: 'Decisions', to: '/decisions' },
          ],
        },
        {
          title: 'Source',
          items: [
            { label: 'GitHub', href: github },
            {
              label: 'License (MIT)',
              href: `${github}/blob/${BRANCH}/LICENSE`,
            },
          ],
        },
      ],
      copyright: 'Every page is built from the Markdown in the repository.',
    },
    prism: {
      theme: themes.github,
      darkTheme: themes.dracula,
      additionalLanguages: ['bash', 'json'],
    },
  },
};
