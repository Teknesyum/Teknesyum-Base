import { useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import type { Repo } from '../api/types';
import { useI18n } from '../i18n';
import { useStore } from '../store';
import { tokenMs, useFlip } from '../ui/hooks';
import { IconChevron, IconTag } from '../ui/icons';
import './sidebar.css';

type Node = { path: string; label: string; count: number; level: number; children: Node[] };
type Row = { id: string; kind: 'cat' | 'tag'; value: string; label: string; count: number; level: number; parent: boolean; expanded: boolean };

function buildTree(repos: Repo[]): Node[] {
  const root: Node = { path: '', label: '', count: 0, level: 0, children: [] };
  for (const r of repos) {
    const parts = (r.category || '').split('/').filter(Boolean);
    let node = root;
    let path = '';
    for (const part of parts) {
      path = path ? path + '/' + part : part;
      let child = node.children.find((c) => c.label === part);
      if (!child) {
        child = { path, label: part, count: 0, level: node.level + 1, children: [] };
        node.children.push(child);
      }
      child.count += 1;
      node = child;
    }
  }
  const sort = (n: Node) => {
    n.children.sort((a, b) => a.label.localeCompare(b.label));
    n.children.forEach(sort);
  };
  sort(root);
  return root.children;
}

type Props = {
  id?: string;
  repos: Repo[];
  category: string;
  tag: string;
  onCategory: (c: string) => void;
  onTag: (t: string) => void;
};

export function Sidebar({ id, repos, category, tag, onCategory, onTag }: Props) {
  const { t, lang, num } = useI18n();
  const store = useStore();
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [focusId, setFocusId] = useState('cat:');
  const refs = useRef(new Map<string, HTMLButtonElement>());
  const asideRef = useRef<HTMLElement>(null);
  const typed = useRef({ text: '', at: 0 });
  const accountId = useId();
  const accounts = store.settings ? [store.settings.account, ...store.settings.extraAccounts] : [];

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [{ id: 'cat:', kind: 'cat', value: '', label: t('library.all'), count: repos.length, level: 1, parent: false, expanded: false }];
    const walk = (nodes: Node[]) => {
      for (const n of nodes) {
        const parent = n.children.length > 0;
        const expanded = parent && !collapsed.has(n.path);
        const named = t('category.' + n.label);
        out.push({ id: 'cat:' + n.path, kind: 'cat', value: n.path, label: named === 'category.' + n.label ? n.label : named, count: n.count, level: n.level, parent, expanded });
        if (expanded) walk(n.children);
      }
    };
    walk(buildTree(repos));
    const tags = new Map<string, number>();
    repos.forEach((r) => new Set([...(r.tags ?? []), ...r.localTags]).forEach((x) => tags.set(x, (tags.get(x) ?? 0) + 1)));
    const local = new Set(repos.flatMap((r) => r.localTags));
    [...tags.entries()]
      .filter(([name, count]) => count > 1 || local.has(name) || name === tag)
      .sort((a, b) => a[0].localeCompare(b[0], lang))
      .forEach(([name, count]) => out.push({ id: 'tag:' + name, kind: 'tag', value: name, label: name, count, level: 1, parent: false, expanded: false }));
    return out;
  }, [repos, collapsed, t, lang, tag]);

  const current = rows.some((r) => r.id === focusId) ? focusId : 'cat:';
  const selected = (r: Row) => (r.kind === 'cat' ? r.value === category && !tag : r.value === tag);
  const choose = (r: Row) => (r.kind === 'cat' ? onCategory(r.value) : onTag(r.value === tag ? '' : r.value));

  const toggle = (path: string, open: boolean) =>
    setCollapsed((cur) => {
      const next = new Set(cur);
      if (open) next.delete(path);
      else next.add(path);
      return next;
    });

  const focus = (id: string) => {
    setFocusId(id);
    refs.current.get(id)?.focus();
  };

  const onKey = (e: KeyboardEvent<HTMLElement>, group: Row[]) => {
    const i = group.findIndex((r) => r.id === current);
    const row = group[i];
    let next = -1;
    if (e.key === 'ArrowDown') next = Math.min(group.length - 1, i + 1);
    else if (e.key === 'ArrowUp') next = Math.max(0, i - 1);
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = group.length - 1;
    else if (e.key === 'ArrowRight' && row?.parent) {
      if (!row.expanded) toggle(row.value, true);
      else next = i + 1;
    } else if (e.key === 'ArrowLeft' && row) {
      if (row.parent && row.expanded) toggle(row.value, false);
      else if (row.kind === 'cat' && row.value.includes('/')) {
        const up = row.value.slice(0, row.value.lastIndexOf('/'));
        next = group.findIndex((r) => r.kind === 'cat' && r.value === up);
      }
    } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
      const now = performance.now();
      typed.current.text = (now - typed.current.at > tokenMs('--tk-typeahead-reset', 500) ? '' : typed.current.text) + e.key.toLocaleLowerCase(lang);
      typed.current.at = now;
      next = group.findIndex((r) => r.label.toLocaleLowerCase(lang).startsWith(typed.current.text));
    } else return;
    e.preventDefault();
    if (next >= 0) focus(group[next].id);
  };

  useFlip(asideRef, rows.map((r) => r.id).join('|'));
  const cats = rows.filter((r) => r.kind === 'cat');
  const tags = rows.filter((r) => r.kind === 'tag');
  const tagFocus = tags.some((r) => r.id === current) ? current : tags[0]?.id;

  const item = (r: Row, tabStop: boolean, role: 'treeitem' | 'option') => (
    <li key={r.id} role="none" data-flip={r.id}>
      <button
        type="button"
        ref={(el) => {
          if (el) refs.current.set(r.id, el);
          else refs.current.delete(r.id);
        }}
        role={role}
        aria-selected={selected(r)}
        aria-expanded={r.parent ? r.expanded : undefined}
        aria-level={role === 'treeitem' ? r.level : undefined}
        tabIndex={tabStop ? 0 : -1}
        className="nav-item"
        style={{ paddingInlineStart: `calc(var(--tk-sp-2) + var(--tk-sp-3) * ${r.level - 1})` }}
        onFocus={() => setFocusId(r.id)}
        onClick={() => {
          if (r.parent && selected(r)) toggle(r.value, !r.expanded);
          choose(r);
        }}
      >
        <span className="nav-item__label">
          {r.parent ? (
            <span className="nav-item__chevron" data-open={r.expanded || undefined}>
              <IconChevron />
            </span>
          ) : r.kind === 'tag' ? (
            <IconTag />
          ) : null}
          <span className="nav-item__text">{r.label}</span>
        </span>
        <span className="count">{num(r.count)}</span>
      </button>
    </li>
  );

  return (
    <aside ref={asideRef} id={id} className="sidebar divider-end" aria-label={t('library.sidebar')}>
      {accounts.length > 1 ? (
        <div className="field">
          <label className="tk-label" htmlFor={accountId}>
            {t('library.account')}
          </label>
          <select id={accountId} className="tk-input" value={store.account} onChange={(e) => store.switchAccount(e.target.value)}>
            {accounts.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      <h2 className="tk-label sidebar__heading" id="cat-heading">
        {t('library.categories')}
      </h2>
      <ul className="tree" role="tree" aria-labelledby="cat-heading" onKeyDown={(e) => onKey(e, cats)}>
        {cats.map((r) => item(r, r.id === (cats.some((c) => c.id === current) ? current : 'cat:'), 'treeitem'))}
      </ul>
      <h2 className="tk-label sidebar__heading" id="tag-heading">
        {t('library.tags')}
      </h2>
      {tags.length ? (
        <ul className="tree" role="listbox" aria-labelledby="tag-heading" onKeyDown={(e) => onKey(e, tags)}>
          {tags.map((r) => item(r, r.id === tagFocus, 'option'))}
        </ul>
      ) : (
        <p className="sidebar__hint">{t('library.noTags')}</p>
      )}
    </aside>
  );
}
