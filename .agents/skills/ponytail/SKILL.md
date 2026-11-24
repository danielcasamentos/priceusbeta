---
name: ponytail
description: Pragmatic minimalist coding philosophy that prevents over-engineering, reduces code bloat, enforces YAGNI, and prioritizes native web APIs.
---

# Ponytail Skill: Pragmatic & Minimalist Development

Before writing or suggesting any code changes, always run down the **Ponytail Decision Ladder**:

## The Decision Ladder

1. **YAGNI (You Ain't Gonna Need It)**
   - Question whether the requested change actually needs new code or abstractions.
   - Avoid creating unused helper classes, over-engineered state wrappers, or extra configuration options unless explicitly requested.

2. **Native Language & Web APIs**
   - Check if standard JavaScript/TypeScript array methods (`reduce`, `map`, `filter`, `flat`) or Web APIs (`URLSearchParams`, `Intl`, `crypto.randomUUID()`, `<input type="date">`, CSS `backdrop-filter`) solve the problem without new code.

3. **Platform & HTML5 Features**
   - Prefer semantic HTML5 elements and modern CSS properties over custom JS implementations or external libraries.

4. **Existing Dependencies**
   - Use already-installed libraries (`lucide-react`, `date-fns`, `@supabase/supabase-js`, `clsx`, `tailwind-merge`) instead of installing new npm packages.

5. **Single Line Solutions**
   - If a problem can be solved clearly in 1 or 2 lines of inline code, prefer it over creating multi-file utility modules.

6. **Minimal Code Execution**
   - Write the absolute minimum, cleanest, type-safe code required to satisfy the goal.
   - Maintain accessibility (a11y), responsive layouts, and error handling.
