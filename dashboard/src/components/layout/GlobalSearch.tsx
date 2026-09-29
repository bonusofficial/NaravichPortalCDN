import type { LucideIcon } from 'lucide-react'
import { CornerDownLeft, FolderKanban, Image, KeyRound, ScrollText, Search, User, X } from 'lucide-react'
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { useDismiss } from '../../hooks/useFloating'
import { cn } from '../../lib/cn'
import { formatRelative } from '../../lib/format'
import { NAV_ITEMS } from '../../lib/navigation'
import { navigate, type RouteParams } from '../../lib/router'
import { useStore } from '../../state/store-context'
import type { ViewId } from '../../types'
import { Kbd } from '../ui/DescriptionList'

interface Result {
  id: string
  group: string
  title: string
  meta: string
  icon: LucideIcon
  view: ViewId
  params?: RouteParams
}

const PER_GROUP = 4

function matches(query: string, ...fields: string[]) {
  return fields.some((field) => field.toLowerCase().includes(query))
}

export function GlobalSearch({ open, onRequestClose }: { open: boolean; onRequestClose: () => void }) {
  const { projects, assets, apiKeys, logs, users } = useStore()
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const listId = useId()

  useDismiss(focused, [wrapperRef], () => setFocused(false))

  // "/" or ⌘K / Ctrl+K focuses search from anywhere.
  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      const target = event.target as HTMLElement
      const typing = target.closest('input, textarea, select, [contenteditable="true"]')
      if ((event.key === 'k' && (event.metaKey || event.ctrlKey)) || (event.key === '/' && !typing)) {
        if (document.getElementById('root')?.hasAttribute('inert')) return
        event.preventDefault()
        inputRef.current?.focus()
        inputRef.current?.select()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  const q = query.trim().toLowerCase()
  const projectName = (id: string) => projects.find((project) => project.id === id)?.name ?? id

  let results: Result[]
  if (q.length < 2) {
    results = NAV_ITEMS.map((item) => ({
      id: `page-${item.id}`,
      group: 'Go to',
      title: item.label,
      meta: item.description,
      icon: item.icon,
      view: item.id,
    }))
  } else {
    const pages = NAV_ITEMS.filter((item) => matches(q, item.label, item.description)).map((item) => ({
      id: `page-${item.id}`,
      group: 'Pages',
      title: item.label,
      meta: item.description,
      icon: item.icon,
      view: item.id,
    }))
    const projectResults = projects
      .filter((project) => matches(q, project.name, project.slug, project.domain))
      .slice(0, PER_GROUP)
      .map((project) => ({
        id: `project-${project.id}`,
        group: 'Projects',
        title: project.name,
        meta: `${project.slug} · ${project.domain}`,
        icon: FolderKanban,
        view: 'projects' as const,
        params: { id: project.id },
      }))
    const assetResults = assets
      .filter((asset) => matches(q, asset.fileName, asset.id, asset.objectKey))
      .slice(0, PER_GROUP)
      .map((asset) => ({
        id: `asset-${asset.id}`,
        group: 'Assets',
        title: asset.fileName,
        meta: `${projectName(asset.projectId)} · ${formatRelative(asset.uploadedAt)}`,
        icon: Image,
        view: 'assets' as const,
        params: { id: asset.id },
      }))
    const keyResults = apiKeys
      .filter((key) => matches(q, key.name, key.last4, `ncdn_${key.environment}_`))
      .slice(0, PER_GROUP)
      .map((key) => ({
        id: `key-${key.id}`,
        group: 'API keys',
        title: key.name,
        meta: `ncdn_${key.environment}_…${key.last4} · ${projectName(key.projectId)}`,
        icon: KeyRound,
        view: 'api-keys' as const,
        params: { q: key.name },
      }))
    const logResults =
      q.startsWith('req') || q.length >= 6
        ? logs
            .filter((log) => matches(q, log.requestId))
            .slice(0, PER_GROUP)
            .map((log) => ({
              id: `log-${log.id}`,
              group: 'Requests',
              title: log.requestId,
              meta: `${log.httpStatus} · ${log.fileName}`,
              icon: ScrollText,
              view: 'logs' as const,
              params: { id: log.id },
            }))
        : []
    const userResults = users
      .filter((user) => matches(q, user.name, user.email))
      .slice(0, PER_GROUP)
      .map((user) => ({
        id: `user-${user.id}`,
        group: 'Users',
        title: user.name,
        meta: user.email,
        icon: User,
        view: 'users' as const,
        params: { q: user.email },
      }))
    results = [...pages, ...projectResults, ...assetResults, ...keyResults, ...logResults, ...userResults]
  }

  const showPanel = focused
  const active = Math.min(activeIndex, Math.max(0, results.length - 1))
  const groups = results.reduce<{ label: string; items: { result: Result; index: number }[] }[]>((acc, result, index) => {
    const last = acc[acc.length - 1]
    if (last && last.label === result.group) last.items.push({ result, index })
    else acc.push({ label: result.group, items: [{ result, index }] })
    return acc
  }, [])

  const choose = (result: Result) => {
    navigate(result.view, result.params ?? {})
    setQuery('')
    setFocused(false)
    inputRef.current?.blur()
    onRequestClose()
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setFocused(true)
      setActiveIndex(results.length ? (active + 1) % results.length : 0)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex(results.length ? (active - 1 + results.length) % results.length : 0)
    } else if (event.key === 'Enter') {
      const result = results[active]
      if (result) {
        event.preventDefault()
        choose(result)
      }
    } else if (event.key === 'Escape') {
      event.preventDefault()
      if (query) setQuery('')
      else {
        setFocused(false)
        inputRef.current?.blur()
        onRequestClose()
      }
    }
  }

  return (
    <div className={cn('topbar__search', open && 'is-open')}>
      <div
        className="search"
        ref={wrapperRef}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false)
        }}
      >
        <div className="input-affix">
          <Search aria-hidden="true" />
          <input
            ref={inputRef}
            className="input"
            type="text"
            role="combobox"
            aria-label="Search projects, assets, keys, request IDs, and users"
            aria-expanded={showPanel}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={showPanel && results[active] ? `${listId}-${results[active].id}` : undefined}
            placeholder="Search assets, keys, request IDs…"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setActiveIndex(0)
              setFocused(true)
            }}
            onFocus={() => setFocused(true)}
            onKeyDown={onKeyDown}
            autoComplete="off"
            spellCheck={false}
          />
          {query ? (
            <button type="button" className="input-affix__clear" aria-label="Clear search" onClick={() => setQuery('')}>
              <X aria-hidden="true" />
            </button>
          ) : (
            <span className="search__hint" aria-hidden="true">
              <Kbd>/</Kbd>
            </span>
          )}
        </div>
        {showPanel ? (
          <div className="search__panel">
            <div id={listId} role="listbox" aria-label="Search results">
              {groups.map((group) => (
                <div key={group.label} role="group" aria-label={group.label} className="search__group">
                  <p className="search__group-label" aria-hidden="true">
                    {group.label}
                  </p>
                  {group.items.map(({ result, index }) => {
                    const Icon = result.icon
                    return (
                      <div
                        key={result.id}
                        id={`${listId}-${result.id}`}
                        role="option"
                        aria-selected={index === active}
                        className="search__option"
                        onMouseDown={(event) => event.preventDefault()}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => choose(result)}
                      >
                        <Icon aria-hidden="true" />
                        <span className="search__option-text">
                          <span className={cn('search__option-title', result.group === 'Requests' && 'mono')}>{result.title}</span>
                          <span className="search__option-meta">{result.meta}</span>
                        </span>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
            {results.length === 0 ? <p className="search__empty">No matches for “{query.trim()}”.</p> : null}
            <div className="search__footer" aria-hidden="true">
              <span>
                <Kbd>↑</Kbd>
                <Kbd>↓</Kbd> to move
              </span>
              <span>
                <Kbd>
                  <CornerDownLeft size={11} />
                </Kbd>{' '}
                to open
              </span>
              <span>
                <Kbd>Esc</Kbd> to close
              </span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
