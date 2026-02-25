# DESIGN SYSTEM — Desk Booking (SaaS Modern Minimal)

> **Objetivo:** un diseño **moderno, profesional y “production-ready”**, inspirado en patrones SaaS actuales (estilo _Linear-ish_), priorizando **claridad, consistencia y accesibilidad** por encima de efectos decorativos.
> **Nota:** este sistema es **neutral de marca**. Cualquier identidad corporativa (p. ej. Camerfirma) se aplica como **tema** (override de tokens), no como estilo base.

---

## 1) Principios del sistema

### 1.1 Reglas duras

- **Claridad > decoración**: evitamos glass fuerte, 3D “de adorno”, cursores custom, gradients animados.
- **Consistencia total**: una sola fuente de verdad → **tokens** (colores, radios, sombras, spacing, motion).
- **Accesibilidad por defecto**: contraste suficiente, estados de foco visibles, targets táctiles adecuados.
- **Densidad compacta-media**: optimizado para uso diario (entorno productivo).
- **Motion sutil**: transiciones cortas y elegantes; nada “bouncy” o intrusivo.

### 1.2 Estética objetivo (sensación)

- Limpio, aireado, con jerarquía clara.
- Bordes suaves (no cuadrados puros).
- Sombras muy suaves (elevación “minimal”, no dramática).
- Color principal sobrio y moderno.

---

## 2) Tokens (la base de todo)

> **Regla:** en UI no se usan hex sueltos. Todo pasa por tokens semánticos.
> Los tokens están pensados para soportar **Light/Dark** y futuros “themes”.

### 2.1 Colores (Light)

**Neutrales**

- `bg` — `#F5F7FB` (fondo general)
- `surface` — `#FFFFFF` (cards / contenedores principales)
- `surface-2` — `#F1F4F9` (zonas secundarias / panels)
- `border` — `#E6EAF2`
- `text` — `#0B1220`
- `text-muted` — `#5B6472`
- `text-subtle` — `#7A8496` (opcional: hints, placeholders)
- `focus` — derivado de `primary` con opacidad (ring)

**Acento**

- `primary` — `#2563EB`
- `primary-hover` — `#1D4ED8`
- `primary-active` — `#1E40AF`
- `on-primary` — `#FFFFFF`

**Estados**

- `success` — `#16A34A`
- `warning` — `#F59E0B`
- `danger` — `#EF4444`
- `info` — `#0EA5E9` (opcional)

### 2.2 Colores (Dark) — base preparada

- `bg` — `#0B1220`
- `surface` — `#0F172A`
- `surface-2` — `#111C33`
- `border` — `#1F2A44`
- `text` — `#E6EAF2`
- `text-muted` — `#A7B0C0`
- `primary` — `#3B82F6`
- `primary-hover` — `#2563EB`
- `primary-active` — `#1D4ED8`
- `on-primary` — `#081022` (si el botón es muy brillante) o `#FFFFFF` según contraste
- `success` — `#22C55E`
- `warning` — `#FBBF24`
- `danger` — `#F87171`

> **Accesibilidad:** el texto sobre `primary` debe garantizar contraste suficiente. Si el azul se aclara demasiado en dark, usar `on-primary` oscuro.

---

## 3) Tipografía

### 3.1 Fuente

- **Principal:** `Manrope`
- **Fallback:** `"IBM Plex Sans", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif`

### 3.2 Escala tipográfica (recomendada)

- `display` (solo landing/login): 32–36px / weight 600
- `h1`: 28–32px / 600
- `h2`: 20–24px / 600
- `h3`: 16–18px / 600
- `body`: 14–16px / 400–500
- `small`: 12–13px / 400–500

**Reglas**

- Evitar `700` salvo títulos muy puntuales.
- Interlineado cómodo: 1.35–1.55.
- Jerarquía por **tamaño + peso + color**, no por “efectos”.

---

## 4) Radio system (bordes)

> **Decisión:** no bordes cuadrados puros. “SaaS moderno” = suavidad controlada.

- `radius-sm`: **8px** → inputs, botones, chips
- `radius-md`: **12px** → cards, contenedores
- `radius-lg`: **16px** → modales, panels grandes
- `radius-pill`: **999px** → badges, tags tipo “pill”

**Regla de coherencia**

- Componente **interactivo** (button/input) → `sm`
- Componente **contenedor** (card) → `md`
- Componente **overlay** (modal/popover) → `lg`

---

## 5) Elevation system (sombras)

> **Objetivo:** profundidad mínima. El “separador” principal es el **espaciado + borde**, no la sombra.

- `elev-0`: sin sombra (layout base)
- `elev-1`: cards (sombra muy suave)
- `elev-2`: dropdowns / modales (un poco más marcada)

**Reglas**

- Nada de sombras internas (evitamos neumorfismo puro).
- En dark mode, bajar la opacidad de sombra y confiar más en `border`.

---

