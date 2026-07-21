'use client'

import {useState} from 'react'

export type AccordionItem = {
  id: string
  title: string
  content: React.ReactNode
}

type AccordionProps = {
  items: AccordionItem[]
  /** 'single' closes other items when one opens; 'multiple' lets any number stay open. */
  type?: 'single' | 'multiple'
  defaultOpenId?: string
  defaultOpenIds?: string[]
  className?: string
}

export default function Accordion({
  items,
  type = 'single',
  defaultOpenId,
  defaultOpenIds,
  className = '',
}: AccordionProps) {
  const [openIds, setOpenIds] = useState<string[]>(() => {
    if (type === 'multiple') return defaultOpenIds ?? []
    return defaultOpenId ? [defaultOpenId] : []
  })

  const toggle = (id: string) => {
    setOpenIds((current) => {
      const isOpen = current.includes(id)
      if (type === 'multiple') {
        return isOpen ? current.filter((openId) => openId !== id) : [...current, id]
      }
      return isOpen ? [] : [id]
    })
  }

  return (
    <div className={`divide-y divide-gray-200 dark:divide-gray-700 ${className}`}>
      {items.map((item) => {
        const isOpen = openIds.includes(item.id)
        const panelId = `accordion-panel-${item.id}`
        const buttonId = `accordion-button-${item.id}`

        return (
          <div key={item.id}>
            <h3>
              <button
                id={buttonId}
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggle(item.id)}
                className="flex w-full items-center justify-between gap-4 py-4 text-left font-medium"
              >
                <span>{item.title}</span>
                <svg
                  aria-hidden="true"
                  viewBox="0 0 20 20"
                  fill="none"
                  className={`size-5 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                >
                  <path
                    d="M5 7.5L10 12.5L15 7.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              className={`grid transition-[grid-template-rows] duration-200 ease-in-out ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
            >
              <div className="overflow-hidden">
                <div className="pb-4">{item.content}</div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
