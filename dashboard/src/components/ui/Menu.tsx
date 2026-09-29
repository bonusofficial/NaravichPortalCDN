import type { LucideIcon } from 'lucide-react'
import { Check } from 'lucide-react'
import {
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
} from 'react'
import { createPortal } from 'react-dom'
import { useAnchoredPosition, useDismiss } from '../../hooks/useFloating'
import { cn } from '../../lib/cn'
import { MenuContext } from './menu-context'

export interface MenuTriggerProps {
  ref: Ref<HTMLButtonElement>
  onClick: () => void
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void
  'aria-haspopup': 'menu'
  'aria-expanded': boolean
  'aria-controls': string | undefined
}

interface MenuProps {
  /** Accessible name of the menu. */
  label: string
  trigger: (props: MenuTriggerProps) => ReactNode
  align?: 'start' | 'end'
  minWidth?: number
  children: ReactNode
}

const ITEM_SELECTOR = '[role^="menuitem"]:not([aria-disabled="true"])'

export function Menu({ label, trigger, align = 'end', minWidth, children }: MenuProps) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const focusFirst = useRef<'first' | 'last'>('first')
  const menuId = useId()

  useAnchoredPosition(open, triggerRef, menuRef, align)
  useDismiss(open, [triggerRef, menuRef], () => setOpen(false))

  useEffect(() => {
    if (!open) return
    const items = menuRef.current?.querySelectorAll<HTMLElement>(ITEM_SELECTOR)
    if (!items?.length) {
      menuRef.current?.focus()
      return
    }
    const checked = menuRef.current?.querySelector<HTMLElement>('[aria-checked="true"]')
    const target = checked ?? (focusFirst.current === 'last' ? items[items.length - 1] : items[0])
    target.focus()
  }, [open])

  const close = (options: { restoreFocus?: boolean } = {}) => {
    setOpen(false)
    if (options.restoreFocus !== false) triggerRef.current?.focus()
  }

  const onMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLElement>(ITEM_SELECTOR) ?? [])
    const index = items.indexOf(document.activeElement as HTMLElement)
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        items[(index + 1) % items.length]?.focus()
        break
      case 'ArrowUp':
        event.preventDefault()
        items[(index - 1 + items.length) % items.length]?.focus()
        break
      case 'Home':
        event.preventDefault()
        items[0]?.focus()
        break
      case 'End':
        event.preventDefault()
        items[items.length - 1]?.focus()
        break
      case 'Escape':
        event.preventDefault()
        event.stopPropagation()
        close()
        break
      case 'Tab':
        event.preventDefault()
        close()
        break
      default:
        if (event.key.length === 1 && /\S/.test(event.key)) {
          const match = items.find((item) => item.textContent?.trim().toLowerCase().startsWith(event.key.toLowerCase()))
          match?.focus()
        }
    }
  }

  return (
    <>
      {trigger({
        ref: triggerRef,
        onClick: () => {
          focusFirst.current = 'first'
          setOpen((value) => !value)
        },
        onKeyDown: (event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault()
            focusFirst.current = event.key === 'ArrowUp' ? 'last' : 'first'
            setOpen(true)
          }
        },
        'aria-haspopup': 'menu',
        'aria-expanded': open,
        'aria-controls': open ? menuId : undefined,
      })}
      {open
        ? createPortal(
            <MenuContext value={{ close }}>
              <div
                ref={menuRef}
                id={menuId}
                className="menu"
                role="menu"
                aria-label={label}
                tabIndex={-1}
                style={{ minWidth }}
                onKeyDown={onMenuKeyDown}
              >
                {children}
              </div>
            </MenuContext>,
            document.body,
          )
        : null}
    </>
  )
}

interface MenuItemProps {
  icon?: LucideIcon
  onSelect: () => void
  tone?: 'default' | 'danger'
  disabled?: boolean
  hint?: ReactNode
  children: ReactNode
}

export function MenuItem({ icon: Icon, onSelect, tone = 'default', disabled, hint, children }: MenuItemProps) {
  const { close } = useContext(MenuContext)
  return (
    <button
      type="button"
      role="menuitem"
      className={cn('menu__item', tone === 'danger' && 'menu__item--danger')}
      aria-disabled={disabled || undefined}
      tabIndex={-1}
      onClick={() => {
        if (disabled) return
        close({ restoreFocus: true })
        onSelect()
      }}
    >
      {Icon ? <Icon aria-hidden="true" /> : null}
      <span className="menu__item-text">
        <span>{children}</span>
        {hint ? <span className="menu__item-hint">{hint}</span> : null}
      </span>
    </button>
  )
}

interface MenuRadioItemProps {
  checked: boolean
  onSelect: () => void
  icon?: LucideIcon
  hint?: ReactNode
  children: ReactNode
}

export function MenuRadioItem({ checked, onSelect, icon: Icon, hint, children }: MenuRadioItemProps) {
  const { close } = useContext(MenuContext)
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={checked}
      className="menu__item"
      tabIndex={-1}
      onClick={() => {
        close({ restoreFocus: true })
        onSelect()
      }}
    >
      {Icon ? <Icon aria-hidden="true" /> : null}
      <span className="menu__item-text">
        <span>{children}</span>
        {hint ? <span className="menu__item-hint">{hint}</span> : null}
      </span>
      {checked ? <Check className="menu__check" aria-hidden="true" /> : <span style={{ width: 16 }} aria-hidden="true" />}
    </button>
  )
}

export function MenuSeparator() {
  return <div className="menu__separator" role="separator" />
}

export function MenuLabel({ children }: { children: ReactNode }) {
  return (
    <div className="menu__label" role="presentation">
      {children}
    </div>
  )
}
