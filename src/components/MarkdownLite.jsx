// Tiny markdown-ish renderer: bold, inline code, ordered/unordered lists, headings.
import React from 'react'

function inline(text, keyPrefix) {
  const parts = []
  const regex = /(\*\*[^*]+\*\*|`[^`]+`)/g
  let last = 0
  let m
  let i = 0
  while ((m = regex.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index))
    const tok = m[0]
    if (tok.startsWith('**')) parts.push(<strong key={`${keyPrefix}-b${i++}`}>{tok.slice(2, -2)}</strong>)
    else parts.push(<code key={`${keyPrefix}-c${i++}`} className="inline-code">{tok.slice(1, -1)}</code>)
    last = regex.lastIndex
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts
}

export default function MarkdownLite({ text }) {
  if (!text) return null
  const lines = text.split('\n')
  const out = []
  let list = null
  let key = 0
  const flush = () => {
    if (list) {
      out.push(React.createElement(list.type, { key: `l${key++}`, className: 'md-list' }, ...list.items))
      list = null
    }
  }
  for (const raw of lines) {
    const line = raw.trimEnd()
    if (!line.trim()) { flush(); continue }
    const head = line.match(/^(#{1,3})\s+(.*)$/)
    const ol = line.match(/^\d+\.\s+(.*)$/)
    if (head) { flush(); out.push(<h3 key={`h${key++}`} className="md-h">{inline(head[2], `h${key}`)}</h3>); continue }
    if (ol) {
      if (!list || list.type !== 'ol') { flush(); list = { type: 'ol', items: [] } }
      list.items.push(<li key={`i${key++}`}>{inline(ol[1], `i${key}`)}</li>)
      continue
    }
    const ulm = line.match(/^[-*]\s+(.*)$/)
    if (ulm) {
      if (!list || list.type !== 'ul') { flush(); list = { type: 'ul', items: [] } }
      list.items.push(<li key={`i${key++}`}>{inline(ulm[1], `i${key}`)}</li>)
      continue
    }
    flush()
    out.push(<p key={`p${key++}`} className="md-p">{inline(line, `p${key}`)}</p>)
  }
  flush()
  return <div className="md">{out}</div>
}
