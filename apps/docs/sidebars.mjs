import { adrFiles, adrId, packages } from './src/sources.mjs';

export default {
  docs: [
    'README',
    'ARCHITECTURE',
    {
      type: 'category',
      label: 'Packages',
      collapsed: false,
      items: packages().map((name) => `packages/${name}/README`),
    },
    {
      type: 'category',
      label: 'Planning with Claude Code',
      collapsed: false,
      link: { type: 'doc', id: '.claude/skills/README' },
      items: ['.claude/skills/vault-planning/conventions'],
    },
    {
      type: 'category',
      label: 'Decisions',
      collapsed: true,
      link: { type: 'doc', id: 'docs/adr/README' },
      items: adrFiles().map((name) => `docs/adr/${adrId(name)}`),
    },
  ],
};
