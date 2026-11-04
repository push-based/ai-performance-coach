import { existsSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { visit } from 'unist-util-visit';
import { BRANCH, REPOSITORY, repoRelative, siteFiles } from '../sources.mjs';

const EXTERNAL = /^([a-z][a-z\d+.-]*:|\/|#)/i;

export default function repoLinks() {
  const onSite = siteFiles();
  return (tree, file) => {
    if (!file.path) return;
    visit(tree, ['link', 'definition'], (node) => {
      if (!node.url || EXTERNAL.test(node.url)) return;
      const [, target, suffix = ''] = node.url.match(/^([^#?]*)(.*)$/);
      if (!target) return;
      const absolute = resolve(dirname(file.path), decodeURI(target));
      const path = repoRelative(absolute);
      if (path.startsWith('..') || onSite.has(path) || !existsSync(absolute))
        return;
      const kind = statSync(absolute).isDirectory() ? 'tree' : 'blob';
      node.url = `https://github.com/${REPOSITORY}/${kind}/${BRANCH}/${encodeURI(path)}${suffix}`;
    });
  };
}
