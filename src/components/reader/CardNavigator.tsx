import { useEffect, useMemo, useRef, useState, type TouchEvent } from 'react'
import DOMPurify from 'dompurify'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { SectionTransitionCard } from '@/components/reader/SectionTransitionCard'

type Step =
  | { kind: 'transition'; title: string; estimatedMinutes: number }
  | { kind: 'content'; html: string }

const WORDS_PER_MINUTE = 130
// Une section entre deux h2 dépassant ce nombre de mots est scindée en plusieurs cartes de
// lecture, sous peine de dépasser la cible de 3 minutes de lecture par carte.
const MAX_WORDS_PER_CARD = 800
const SPLIT_AFTER_WORDS = 400

function countWords(text: string): number {
  return (text.trim().match(/\S+/g) ?? []).length
}

function nodesToHtml(nodes: Node[]): string {
  const wrapper = document.createElement('div')
  nodes.forEach((n) => wrapper.appendChild(n.cloneNode(true)))
  return wrapper.innerHTML
}

// Scinde une liste de noeuds (déjà groupés par section h2/h3) en plusieurs cartes si leur volume
// dépasse MAX_WORDS_PER_CARD, en coupant uniquement entre deux noeuds enfants (jamais au milieu
// d'une balise) une fois le seuil de SPLIT_AFTER_WORDS atteint.
function splitNodesByWordCount(nodes: Node[]): string[] {
  const totalWords = countWords(nodesToHtml(nodes))
  if (totalWords <= MAX_WORDS_PER_CARD) {
    const html = nodesToHtml(nodes)
    return html.trim() ? [html] : []
  }

  const parts: string[] = []
  let current: Node[] = []
  let currentWords = 0
  for (const node of nodes) {
    current.push(node)
    currentWords += countWords(node.textContent ?? '')
    if (currentWords >= SPLIT_AFTER_WORDS) {
      const html = nodesToHtml(current)
      if (html.trim()) parts.push(html)
      current = []
      currentWords = 0
    }
  }
  if (current.length > 0) {
    const html = nodesToHtml(current)
    if (html.trim()) parts.push(html)
  }
  return parts
}

// Découpe le HTML complet d'une session en cartes : une carte de transition à chaque h2, puis des
// cartes de contenu scindées aux h3 et, à l'intérieur, au nombre de mots.
function buildSteps(contentHtml: string): Step[] {
  const sanitized = DOMPurify.sanitize(contentHtml || '')
  const container = document.createElement('div')
  container.innerHTML = sanitized

  type H2Section = { title: string | null; nodes: Node[] }
  const h2Sections: H2Section[] = []
  let currentH2: H2Section = { title: null, nodes: [] }
  for (const node of Array.from(container.childNodes)) {
    if (node.nodeType === Node.ELEMENT_NODE && (node as Element).tagName === 'H2') {
      if (currentH2.nodes.length > 0 || currentH2.title !== null) h2Sections.push(currentH2)
      currentH2 = { title: (node as Element).textContent ?? '', nodes: [] }
    } else {
      currentH2.nodes.push(node)
    }
  }
  h2Sections.push(currentH2)

  const steps: Step[] = []
  for (const section of h2Sections) {
    const sectionHtml = nodesToHtml(section.nodes)
    if (!sectionHtml.trim() && !section.title) continue

    if (section.title) {
      const words = countWords(sectionHtml)
      steps.push({
        kind: 'transition',
        title: section.title,
        estimatedMinutes: Math.max(1, Math.round(words / WORDS_PER_MINUTE)),
      })
    }

    // Sous-découpage aux h3 : chaque h3 démarre un nouveau groupe de cartes, le titre h3 reste
    // dans le HTML de sa carte (simple point de coupe, pas un écran de transition dédié).
    type H3Group = Node[]
    const h3Groups: H3Group[] = [[]]
    for (const node of section.nodes) {
      if (node.nodeType === Node.ELEMENT_NODE && (node as Element).tagName === 'H3') {
        h3Groups.push([node])
      } else {
        const lastGroup = h3Groups[h3Groups.length - 1]
        lastGroup?.push(node)
      }
    }

    for (const group of h3Groups) {
      if (group.length === 0) continue
      const parts = splitNodesByWordCount(group)
      for (const html of parts) {
        steps.push({ kind: 'content', html })
      }
    }
  }

  return steps.length > 0 ? steps : [{ kind: 'content', html: sanitized }]
}

