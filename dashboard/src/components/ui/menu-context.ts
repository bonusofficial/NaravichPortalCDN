import { createContext } from 'react'

export interface MenuContextValue {
  close: (options?: { restoreFocus?: boolean }) => void
}

export const MenuContext = createContext<MenuContextValue>({ close: () => undefined })
