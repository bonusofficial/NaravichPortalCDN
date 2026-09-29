import type { LucideIcon } from 'lucide-react'
import { ChevronDown, CircleAlert, Search, X } from 'lucide-react'
import type { InputHTMLAttributes, ReactNode, Ref, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

interface FieldProps {
  label: ReactNode
  htmlFor: string
  helper?: ReactNode
  error?: string | null
  optional?: boolean
  className?: string
  children: ReactNode
}

/** Label + control + helper/error text. Pass `describedBy(id)` ids to the control. */
export function Field({ label, htmlFor, helper, error, optional, className, children }: FieldProps) {
  return (
    <div className={cn('field', className)}>
      <label className="field__label" htmlFor={htmlFor}>
        <span>{label}</span>
        {optional ? <span className="field__optional">Optional</span> : null}
      </label>
      {children}
      {error ? (
        <p className="field__error" id={`${htmlFor}-error`} role="alert">
          <CircleAlert aria-hidden="true" />
          {error}
        </p>
      ) : helper ? (
        <p className="field__helper" id={`${htmlFor}-helper`}>
          {helper}
        </p>
      ) : null}
    </div>
  )
}

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  mono?: boolean
  inputSize?: 'sm' | 'md'
  ref?: Ref<HTMLInputElement>
}

export function TextInput({ mono, inputSize = 'md', className, ref, ...rest }: TextInputProps) {
  return <input ref={ref} className={cn('input', mono && 'input--mono', inputSize === 'sm' && 'input--sm', className)} {...rest} />
}

interface SuffixInputProps extends TextInputProps {
  suffix: string
}

export function SuffixInput({ suffix, ...rest }: SuffixInputProps) {
  return (
    <div className="input-affix input-affix--suffix">
      <TextInput {...rest} />
      <span className="input-affix__suffix" aria-hidden="true">
        {suffix}
      </span>
    </div>
  )
}

interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: string
  onValueChange: (value: string) => void
  label: string
  inputSize?: 'sm' | 'md'
  mono?: boolean
  icon?: LucideIcon
  ref?: Ref<HTMLInputElement>
}

export function SearchInput({ value, onValueChange, label, inputSize = 'md', mono, icon: Icon = Search, className, ref, ...rest }: SearchInputProps) {
  return (
    <div className={cn('input-affix', className)}>
      <Icon aria-hidden="true" />
      <input
        ref={ref}
        type="search"
        className={cn('input', mono && 'input--mono', inputSize === 'sm' && 'input--sm')}
        aria-label={label}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        style={{ paddingRight: value ? 34 : undefined }}
        {...rest}
      />
      {value ? (
        <button type="button" className="input-affix__clear" aria-label={`Clear ${label.toLowerCase()}`} onClick={() => onValueChange('')}>
          <X aria-hidden="true" />
        </button>
      ) : null}
    </div>
  )
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  selectSize?: 'sm' | 'md'
  icon?: LucideIcon
  wrapperClassName?: string
}

export function Select({ selectSize = 'md', icon: Icon, wrapperClassName, children, ...rest }: SelectProps) {
  return (
    <div className={cn('select', selectSize === 'sm' && 'select--sm', Icon && 'select--with-icon', wrapperClassName)}>
      {Icon ? <Icon className="select__lead" aria-hidden="true" /> : null}
      <select {...rest}>{children}</select>
      <ChevronDown aria-hidden="true" />
    </div>
  )
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  mono?: boolean
}

export function Textarea({ mono, className, ...rest }: TextareaProps) {
  return <textarea className={cn('textarea', mono && 'textarea--mono', className)} {...rest} />
}

interface CheckProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: ReactNode
  description?: ReactNode
  type?: 'checkbox' | 'radio'
}

export function Check({ label, description, type = 'checkbox', className, ...rest }: CheckProps) {
  return (
    <label className={cn('check', className)}>
      <input type={type} {...rest} />
      <span className="check__text">
        <span className="check__label">{label}</span>
        {description ? <span className="check__description">{description}</span> : null}
      </span>
    </label>
  )
}

interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  description?: ReactNode
  disabled?: boolean
  id: string
}

export function Switch({ checked, onChange, label, description, disabled, id }: SwitchProps) {
  return (
    <div className="switch-row">
      <div className="check__text">
        <label className="check__label" htmlFor={id}>
          {label}
        </label>
        {description ? (
          <span className="check__description" id={`${id}-description`}>
            {description}
          </span>
        ) : null}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        className="switch"
        aria-checked={checked}
        aria-describedby={description ? `${id}-description` : undefined}
        disabled={disabled}
        onClick={() => onChange(!checked)}
      />
    </div>
  )
}
