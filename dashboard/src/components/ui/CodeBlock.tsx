import { useState, type ReactNode } from 'react'
import { CopyButton } from './CopyField'

export type CodeLanguage = 'bash' | 'js' | 'php' | 'json' | 'env'

export interface CodeSample {
  id: string
  label: string
  language: CodeLanguage
  code: string
}

/*
 * Tiny, dependency-free highlighter: builds React nodes (never innerHTML) for
 * comments, strings, numbers, keywords, JSON keys and CLI flags.
 */
const PATTERNS: Record<CodeLanguage, RegExp> = {
  bash: /(#[^\n]*)|("(?:[^"\\]|\\.)*"|'[^']*')|(\s--?[a-zA-Z][\w-]*)|(\$[A-Z_]+)/g,
  js: /(\/\/[^\n]*)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|\b(\d+)\b|\b(const|await|async|new|return|import|from|if|throw|function)\b/g,
  php: /(\/\/[^\n]*|#[^\n]*)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|\b(\d+)\b|\b(new|return|if|throw|function|true|false)\b|(\$\w+)/g,
  json: /("(?:[^"\\]|\\.)*")(\s*:)?|\b(-?\d+(?:\.\d+)?)\b|\b(true|false|null)\b/g,
  env: /(#[^\n]*)|^([A-Z_]+)(?==)/gm,
}

function highlight(code: string, language: CodeLanguage): ReactNode[] {
  const pattern = PATTERNS[language]
  const nodes: ReactNode[] = []
  let last = 0
  let match: RegExpExecArray | null
  let key = 0
  pattern.lastIndex = 0
  while ((match = pattern.exec(code)) !== null) {
    if (match.index > last) nodes.push(code.slice(last, match.index))
    const [text] = match
    let className = 'tok-keyword'
    if (language === 'json') {
      if (match[1]) className = match[2] ? 'tok-key' : 'tok-string'
      else if (match[3]) className = 'tok-number'
    } else if (language === 'env') {
      className = match[1] ? 'tok-comment' : 'tok-key'
    } else if (match[1]) className = 'tok-comment'
    else if (match[2]) className = 'tok-string'
    else if (language === 'bash' && match[3]) className = 'tok-flag'
    else if (language === 'bash' && match[4]) className = 'tok-keyword'
    else if (match[3]) className = 'tok-number'
    else if (language === 'php' && match[5]) className = 'tok-key'
    if (language === 'json' && match[2]) {
      nodes.push(
        <span key={key++} className={className}>
          {match[1]}
        </span>,
        match[2],
      )
    } else {
      nodes.push(
        <span key={key++} className={className}>
          {text}
        </span>,
      )
    }
    last = match.index + text.length
  }
  if (last < code.length) nodes.push(code.slice(last))
  return nodes
}

interface CodeBlockProps {
  samples: CodeSample[]
  title?: string
  label: string
}

export function CodeBlock({ samples, title, label }: CodeBlockProps) {
  const [activeId, setActiveId] = useState(samples[0]?.id)
  const active = samples.find((sample) => sample.id === activeId) ?? samples[0]
  return (
    <div className="code">
      <div className="code__bar">
        {samples.length > 1 ? (
          <div className="code__tabs" role="tablist" aria-label={label}>
            {samples.map((sample) => (
              <button
                key={sample.id}
                type="button"
                role="tab"
                className="code__tab"
                aria-selected={sample.id === active.id}
                onClick={() => setActiveId(sample.id)}
              >
                {sample.label}
              </button>
            ))}
          </div>
        ) : (
          <span className="code__title">{title ?? active.label}</span>
        )}
        <CopyButton value={active.code} label={`${active.label} snippet`} />
      </div>
      <pre tabIndex={0} aria-label={`${label}: ${active.label}`}>
        <code>{highlight(active.code, active.language)}</code>
      </pre>
    </div>
  )
}
