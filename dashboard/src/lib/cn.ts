type ClassValue = string | false | null | undefined | 0

/** Join truthy class names. */
export function cn(...values: ClassValue[]): string {
  return values.filter(Boolean).join(' ')
}
