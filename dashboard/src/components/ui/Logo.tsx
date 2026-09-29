import logoBlack from '../../assets/brand/logo-black.webp'
import logoColor from '../../assets/brand/logo-color.webp'
import logoWhite from '../../assets/brand/logo-white.webp'
import markUrl from '../../assets/brand/mark.png'
import { cn } from '../../lib/cn'
import { useTheme } from '../../state/theme-context'

/*
 * Optimised derivatives of the supplied artwork (public/PNG/*), cropped to the
 * artwork bounds at 480 × 188 px. Width/height attributes lock the 2.55:1 ratio
 * so the mark can never be stretched.
 *   CR-01 full colour → light surfaces (default)
 *   CR-02 black mono  → quiet treatment on light surfaces
 *   CR-03 white mono  → dark surfaces
 */
const SOURCES = { color: logoColor, black: logoBlack, white: logoWhite } as const
const INTRINSIC = { width: 480, height: 188 }

interface LogoProps {
  /** Rendered height in px; width follows the intrinsic aspect ratio. */
  height?: number
  /** "auto" picks full colour on light surfaces and white on dark surfaces. */
  variant?: 'auto' | 'color' | 'black' | 'white'
  className?: string
}

export function Logo({ height = 40, variant = 'auto', className }: LogoProps) {
  const { resolved } = useTheme()
  const key = variant === 'auto' ? (resolved === 'dark' ? 'white' : 'color') : variant
  const width = Math.round((INTRINSIC.width / INTRINSIC.height) * height)
  return (
    <img
      className={cn('logo', className)}
      src={SOURCES[key]}
      width={width}
      height={height}
      alt="Naravich Sure"
      decoding="async"
      draggable={false}
    />
  )
}

/** Check-mark glyph cropped from the logo, for the collapsed sidebar rail. */
export function LogoMark({ size = 28 }: { size?: number }) {
  return <img className="logo" src={markUrl} width={size} height={size} alt="Naravich Sure" draggable={false} />
}
