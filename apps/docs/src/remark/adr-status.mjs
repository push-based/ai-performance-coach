import { adrFileFor } from '../sources.mjs';

const KIND = {
  accepted: 'tip',
  proposed: 'info',
  superseded: 'warning',
  deprecated: 'warning',
  rejected: 'danger',
};

function list(value) {
  return (Array.isArray(value) ? value : value ? [value] : []).map(String);
}

function day(value) {
  return value instanceof Date
    ? value.toISOString().slice(0, 10)
    : value
      ? String(value)
      : '';
}

function adrLinks(ids) {
  return ids.flatMap((id, position) => {
    const file = adrFileFor(id);
    const node = file
      ? {
          type: 'link',
          url: `./${file}`,
          children: [{ type: 'text', value: id }],
        }
      : { type: 'text', value: id };
    return position === 0 ? [node] : [{ type: 'text', value: ', ' }, node];
  });
}

export default function adrStatus() {
  return (tree, file) => {
    const frontMatter = file.data?.frontMatter ?? {};
    if (!/^ADR-\d+$/.test(String(frontMatter.id ?? ''))) return;
    const status = String(frontMatter.status ?? 'proposed');
    const supersededBy = list(frontMatter.superseded_by);
    const supersedes = list(frontMatter.supersedes);

    const line = [
      { type: 'strong', children: [{ type: 'text', value: 'Status:' }] },
      { type: 'text', value: ` ${status}` },
    ];
    if (supersededBy.length)
      line.push({ type: 'text', value: ' by ' }, ...adrLinks(supersededBy));
    if (day(frontMatter.date))
      line.push({ type: 'text', value: ` · ${day(frontMatter.date)}` });
    if (supersedes.length)
      line.push(
        { type: 'text', value: ' · supersedes ' },
        ...adrLinks(supersedes),
      );

    const banner = {
      type: 'containerDirective',
      name: KIND[status] ?? 'note',
      attributes: {},
      children: [
        {
          type: 'paragraph',
          data: { directiveLabel: true },
          children: [
            { type: 'text', value: status[0].toUpperCase() + status.slice(1) },
          ],
        },
        { type: 'paragraph', children: line },
      ],
    };
    const heading = tree.children.findIndex(
      (node) => node.type === 'heading' && node.depth === 1,
    );
    tree.children.splice(heading + 1, 0, banner);
  };
}
