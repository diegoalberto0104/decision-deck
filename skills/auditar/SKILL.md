---
name: auditar
description: Audita lo que investigaron los agentes antes de decidir con eso - modelos que no existen, claims sin fuente, precios sin disponibilidad, variantes mezcladas - y escribe data/auditoria.md con hallazgo, riesgo y acción. Úsala después de /investigar y antes de /compilar.
---

# Auditar: lo que produce un agente es un borrador

Revisa `data/*.json` contra las fuentes y escribe `data/auditoria.md`. Corrige los datos solo cuando
la corrección es clara y verificable; si no, anota y deja la decisión al usuario.

## Qué revisar

1. **Modelos que existen tal cual.** El nombre, la versión y la variante existen en la tienda oficial
   o en una reseña. Desconfía de nombres "demasiado buenos" (versión impermeable de un modelo que no la tiene).
2. **Claims sin fuente.** Cada nota 1–5 tiene una URL en `notas.fuentes` que la respalda. Las notas sin
   fuente pasan a `null`.
3. **Innegociables verificados en la ficha.** Si el innegociable depende de un dato (membrana, conexión),
   que la ficha lo diga explícitamente. "Según el nombre del modelo" no basta.
4. **Precios con disponibilidad.** `disponible: true` solo si se comprobó la variante en stock.
   Precio de una variante distinta = otra oferta, o `disponible: false`.
5. **Variantes mezcladas.** Peso de otra talla, color de otro modelo, precio de otra capacidad.
6. **Precio final completo.** Envío, impuestos y comisión incluidos o anotados.
7. **Fechas.** Ofertas con más de 7 días: revisar de nuevo antes de comprar.
8. **Normativa o reglas citadas.** Cualquier cita legal o de impuestos se confirma en la fuente oficial.
9. **Datos personales.** Nada que identifique al usuario (talla exacta, dirección, salud) en textos libres.

## Formato de data/auditoria.md

```md
# Auditoría · <categoría> · <fecha>

| # | Hallazgo | Ítem | Riesgo | Acción | Estado |
|---|---|---|---|---|---|
| 1 | El peso es de otra talla | marca-modelo | medio: cambia el eje peso | buscar peso de la talla base | corregido |
```

- **Riesgo**: alto (cambia la compra), medio (cambia el orden), bajo (cosmético).
- **Estado**: corregido, pendiente o aceptado (con la razón).

## Cerrar

Resume cuántos hallazgos por riesgo, qué se corrigió y qué queda para el usuario. Siguiente paso:
"Ahora corre /compilar".
