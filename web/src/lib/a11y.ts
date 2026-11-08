export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true
}

export function motionBehavior(): ScrollBehavior {
  return prefersReducedMotion() ? "auto" : "smooth"
}
