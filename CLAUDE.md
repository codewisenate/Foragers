# CLAUDE.md — Frontend Website Rules

## Always Do First
- **Invoke the `frontend-design` skill** before writing any frontend code, every session, no exceptions.

## Anti-Generic Guardrails
- **CSS:** Nested modern CSS is the preferred approach, using variables for repeated measurements and style attributes.
- **Colors:** Never use Tailwind. Prefer oklch(from var(--color) l c h) over other methods.
- **Shadows:** Never use flat shadows. Use layered, color-tinted shadows with low opacity.
- **Typography:** Never use the same font for headings and body. Pair a display/serif with a clean sans. Apply tight tracking (`-0.03em`) on large headings, generous line-height (`1.7`) on body.
– **Sizing:** Prefer rem as the standard size unit.
- **Gradients:** Layer multiple radial gradients. Add grain/texture via SVG noise filter for depth.
- **Animations:** Only animate `transform` and `opacity`. Never `transition-all`. Use spring-style easing.
- **Interactive states:** Every clickable element needs hover, focus-visible, and active states. No exceptions.
– **Navigation** Ensure navigation is thoughtful, clean, and works across all resolutions no matter how it is implemented.
- **Images:** Maintain the png transparency approach of current in-page assets.
- **Spacing:** Use intentional, consistent spacing tokens — not random steps.
- **Depth:** Surfaces should have a layering system (base → elevated → floating), not all sit at the same z-plane.
– **Accessibility:** Support WCAG 2.2 AA in all efforts. Include ARIA as needed, but rememeber No ARIA is better than BAD ARIA.