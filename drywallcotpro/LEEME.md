# DrywallCot Pro

App web para diseñar y cotizar: plano 2D con cotas, vista 3D, cielo raso
(drywall por niveles, baldosa, láminas de PVC), casas prefabricadas con techo
de calamina y tijerales, y metrado con presupuesto en soles (S/).

Es independiente del sistema de la tienda que vive en la raíz del repositorio:
no comparte código ni datos con él.

## Cómo se prueba

Sin instalar nada:

```bash
python3 -m http.server 8000
# abrir http://localhost:8000/drywallcotpro/
```

Necesita internet la primera vez (descarga Three.js y jsPDF). Después funciona
sin conexión gracias al service worker (`sw.js`).

## Cómo se publica en Vercel (proyecto aparte)

1. vercel.com → **Add New… → Project** → importar `sistema-cielo-raso`.
2. **Project Name:** `drywallcotpro` → queda en `https://drywallcotpro.vercel.app`.
3. **Root Directory:** `drywallcotpro`. Framework: *Other*. Sin build.
4. Deploy. Cada push a `main` lo vuelve a publicar.

Al publicar una versión nueva, subir `VERSION` en `sw.js` para que los
teléfonos que ya la tienen instalada tomen los archivos nuevos.

## Estructura

```
index.html                Interfaz
css/app.css               Estilos (celular y PC)
js/app.js                 Arranque y pestañas
js/estado.js              Proyecto abierto, deshacer/rehacer, guardado automático
js/editor2d.js            Dedo/mouse sobre el plano y herramientas
js/vista2d.js             Dibujo del plano y cotas
js/propiedades*.js        Panel para editar medidas exactas
js/vista3d*.js            Escena Three.js: muros, cielos, techo, muebles
js/precios.js             Catálogo de materiales y rendimientos (EJEMPLO, editables)
js/metrado.js             Junta todo en lista de compra y presupuesto
js/calc/                  Motores de cálculo, sin DOM
  cielo-drywall.js        Cielo plano o por niveles, frentes verticales
  baldosa.js              Retícula centrada, T principal/secundarias, prueba 2 orientaciones
  pvc.js                  Tiras, empalmes y cortes de láminas de ~5.95 m
  muros.js                Tabiques drywall y muros prefabricados
  techo.js                Tijerales, correas, calamina (combinación más barata)
  cortes.js               Optimizador de cortes en una dimensión
```

## Valores de ejemplo (confirmar con el dueño)

- Plancha drywall 1.22 × 2.44 m; perfiles de 3.00 m; T principal 3.66 m.
- Lámina PVC 20/25/30 cm × 5.95 m.
- Calamina 0.83 m de ancho (0.76 útil), largos 1.80 / 2.40 / 3.00 / 3.60 m, traslape 0.15 m.
- Todos los precios en S/ son referenciales y se cambian en la pestaña Precios.
