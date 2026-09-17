# Paporla — Regla de diseño

**Para qué sirve esto:** para que las páginas públicas de Paporla no parezcan
hechas por una máquina. Es una regla escrita para este proyecto, con los
colores, la tipografía y los componentes que Paporla usa de verdad.

No es una copia de "taste skill" ni de ningún otro marco genérico: esos
frameworks dicen _"evita el aspecto genérico"_, que es como decir _"escribe
bien"_. Aquí las reglas son comprobables: o el contraste da 4.5:1 o no da.

---

## 1. Los cimientos (esto no se negocia)

### Paleta

Dos temas, y **no son el mismo esquema con los colores cambiados**. Son dos
decisiones distintas, y mezclarlas es el error más frecuente.

| Token      | Claro                  | Oscuro                 | Para qué             |
| ---------- | ---------------------- | ---------------------- | -------------------- |
| Fondo      | crema `#faf8f3`        | `#0a0a1a`              | la página            |
| Tarjeta    | blanco `#ffffff`       | `#0f0f1a`              | superficies elevadas |
| Texto      | verde bosque `#1a2e24` | claro                  | el cuerpo            |
| Primario   | esmeralda `#047857`    | neón `#00ff88`         | la acción principal  |
| Secundario | ámbar `#b45309`        | naranja vivo `#ff8a3c` | el acento            |
| Peligro    | `#b91c1c`              | —                      | errores              |

**Por qué el primario cambia tanto entre temas:** porque ningún verde cumple a
la vez con texto blanco encima y con texto negro encima. En claro, el primario
es un verde oscuro y el texto de encima es blanco (5.48:1). En oscuro, el
primario es neón y el texto de encima es casi negro (14.62:1). El color del
texto de un botón **no es una preferencia estética de quien lo escribe**: es el
token `--color-on-primary` y se usa sin decidir nada.

**Regla:** si estás escribiendo `text-white` o `text-black` a mano sobre un
fondo de color, estás improvisando una decisión que ya está tomada. Usa
`text-on-primary`.

### Tipografía

Inter, y solo Inter. Un solo peso por cada papel:

- Titular de página: `text-3xl md:text-4xl font-bold`
- Titular de sección: `text-2xl md:text-3xl font-bold`
- Cuerpo: `text-base`, `--color-text-secondary`
- Nota al pie: `text-sm`, `--color-text-muted`

**Regla:** como máximo **tres tamaños por pantalla**. Si necesitas un cuarto,
estás resolviendo un problema de jerarquía con tipografía, que es el recurso
fácil: reescribe el texto o agrupa la información.

### Forma

- Radio de tarjeta: `rounded-card` (0.75rem) o `rounded-card-lg` (1rem).
- Cristal: la clase `glass-card`. Ya trae fondo, borde y sombra.
- Sombra neón: `shadow-neon`, y solo en oscuro y solo en el botón principal.
  Un neón en cada tarjeta no es elegante, es ruido.

---

## 2. El recurso que hace que Paporla no parezca una plantilla

### La isla oscura

Un bloque con fondo verde bosque (gradiente `--island-bg`) **dentro** de una
página en crema. El neón vuelve a brillar ahí, porque vuelve a estar sobre
oscuro.

Este es el movimiento más característico de Paporla y el que ninguna plantilla
genera sola. Úsalo **una vez por página**, para la sección que de verdad quieres
que se recuerde: la cifra de impacto, el paso a paso, la llamada final.

Dos islas en la misma página dejan de ser un acento y se convierten en un
patrón. Una sola es una decisión.

### Especificidad

Lo que delata a un texto escrito por una máquina no es el vocabulario: es la
**ausencia de datos concretos**. Compara:

> ❌ _Ayudamos a reducir el desperdicio de alimentos en tu comunidad._

> ✅ _Un pack de El Bosque sale a $2.990 en vez de $8.900. Se retira entre
> las 18:00 y las 20:00, en Av. Central 1234._

La segunda frase no se puede escribir sin saber de qué se habla. La primera sí,
y por eso la puede escribir cualquiera, incluida una máquina.

**Regla:** en las páginas públicas, todo número, horario, comuna o precio tiene
que ser real o no ponerlo. Un dato verificable vence a cualquier adjetivo.

---

## 3. Anti-slop: lo que aquí está prohibido y por qué

Cada regla lleva el motivo al lado. Si algún día alguien quiere saltarse una,
que sepa qué está rompiendo.

### Composición

