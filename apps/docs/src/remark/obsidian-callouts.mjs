import { visit } from 'unist-util-visit';

const TYPES = {
  note: 'note',
  tip: 'tip',
  hint: 'tip',
  important: 'tip',
  success: 'tip',
  check: 'tip',
  done: 'tip',
  info: 'info',
  abstract: 'info',
  summary: 'info',
  tldr: 'info',
  todo: 'info',
  question: 'info',
  help: 'info',
  faq: 'info',
  example: 'info',
  quote: 'info',
  cite: 'info',
  warning: 'warning',
  caution: 'warning',
  attention: 'warning',
  failure: 'danger',
  fail: 'danger',
  missing: 'danger',
  danger: 'danger',
  error: 'danger',
  bug: 'danger',
};

const MARKER = /^\[!([\w-]+)\][+-]?[ \t]*([^\n]*)\n?/;

export default function obsidianCallouts() {
  return (tree) => {
    visit(tree, 'blockquote', (node, index, parent) => {
      const first = node.children[0];
      const text = first?.type === 'paragraph' ? first.children[0] : undefined;
      if (!parent || index === undefined || text?.type !== 'text') return;
      const match = text.value.match(MARKER);
      if (!match) return;

      const kind = match[1].toLowerCase();
      const title = match[2].trim();
      text.value = text.value.slice(match[0].length);
      if (text.value === '') first.children.shift();
      if (first.children[0]?.type === 'break') first.children.shift();
      const body =
        first.children.length === 0 ? node.children.slice(1) : node.children;

      const label = title || (TYPES[kind] ? '' : kind);
      parent.children[index] = {
        type: 'containerDirective',
        name: TYPES[kind] ?? 'note',
        attributes: {},
        children: [
          ...(label
            ? [
                {
                  type: 'paragraph',
                  data: { directiveLabel: true },
                  children: [{ type: 'text', value: label }],
                },
              ]
            : []),
          ...body,
        ],
      };
    });
  };
}
