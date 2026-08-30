import { useRef, useEffect, useState, useCallback } from 'react'

/**
 * useDraggablePanel — drag any panel by its [data-drag-handle] header.
 * Fixed: uses posRef to avoid stale closure; effect runs once only.
 */
export function useDraggablePanel(initialPos) {
  const [pos, setPos] = useState(initialPos)
  const posRef    = useRef(initialPos)   // mirror of pos — readable in event handlers
  const dragging  = useRef(false)
  const offset    = useRef({ x: 0, y: 0 })
  const panelRef  = useRef(null)

  // Keep posRef in sync whenever pos state changes
  useEffect(() => { posRef.current = pos }, [pos])

  useEffect(() => {
    const el = panelRef.current
    if (!el) return

    const onMouseDown = (e) => {
      if (e.target.closest('[data-drag-handle]')) {
        dragging.current = true
        // Use posRef.current so we always read the latest position
        offset.current = {
          x: e.clientX - posRef.current.x,
          y: e.clientY - posRef.current.y
        }
        e.preventDefault()
        e.stopPropagation()
      }
    }

    const onMouseMove = (e) => {
      if (!dragging.current) return
      let nextX = e.clientX - offset.current.x
      let nextY = e.clientY - offset.current.y
      
      const rect = el.getBoundingClientRect()
      const maxX = window.innerWidth - rect.width
      const maxY = window.innerHeight - rect.height
      
      nextX = Math.max(0, Math.min(nextX, maxX))
      nextY = Math.max(0, Math.min(nextY, maxY))
      
      const next = { x: nextX, y: nextY }
      posRef.current = next
      setPos(next)
    }

    const onMouseUp = () => { dragging.current = false }

    // Attach to document so drag keeps working when cursor leaves the panel
    el.addEventListener('mousedown', onMouseDown)
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)

    return () => {
      el.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
  }, []) // ← empty dep array — runs once, no stale closure

  // BUG-021: Re-clamp position when window resizes
  useEffect(() => {
    const onResize = () => {
      const el = panelRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const maxX = Math.max(0, window.innerWidth - rect.width)
      const maxY = Math.max(0, window.innerHeight - rect.height)
      setPos(prev => {
        const cx = Math.max(0, Math.min(prev.x, maxX))
        const cy = Math.max(0, Math.min(prev.y, maxY))
        if (cx !== prev.x || cy !== prev.y) return { x: cx, y: cy }
        return prev
      })
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const style = {
    position: 'fixed',
    left: pos.x,
    top:  pos.y,
    zIndex: 1050,
    cursor: 'default',
    userSelect: 'none'
  }

  return { panelRef, style }
}
