# Del "no sé qué comprar" a una herramienta de decisión

**Caso de estudio · Diseño de producto + agentes de IA · 2 días**

Rol: todo (usuario, diseñador, product owner y quien dirigió a los agentes que investigaron y construyeron).
Stack: Claude Code con agentes en paralelo, Vite, React, TypeScript, shadcn/ui, Recharts, Motion, Vercel.

---

## 1. El problema

Necesitaba un par de zapatos impermeables para caminar entre 5 y 8 km al día con lluvia, y que
además sirvieran en ciudad. Suena simple. En la práctica estaba bloqueado:

- **No sabía por dónde empezar.** Gore-Tex, Outdry, RAIN.RDY, "water resistant": cada marca nombra
  la impermeabilidad a su manera y no todas significan lo mismo.
- **No sabía dónde buscar.** El mismo modelo aparecía en la tienda oficial, en grandes superficies, en
  marketplaces y en tiendas del exterior, con precios distintos y sin saber cuál era el costo final.
- **Los datos de las tiendas engañan.** Un precio sin mi talla disponible no sirve, y varias tiendas
  muestran la talla activa aunque esté agotada.
- **Las reseñas se contradicen.** Una dice que agarra bien en mojado, otra que resbala.
- **Y soy muy indeciso comprando zapatos.** Con tantas pestañas abiertas, la decisión no llegaba nunca.

El problema real era de decisión, más que de información: tenía demasiada, desordenada y sin un
criterio para pesarla.

## 2. Cómo lo planteé

Antes de buscar un solo zapato fijé los criterios, para que la búsqueda tuviera contra qué medirse:

| Criterio | Decisión |
|---|---|
| Presupuesto | Tope ideal de 500.000 COP y techo duro de 550.000, siempre precio final (con descuento, envío e impuestos) |
| Prioridad | La compra principal es el impermeable; lo ideal es **un solo par que sirva para todo** |
| Comodidad | La estabilidad pesa tanto como la amortiguación: son muchos kilómetros al día |
| Disponibilidad | Un precio sin talla confirmada no cuenta |
| Estilo | El color no descarta: lo que no me gusta va a una cola de revisión, no a la basura |

Esa última regla salió de conocerme: si descarto por color, pierdo opciones buenas por un detalle que
a veces tiene alternativa en otro tono.

## 3. Investigación con agentes, y una auditoría

Repartí la investigación entre agentes de IA en paralelo, uno por tipo de uso, con reglas explícitas:
ir despacio, nada de saltarse protecciones antibot ni crear cuentas, y si una tienda bloquea, se anota
y se sigue. Las tiendas con protección se leyeron en un navegador real, las que exponen datos abiertos
se leyeron por script.

Antes de construir, **audité lo que la IA ya me había dado** en una conversación anterior. Encontré
once problemas, entre ellos:

- Una cita normativa que había que confirmar en la fuente oficial.
- Modelos con nombres que podían no existir tal cual.
- Un color cruzado entre la lista y el finalista.
- Un zapato marcado como impermeable que probablemente no tenía membrana.
- Pesos de fuentes mezcladas, a veces de tallas distintas.

Cada hallazgo quedó con su riesgo y su acción. La lección que me llevo para cualquier proyecto con IA:
lo que produce un agente es un borrador hasta que se verifica contra la fuente.

## 4. Los datos como producto

Ningún precio se escribió a mano en la interfaz. Todo sale de archivos de datos con fecha y fuente por
cada oferta, y un script los compila para la web.

- **77 zapatos** evaluados
- **Casi 300 ofertas** con precio, disponibilidad y fecha de verificación
- **20 tiendas** locales e internacionales

El ejemplo público del repo (`examples/zapatos/`) trae un subconjunto de esas ofertas y tiendas.
- Notas de 1 a 5 por eje, cada una con su fuente (RunRepeat, OutdoorGearLab, RTINGS). Si no había
  fuente, la nota queda vacía y la página dice "sin dato": prefiero un hueco honesto a un número inventado.

## 5. Diseñar la decisión

Aquí está la parte de diseño que más me interesa. Como la indecisión era emocional, la herramienta
separa las dos formas de decidir:

**Paso 1: deslizar, tipo Tinder.** Una tarjeta a la vez con la foto, el modelo y el precio en
pequeño. Sí, No o Tal vez. Solo lo visual, sin especificaciones, porque si no me gusta cómo se ve
no lo voy a usar, por bueno que sea. Primero los que tienen mi talla y entran en el presupuesto; al
final los demás, con su etiqueta.

**Paso 2: los datos, solo para los elegidos.**

- **Radar de 6 ejes** (comodidad, estabilidad, agarre en mojado, peso, precio y estilo) con hasta 3
  zapatos superpuestos, al estilo de las comparativas de RTINGS.
- **Tier list y precio contra calidad**, con la frontera de mejor valor marcada.
- **Insignia "Par único"** para los impermeables verificados que también sirven en ciudad, porque
  esa era la prioridad.
- **Comparación lado a lado** con el mejor valor de cada fila resaltado.
- Beneficios y contras de cada zapato, también los incómodos.

Diseño oscuro, móvil primero: la herramienta se iba a usar dentro de la tienda, con el zapato en la
mano.

## 6. Construcción

Del plan a la web publicada en dos días. Los agentes construyeron bajo un plan por fases; yo definí
el esquema de datos, el flujo y el diseño, revisé cada entrega y validé en el navegador a 375 px antes
de publicar. Cada error encontrado en la validación (votos rápidos que se perdían, etiquetas del radar
ilegibles, fotos en formatos raros) volvió como un arreglo con su control.

## 7. El resultado

Compré los **Merrell Speed Strike 2 GTX** por **447.930 COP**, en la tienda oficial, un 10 % por debajo
de mi tope ideal.

No eran el número uno del ranking. Quedaron en el tier B (3,47 de 5), por debajo de opciones más
baratas que puntuaban mejor. Pero tenían Gore-Tex verificado, la talla disponible en tres tiendas,
la insignia de par único y me gustaban de verdad. La herramienta también me mostró sus
contras: drop alto y un agarre en mojado apenas medio.

Los compré sabiendo exactamente qué cedía y por qué, que es justo lo que no lograba hacer antes. La
herramienta no decidió por mí: me dejó **decidir con los compromisos a la vista en vez de seguir
buscando el zapato perfecto**.

## 8. Lo que me llevo

1. **Fijar criterios antes de buscar** convierte una búsqueda infinita en una que puede terminar.
2. **Separar lo emocional de lo racional** en la interfaz destraba al usuario indeciso: primero
   "¿me gusta?", después "¿me conviene?".
3. **Los agentes de IA aceleran la investigación, pero el criterio y la verificación siguen siendo
   del diseñador.** La auditoría encontró errores que habrían terminado en una mala compra.
4. **Un dato sin fuente se muestra como vacío.** La confianza en la herramienta depende de eso.
