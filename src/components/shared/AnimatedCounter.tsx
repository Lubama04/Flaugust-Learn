import { useEffect, useRef, useState } from 'react'

interface AnimatedCounterProps {
  end: number
  durationMs?: number
}

// Remplace react-countup : le pré-bundling des dépendances de Vite double-enveloppe l'export
// par défaut de ce paquet spécifique (`import CountUp from 'react-countup'` reçoit
// `{ default, useCountUp }` au lieu du composant lui-même), un problème d'interop CJS/ESM du
// bundler et non une erreur d'import de notre côté (confirmé en inspectant le module pré-bundlé
// directement dans le navigateur : son `default` contient encore un `default` imbriqué). Plutôt
// que de contourner un comportement peu fiable du bundler, ce petit composant autonome fait la
// même chose : anime un compteur de 0 vers sa valeur finale une fois visible à l'écran.
export function AnimatedCounter({ end, durationMs = 2000 }: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const [value, setValue] = useState(0)
  const startedRef = useRef(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    const animate = () => {
      const startTime = performance.now()
      const tick = (now: number) => {
        const progress = Math.min((now - startTime) / durationMs, 1)
        // easeOutCubic : démarre vite, ralentit en approchant de la valeur finale.
        const eased = 1 - (1 - progress) ** 3
        setValue(Math.round(eased * end))
        if (progress < 1) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && !startedRef.current) {
          startedRef.current = true
          animate()
          observer.disconnect()
        }
      },
      { threshold: 0.3 }
    )
    observer.observe(node)
    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [end])

  return <span ref={ref}>{value}</span>
}