| Prohibido                                               | Por qué                                                                                                                                             |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tres tarjetas idénticas con icono + título + dos líneas | Es la silueta por defecto de todo generador. Si tus secciones encajan en ese molde, reestructúralas: una lista, una tabla, un paso a paso numerado. |
| Todo centrado                                           | El centrado continuo es una renuncia a jerarquizar. El texto largo, alineado a la izquierda. Centra titulares cortos y botones, nada más.           |
| Rejilla de 3 en 3 siempre                               | Varía: a veces 2 anchas, a veces 4 estrechas, a veces una fila completa. El ritmo monótono se lee como relleno.                                     |
| Blobs decorativos que no significan nada                | Paporla ya tiene uno en las páginas de auth. Es suficiente. No se añaden más.                                                                       |
| Emoji como iconografía                                  | Lucide, siempre. Un emoji cambia de dibujo en cada sistema operativo y no se puede alinear con el texto.                                            |

### Color

| Prohibido                                     | Por qué                                                                                                                                                                        |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Degradados violeta / índigo / azul eléctrico  | Es la firma visual del diseño generado. La paleta de Paporla es verde y ámbar; ahí no hay violeta que valga.                                                                   |
| Cuatro colores de acento en una sola pantalla | Primario para la acción, secundario para el acento, y ya está. Un tercer color compite con los otros dos.                                                                      |
| Colores de Tailwind a mano (`text-green-400`) | Están calibrados para fondo oscuro. Sobre la crema del modo claro se caen: `green-400` da 1.64:1. Usa `text-primary`, `text-secondary` o los tokens. Hay tests que lo vigilan. |
| `text-white` decidido botón a botón           | Eso es `--color-on-primary`, y cambia entre temas.                                                                                                                             |

### Animación

| Prohibido                                         | Por qué                                                                                                    |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Animar `width`, `height`, `top`, `left`           | Provoca reflujo en cada fotograma. Solo `transform` y `opacity`.                                           |
| Entradas escalonadas de más de 0,1 s por elemento | Una lista de seis tarjetas tarda un segundo en aparecer y eso se percibe como lentitud, no como elegancia. |
| Animar en bucle salvo `pulse-slow` / `glow`       | Lo que se mueve sin parar compite con el botón de la acción principal.                                     |
| Sin `prefers-reduced-motion`                      | Hay usuarios a los que el movimiento les marea. No es opcional.                                            |

### Escritura

| Prohibido                                                      | Por qué                                                                                                              |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| "Potencia", "revoluciona", "sin fisuras", "desata", "next-gen" | Relleno que no dice nada y que delata el origen.                                                                     |
| Tres adjetivos seguidos                                        | _"Una experiencia única, sencilla y sostenible"_ no comunica nada. Un dato concreto comunica más que tres adjetivos. |
| Exclamaciones en la interfaz                                   | La interfaz no grita. Reserva la exclamación para el saludo del panel.                                               |
| Prometer lo que la app no hace                                 | Va antes del diseño: es la regla número uno del proyecto. Si el contacto no envía correo, no dice "enviado".         |

---

## 4. Lista de comprobación antes de dar por hecha una página pública

1. **¿Tiene un `<h1>` y solo uno?** Sin él no hay jerarquía ni lector de pantalla que se oriente.
2. **¿Se sostiene en blanco y negro?** Si la página solo funciona con color, la jerarquía es decorativa.
3. **¿Cumple el contraste?** Todo el texto sobre crema, 4.5:1. Los gráficos, 3:1. Hay tests que lo comprueban.
4. **¿Se ve bien sin JavaScript?** El contenido y la llamada a la acción tienen que estar en el HTML.
5. **¿Se puede usar solo con el teclado?** Tabula la página entera. Si se te pierde el foco, está roto.
6. **¿Tiene una isla oscura, y solo una?**
7. **¿Hay al menos un dato concreto y verificable?** Un precio, un horario, una comuna, una cifra real.
8. **¿Se entiende en 5 segundos qué hace Paporla?** Si hay que leer dos pantallas, el titular está mal.
9. **¿A 320 px de ancho sigue usable?** No "se ve", sino usable.
10. **¿Respetas `prefers-reduced-motion`?**

---

## 5. Dónde se aplica

Solo a las **páginas públicas**: portada, `/about`, `/faq`, `/contacto`,
`/shops`, `/packs`.

**No** se aplica al panel, ni al panel del comercio, ni al admin. Ahí manda la
densidad de información, no la narrativa: un gestor de reservas tiene que caber
en una pantalla, y ponerle una isla oscura sería empeorarlo.

---

## 6. Cómo saber si ha funcionado

La prueba no es "¿se ve bonito?". Es esta:

> **Enséñale la página a alguien que no sepa qué es Paporla, durante cinco
> segundos, y pregúntale qué hace la empresa.**

Si te lo sabe decir, el diseño funciona. Si te dice "no sé, algo de comida" o
te describe los colores, no funciona, por muy bonito que sea.

Y la segunda prueba, la que más falla en el diseño generado:

> **¿Podría esta página pertenecer a cualquier otra empresa si le cambias el
> logo?**

Si la respuesta es sí, hay que rehacerla. Las páginas de Paporla tienen que
hablar de comida que se salva en una comuna concreta de Chile, a una hora
concreta, a un precio concreto. Eso no se puede cambiar de logo sin más.
