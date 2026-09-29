/** aria-describedby / aria-invalid props for a control inside <Field>. */
export function fieldA11y(id: string, error?: string | null, hasHelper = true) {
  return {
    id,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? `${id}-error` : hasHelper ? `${id}-helper` : undefined,
  } as const
}
