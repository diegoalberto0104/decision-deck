# AGENTS.md

Guía para agentes (Claude Code, Cursor, Codex, otros) que trabajan en este repo.

## Qué es

Un kit para decidir una compra. Tiene dos mitades:

1. **El método**, en `skills/` (formato Claude Code; también sirve como instrucciones para cualquier agente):

   | Paso | Skill | Entrega |
   |---|---|---|
   | 1 | [`criterios`](skills/criterios/SKILL.md) | `decision.config.json` |
   | 2 | [`investigar`](skills/investigar/SKILL.md) | `data/<segmento>.json` y `data/tiendas.json` |
   | 3 | [`auditar`](skills/auditar/SKILL.md) | `data/auditoria.md` |
   | 4 | [`compilar`](skills/compilar/SKILL.md) | `public/data/datos.json` y la web lista |

2. **La app plantilla** (`src/`, Vite + React + TypeScript): lee la config y los datos compilados.
   Primero se desliza (¿me gusta?), después radar, tier list y precio contra valor (¿me conviene?).

Si el agente no carga skills, lee el `SKILL.md` del paso y síguelo como instrucciones.

## Reglas

- **Nada del dominio en el código.** `src/` y `scripts/` no saben qué se compra: categoría, ejes,
  segmentos, textos y moneda viven en `decision.config.json`. `npm run check:dominio` lo comprueba.
- **Un dato sin fuente se muestra vacío.** Notas 1–5 solo con URL en `notas.fuentes`; si no, `null`.
- **Precio final** siempre: con envío, impuestos y comisión, en la moneda de la config.
- **Investigación ética:** despacio, sin saltarse antibot ni captchas, sin crear cuentas ni iniciar
  sesión. Si una tienda bloquea, se anota y se sigue.
- **Fotos de tiendas fuera del repo** (derechos de autor): `public/img/` y `public/data/` están en
  `.gitignore`. Los ejemplos usan SVG propios.
- **Sin datos personales** en datos ni textos. `npm run check:privado` busca términos prohibidos
  (la lista va en `terminos.privados.local` o en el secret `PRIVADO_TERMINOS`, nunca en el repo).
- Máximo 2 agentes en paralelo; solo el orquestador escribe los archivos finales y hace commit.

## Comandos

```
npm install
npm run data                    # valida y compila la config de la raíz (o el ejemplo por defecto)
npm run data -- --config examples/audifonos/decision.config.json
npm run dev                     # compila los datos y abre la web
npm run build                   # compila datos, tipos y web
npm run check:dominio           # cero términos del dominio en src/ y scripts/
npm run check:privado           # cero datos personales en el repo
npm run check:ejemplos          # build con cada ejemplo de examples/
```

## Mapa

- `schema/config.schema.json`: qué puede ir en la config (con descripciones).
- `schema/datos.schema.json`: formato de `data/*.json`.
- `scripts/build-data.mjs`: el pipeline (validación, franjas, ejes, insignias, imágenes).
- `src/lib/config.ts`, `src/lib/scoring.ts`: lectura de la config y puntajes.
- `examples/`: configs y datos de ejemplo.
- `gates/`: los chequeos de CI.
