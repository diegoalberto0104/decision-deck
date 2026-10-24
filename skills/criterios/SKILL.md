---
name: criterios
description: Entrevista al usuario, una pregunta a la vez, para fijar los criterios de una compra (uso real, presupuesto ideal y techo, innegociables, lo que se revisa sin descartar, ejes que importan) y escribe decision.config.json. Úsala al empezar una decisión de compra nueva o cuando el usuario diga "no sé qué comprar".
---

# Criterios: fijar contra qué se mide antes de buscar

Una búsqueda sin criterios no termina nunca. Esta skill produce `decision.config.json` en la raíz del
repo, validado contra `schema/config.schema.json`. Nada de buscar productos todavía.

## Reglas de la entrevista

- **Una pregunta por mensaje.** Corta, concreta, con un ejemplo de respuesta. Espera la respuesta.
- Ofrece opciones cuando ayuden ("¿algo así como A, B o C?"), pero acepta respuestas libres.
- No inventes criterios: si el usuario no sabe, propón un valor por defecto y dilo.
- Habla del uso, no de especificaciones. "¿Dónde y cuánto lo vas a usar?" antes que "¿cuántos mAh?".
- No guardes datos personales que no hagan falta para decidir (dirección, nombre, salud detallada).
  Si el usuario menciona una condición física, tradúcela a un criterio ("la estabilidad pesa más") y
  no la escribas tal cual.

## Preguntas, en este orden

1. **¿Qué quieres buscar?** Abre así, con ejemplos para destrabar: "unos zapatos, ropa, unos tacones,
   maquillaje, unos audífonos… o un producto específico que quieres encontrar al mejor precio en
   distintos lugares". Si ya sabe el modelo exacto, el método igual sirve: los segmentos pasan a ser
   variantes o lugares de compra y el peso fuerte va a precio final y disponibilidad.
2. **Para qué lo vas a usar.** Uso real: dónde, cuánto, en qué condiciones. → `categoria`, `titulo`, `descripcion`.
3. **¿Dónde quieres comprar?** Tiendas de tu país, Amazon EE. UU., tiendas de Europa, marketplaces,
   tiendas oficiales… y a qué país llega el envío. Define dónde busca `/investigar` y qué costos entran
   al precio final (envío internacional, impuestos de importación). → `paises` y `aclaraciones`.
4. **Presupuesto.** Lo que quiere gastar (`ideal`) y lo máximo que acepta con todo incluido (`techo`), en qué moneda. Aclara que siempre se compara el **precio final** (con envío, impuestos y comisión). → `presupuesto`, `moneda`, `idioma`.
5. **Segmentos.** ¿Hay usos distintos que pidan productos distintos? (p. ej. "lluvia" y "urbano"; "en casa" y "en el avión"). ¿Cuál es la compra principal? Uno solo también vale. → `segmentos` (uno con `principal: true`).
6. **Innegociables.** Lo que descarta sin discusión (una membrana verificada, una conexión, un tamaño máximo). Cada uno debe poder comprobarse con un dato de la ficha. → `innegociables[].condiciones`.
7. **Lo que no descarta pero revisa.** Lo que molesta pero tiene arreglo (un color, un vendedor tercero). No descarta: va a `alerta` del ítem durante la investigación. Anótalo en `aclaraciones` para que `investigar` lo sepa.
8. **Ejes.** De 4 a 6 cosas que más pesan, cada una de 1 a 5, y cuánto importa cada una (0 a 5). Incluye casi siempre `precio` (`derivado: "precio_inverso"`) y un eje subjetivo editable (`estilo`, `editable: true`, `desde_voto: true`). Si un eje sale de un número de la ficha (peso, batería), usa `derivado` + `campo` y, si sabe, 4 `cortes`. → `ejes`.
9. **Lo que sería ideal.** ¿Hay una combinación que sea "la compra perfecta"? (un par que sirva para todo, unos audífonos que también sirvan para llamadas). → `insignias` con `destacada: true`.

## Cerrar

1. Muestra un resumen en una tabla (criterio → decisión) y pide un OK explícito.
2. Escribe `decision.config.json` con `"$schema": "./schema/config.schema.json"` y `"datos": "data"`.
   Usa `examples/zapatos/decision.config.json` y `examples/audifonos/decision.config.json` como modelo.
3. Valida con `npm run data` (falla con un mensaje claro si la config no cumple el esquema; que
   falten datos todavía es normal).
4. Termina con el siguiente paso: "Ahora corre /investigar".