/** Titres des grandes sections (h2) d'une session, utilisés pour l'aperçu imbriqué du plan. */
export function extractSectionTitles(contentHtml: string): string[] {
  const sanitized = DOMPurify.sanitize(contentHtml || '')
  const container = document.createElement('div')
  container.innerHTML = sanitized
  return Array.from(container.querySelectorAll('h2'))
    .map((el) => el.textContent ?? '')
    .filter((t) => t.trim().length > 0)
}

interface CardNavigatorProps {
  contentHtml: string
  onComplete: () => void
}

/**
 * Découpe le content_text d'une session en petites cartes (façon edX) et gère la navigation
 * entre elles : cartes de transition à chaque h2, cartes de contenu de 3 minutes max, barre de
 * progression fine, navigation précédent/suivant, swipe tactile.
 */
export function CardNavigator({ contentHtml, onComplete }: CardNavigatorProps) {
  const steps = useMemo(() => buildSteps(contentHtml), [contentHtml])
  const [index, setIndex] = useState(0)
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward')
  const touchStartX = useRef<number | null>(null)

  // Nouvelle session : toujours repartir de la première carte plutôt que de garder l'index de la
  // session précédente.
  useEffect(() => {
    setIndex(0)
  }, [contentHtml])

  const total = steps.length
  const currentStep = steps[index] ?? steps[0]
  const isLast = index === total - 1

  const contentCardNumbers = useMemo(() => {
    const map = new Map<number, number>()
    let n = 0
    steps.forEach((s, i) => {
      if (s.kind === 'content') {
        n += 1
        map.set(i, n)
      }
    })
    return map
  }, [steps])
  const totalContentCards = contentCardNumbers.size > 0 ? Math.max(...contentCardNumbers.values()) : 0
  const currentCardNumber = contentCardNumbers.get(index) ?? 0

  const goNext = () => {
    if (isLast) {
      onComplete()
      return
    }
    setDirection('forward')
    setIndex((i) => Math.min(i + 1, total - 1))
  }
  const goPrev = () => {
    if (index === 0) return
    setDirection('backward')
    setIndex((i) => Math.max(i - 1, 0))
  }

  const onTouchStart = (e: TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null
  }
  const onTouchEnd = (e: TouchEvent) => {
    if (touchStartX.current === null) return
    const dx = (e.changedTouches[0]?.clientX ?? 0) - touchStartX.current
    touchStartX.current = null
    if (Math.abs(dx) < 50) return
    if (dx < 0) goNext()
    else goPrev()
  }

  if (!currentStep) return null

  return (
    <div className="w-full">
      {/* Barre de progression fine façon YouTube, sur l'ensemble des cartes (transitions incluses). */}
      <div className="mb-5 h-1 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300 ease-out"
          style={{ width: `${((index + 1) / total) * 100}%` }}
        />
      </div>

      <div
        key={index}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className={cn(
          'animate-in fade-in duration-300',
          direction === 'forward' ? 'slide-in-from-right-8' : 'slide-in-from-left-8'
        )}
      >
        {currentStep.kind === 'transition' ? (
          <SectionTransitionCard title={currentStep.title} estimatedMinutes={currentStep.estimatedMinutes} onStart={goNext} />
        ) : (
          <div className="rounded-xl bg-white p-6 shadow-sm sm:p-8">
            {totalContentCards > 0 && (
              <p className="mb-4 text-xs font-medium uppercase tracking-wide text-gray-400">
                Carte {currentCardNumber} sur {totalContentCards}
              </p>
            )}
            <div className="reader-prose" dangerouslySetInnerHTML={{ __html: currentStep.html }} />
          </div>
        )}
      </div>

      {currentStep.kind === 'content' && (
        <div className="mt-6 flex flex-col-reverse items-center gap-3 sm:flex-row sm:justify-between">
          <Button variant="outline" className="h-12 w-full sm:h-10 sm:w-auto" onClick={goPrev} disabled={index === 0}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Précédent
          </Button>
          <p className="text-sm text-gray-400">
            Carte {currentCardNumber}/{totalContentCards}
          </p>
          <Button className="h-12 w-full sm:h-10 sm:w-auto" onClick={goNext}>
            {isLast ? 'Terminer' : 'Suivant'} <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