## 6) Spacing & grid

### 6.1 Escala de spacing

Usar una escala consistente (ej. 4px base):

- 4, 8, 12, 16, 20, 24, 32, 40, 48

### 6.2 Contenedores y padding

- Cards: `p-16` a `p-20`
- Forms: `gap-12` / `gap-16`
- Listados: separaciones claras (8–12px)

**Regla:** más “aire” = más premium. No compactar demasiado.

---

## 7) Motion (microinteracciones)

### 7.1 Duraciones

- `fast`: 120–160ms (hover/focus)
- `base`: 180–220ms (transiciones de panel)
- `slow`: 240–320ms (modales, solo si es necesario)

### 7.2 Curvas

- Usar `ease-out` para entradas, `ease-in` para salidas.
- Evitar rebotes.

### 7.3 Qué microinteracciones SÍ

- Hover sutil en cards (ligera elevación o cambio de border).
- Focus ring claro en inputs.
- Botones: hover/active con cambios mínimos.

### 7.4 Qué NO

- Gradientes animados por scroll.
- Transiciones largas.
- Animaciones “decorativas” constantes.

---

## 8) Componentes — reglas de diseño

### 8.1 Botones

**Altura**

- Desktop: 36–40px
- Mobile: 40–44px

**Variantes**

- `primary`: fondo `primary`, texto `on-primary`
- `secondary`: `surface` + `border` + `text`
- `ghost`: sin fondo, hover con `surface-2`
- `destructive`: fondo `danger`, texto claro (sin neumorfismo)

**Estados**

- Hover: `primary-hover` / sombreado mínimo
- Active: `primary-active`
- Disabled: opacidad + cursor + sin hover

### 8.2 Inputs

**Altura:** 40px
**Estilo base:** `surface` + `border` visible
**Focus:** ring (derivado de `primary`)
**Error:** borde `danger` + mensaje claro

> **Regla:** inputs no cuadrados. Usar `radius-sm`.

### 8.3 Cards

**Base:** `surface`, `border`, `radius-md`, `elev-1`
**Header:** título + acciones (si aplica)
**Contenido:** padding consistente

### 8.4 Modales / Popovers

- `radius-lg`, `elev-2`
- Overlay sutil
- Acciones claras (primary + secondary)

### 8.5 Badges / Chips

- `radius-pill`
- `surface-2` en neutral
- `success/warning/danger` para estados

---

## 9) Toasts (notificaciones)

> **Decisión:** **top-right** (SaaS moderno, visible, no “legacy”).

**Reglas**

- Duración: 3–5s
- Máximo apilados: 3
- Tamaño contenido (no tapar UI)
- Variantes: success / error / warning / info
- Animación: fade + slide sutil (fast/base)

---

## 10) Iconografía

- Iconos lineales consistentes (p. ej. Lucide)
- Tamaños: 16/18/20
- Evitar mezclar estilos (filled + outline)

---

## 11) Accesibilidad (mínimos obligatorios)

- Focus ring visible siempre (no eliminar outline sin reemplazo).
- Targets interactivos: mínimo 40px en mobile, 36–40px en desktop.
- Contraste: texto principal alto; texto muted solo para secundarios.
- Estados: no depender solo del color (añadir icono/label cuando tenga sentido).

---

## 12) Theming (marca como “skin”, no base)

### 12.1 Cómo se aplica un tema corporativo

Un tema debe tocar únicamente:

- `primary` (+ hover/active)
- (opcional) `bg`, `surface-2`
- (opcional) `font-sans`

Todo lo demás permanece igual.
Resultado: “white-label” sin reescribir componentes.

### 12.2 Ejemplo de estrategia

- Tema `default` (este documento)
- Tema `camerfirma` (solo override tokens)

---

## 13) Checklist de coherencia (para revisar pantallas)

- ¿Todos los inputs y botones usan `radius-sm`?
- ¿Cards usan `radius-md`?
- ¿Modales usan `radius-lg`?
- ¿Hay hex sueltos en componentes? (debe ser NO)
- ¿Focus ring se ve siempre?
- ¿Toasts están top-right y no tapan contenido?
- ¿Sombras suaves y consistentes (solo elev-1/elev-2)?

---

## 14) Decisión final (resumen)

**Este sistema busca:**
✅ modernidad sin efectos innecesarios
✅ coherencia visual + escalabilidad
✅ apariencia “producto real”
✅ fácil de mantener con tokens y themes

**Y evita:**
❌ neumorfismo fuerte
❌ glassmorphism como base
❌ 3D / cursores personalizados
❌ animaciones decorativas

---

## Próximo paso técnico (cuando lo quieras)

1. Volcar estos tokens a `global.css` usando `@theme` (Tailwind v4).
2. Mapear a utilidades (`bg-bg`, `text-text`, `border-border`, etc.).
3. Crear componentes base (`Button`, `Input`, `Card`, `Modal`) que consuman tokens.
