import { globSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPOSITORY = 'push-based/ai-performance-coach';
export const BRANCH = 'main';
export const repoRoot = fileURLToPath(new URL('../../..', import.meta.url));

export const INCLUDE = [
  'README.md',
  'ARCHITECTURE.md',
  'CONTRIBUTING.md',
  'docs/guide/*.md',
  'packages/*/README.md',
  '.claude/skills/README.md',
  '.claude/skills/vault-planning/conventions.md',
  'docs/adr/*.md',
];

export const EXCLUDE = ['docs/adr/template.md', '**/node_modules/**'];

export const GUIDE = [
  'setup',
  'first-session',
  'the-climb',
  'commands',
  'coaching-styles',
  'configuration',
  'privacy',
  'troubleshooting',
  'glossary',
];

const PACKAGE_ORDER = [
  'domain',
  'application',
  'adapter-ollama',
  'adapter-gemini',
  'adapter-vault-mcp',
  'adapter-local-state',
  'cli',
];

export function siteFiles() {
  return new Set(
    globSync(INCLUDE, { cwd: repoRoot, exclude: EXCLUDE }).map(toPosix),
  );
}

export function toPosix(path) {
  return path.split(sep).join('/');
}

export function repoRelative(absolutePath) {
  return toPosix(relative(repoRoot, absolutePath));
}

export function packages() {
  const found = readdirSync(join(repoRoot, 'packages')).filter((name) =>
    siteFiles().has(`packages/${name}/README.md`),
  );
  const rank = (name) => {
    const index = PACKAGE_ORDER.indexOf(name);
    return index === -1 ? PACKAGE_ORDER.length : index;
  };
  return found.sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}

export function adrFiles() {
  return readdirSync(join(repoRoot, 'docs/adr'))
    .filter((name) => /^\d{4}-.+\.md$/.test(name))
    .sort();
}

export function adrId(fileName) {
  const head = readFileSync(join(repoRoot, 'docs/adr', fileName), 'utf8');
  const match = head.match(/^id:\s*['"]?([^'"\s]+)/m);
  return match ? match[1] : fileName.replace(/\.md$/, '');
}

export function adrFileFor(id) {
  const number = id.replace(/^ADR-/, '');
  return adrFiles().find((name) => name.startsWith(`${number}-`));
}

export function pageFor(path, frontMatter) {
  if (path === 'README.md') {
    return {
      slug: '/',
      title: 'Getting started',
      sidebar_label: 'Getting started',
    };
  }
  if (path === 'CONTRIBUTING.md') {
    return { slug: '/contributing', sidebar_label: 'Contributing' };
  }
  const guide = path.match(/^docs\/guide\/(.+)\.md$/);
  if (guide) {
    return { slug: `/guide/${guide[1]}` };
  }
  if (path === 'ARCHITECTURE.md') {
    return { slug: '/architecture', sidebar_label: 'Architecture' };
  }
  const pkg = path.match(/^packages\/([^/]+)\/README\.md$/);
  if (pkg) {
    return { slug: `/packages/${pkg[1]}`, sidebar_label: pkg[1] };
  }
  if (path === '.claude/skills/README.md') {
    return { slug: '/planning', sidebar_label: 'Planning skills' };
  }
  if (path === '.claude/skills/vault-planning/conventions.md') {
    return {
      slug: '/planning/conventions',
      sidebar_label: 'The planning model',
    };
  }
  if (path === 'docs/adr/README.md') {
    return {
      slug: '/decisions',
      title: 'Decisions',
      sidebar_label: 'All decisions',
    };
  }
  const adr = path.match(/^docs\/adr\/((\d{4})-.+)\.md$/);
  if (adr) {
    const status = String(frontMatter.status ?? 'proposed');
    return {
      slug: `/decisions/${adr[1]}`,
      sidebar_label: `${adr[2]} ${frontMatter.title ?? adr[1]}`,
      sidebar_class_name: `adr-status adr-status--${status}`,
    };
  }
  return {};
}
