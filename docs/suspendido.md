# Cielo raso suspendido 61 × 61

Se elige en **Nuevo pedido → Tipo de trabajo**, y se vende con cualquiera de
las modalidades: con mano de obra, o solo el material. La tarifa de instalación
se carga en Ajustes → Cielo raso 61 × 61; si está en cero, se cobra solo el
material aunque la modalidad diga "con mano de obra".

Cómo calcula el sistema. Si algún número no te cuadra en obra, aquí está la
regla que lo produjo.

## Cómo se arma la retícula

- El **ángulo perimetral** corre pegado a las cuatro paredes.
- Las **T principales** van paralelas cada **122 cm**, de pared a pared.
- Las **T secundarias (122)** cruzan perpendicular cada **61 cm**, apoyadas de
  principal a principal.
- Las **T terciarias (61)** van paralelas a las principales, en el medio de
  cada paño de 122, y parten el paño de 122 × 61 en dos baldosas.

## La regla que decide todo: las puntas de empate

Una barra trae **dos puntas de fábrica**. Cada corte parte un tramo en dos,
pero solo sirve el tramo que conserva una punta. Por eso:

> De una barra salen **como máximo dos piezas útiles**, una por cada punta.
> Lo que quede en medio es chatarra.

Eso convierte el cálculo en emparejar cortes de dos en dos sin pasarse del
largo de la barra. Con la lista ordenada, el sistema resuelve el **óptimo
exacto**, no una aproximación: no existe reparto que use menos barras.

**Aplica a:** T principal, T secundaria, T terciaria.

**No aplica a:** ángulo perimetral (se empalma a tope contra la pared) ni
baldosas (se cortan con cuchilla). Ahí de una pieza salen tantos pedazos como
quepan.

### Ejemplo

5 recortes de 20 cm desde terciarias de 61 cm:

| Barra | Corte | Queda | ¿Sirve? |
|---|---|---|---|
| 1 | 20 + 20 | 21 cm | No, sin punta |
| 2 | 20 + 20 | 21 cm | No, sin punta |
| 3 | 20 | 41 cm | Sí, con punta |

Tres barras, no cinco. Y el sobrante de 41 cm queda listado para otra obra.

## Las dos decisiones que ahorran plata

### 1. Orientación de las T principales

El sistema calcula las dos orientaciones y se queda con la más barata. La
diferencia no es cosmética: si el largo del ambiente deja un recorte chico,
cada línea de principal obliga a sacrificar una barra de 366 cm entera para
sacar un pedacito.

En 5.35 × 4.16 m: en vertical cada principal necesita un recorte de 50 cm, y de
una barra de 366 solo salen dos → se botan 266 cm por barra. En horizontal el
recorte es de 169 cm, dos entran cómodas en una barra y el resto todavía sirve.

Hay un botón para forzar la orientación. Si fuerzas la más cara, el sistema te
dice cuánto estás perdiendo.

### 2. Secundaria corta → terciaria

Si un tramo de secundaria queda igual o más corto que una terciaria, se usa una
terciaria. Es el mismo perfil y cuesta la mitad: cortar una secundaria de
S/ 2.20 para tapar 47 cm cuando una terciaria de S/ 1.20 hace lo mismo es tirar
plata.

**Esto no se hace con las principales.** La principal es un perfil más pesado
que carga la estructura; una secundaria no la reemplaza.

## Separaciones

| Qué | Cada | Fuente |
|---|---|---|
| Puntos de alambre, sobre la principal | 122 cm | ASTM C636 (4 pies) |
| Clavos con fulminante, en el perimetral | 30 cm | Manuales de instalación |
| Alambre por punto | 100 cm | Configurable: depende de la altura |

Las tres se editan en la pantalla, en **Separaciones y precios**.

## Cómo se cobra cada material

Lo que se instala y lo que se compra no son lo mismo:

- **Perfiles y baldosas** — se cobran por unidad. "Comprar" sale del reparto de
  cortes, no de dividir el total: una barra partida no rinde dos barras.
- **Alambre** — se cobra por metro entero. 15.3 m se cobran como 16 m.
- **Clavos y fulminantes** — se cobran por combo de 100 pares. 20 pares son
  1 combo; 120 pares son 2 combos.

## Las dos tablas

**Material a instalar** — lo que va en el techo, en unidades y centímetros:
"4 un + 141 cm" significa cuatro barras enteras más 141 cm de una quinta.

**Precios** — lo que se compra, en la unidad en que cobra el proveedor.

## El plano

Acompaña todo el cálculo y se redibuja con cada cambio de medida, siempre
encuadrado completo y listo para acercar con la rueda del ratón o pellizcando
la pantalla.

Cada material tiene su color y su grosor. Las cotas van arriba y a la
izquierda; **el último tramo de cada cadena va en rojo**, porque es el recorte
y es el que decide cuánto material se pierde.

El mismo plano sale impreso en la orden interna y en la hoja técnica, que se
imprimen desde el detalle del pedido.

## Límites conocidos

- **Solo m²**: sin ancho × largo el sistema supone un ambiente cuadrado. Sirve
  para un precio de referencia, no para mandar a cortar.
- **Ambientes rectangulares**: no contempla columnas, ductos ni plantas en L.
  Para eso hay que dividir el ambiente y sumar.
- **Baldosas de esquina**: cada esquina recortada en las dos direcciones
  consume una baldosa propia. Es lo que pasa en obra.
- **Tornillo y baldosa** vienen sin precio cargado. El total no es real hasta
  que los cargues.
