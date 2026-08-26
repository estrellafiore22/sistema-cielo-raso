# Pruebas

Se corren en un navegador de verdad (Chromium) contra el sistema tal como lo
usa la tienda. No hacen falta para usar el sistema: sirven para verificar,
antes de publicar, que un cambio no rompió nada.

```bash
bash pruebas/correr.sh
```

La primera vez instala Playwright en `/tmp/pruebas-cieloraso`, fuera del
repositorio, a propósito: el proyecto no tiene `package.json` y no debe
tenerlo, porque Vercel intentaría compilarlo.

| Suite | Qué cubre |
|---|---|
| `sistema.mjs` | Ingreso, roles, catálogo, inventario, retornos, despiece, las modalidades, transporte, pagos, calendario y boletas |
| `suspendido-calculo.mjs` | Cortes con y sin empate, geometría de la retícula, orientación más barata, unidades de cobro |
| `suspendido-plano.mjs` | Dibujo del plano, acercar, arrastrar, encuadrar y girar las principales |
| `suspendido-boleta.mjs` | Hoja técnica con el plano dentro |
| `pedidos-y-respaldos.mjs` | Escribir sin perder el foco, pedido de suspendido, cobro de saldo, cierre de obra con retornos y respaldos |

Devuelve 0 si todo pasa y 1 si algo falla.
