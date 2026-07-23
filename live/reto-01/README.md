# Reto en Vivo 01 · Cariño — Ahorra por quien amas

> **Reto (en vivo, 50 min):** una landing de una sola página que resuelva un
> problema real e incorpore **2 palabras al azar** dadas por el chat.
> Palabras: **finanzas** + **amor**.

## La idea

**Cariño** convierte tus finanzas en un acto de amor. El ahorro tradicional es
un número frío que abandonamos; Cariño le pone un **rostro** a cada peso: ahorras
por una meta ligada a quien amas —tu pareja, tu familia, tu mascota, tu hermana,
tú— y le escribes una **carta a tu yo futuro** que se sella hoy y se abre el día
que llegas a la meta.

Además **vigila el precio** de lo que quieres (un vuelo, una casa, algo para tu
perro, un regalo) y te **recuerda y motiva** dinámicamente.

## El momento (gancho de votos)

Creas tu meta en vivo → la carta **vuela** 💌 y queda sellada → al abrirla "el día
que lo logras" cae una **lluvia de corazones + monedas** (amor + finanzas juntos)
y ves tu carta inicial. Todo en ~2 segundos, memorable, dentro del pitch de 1 min.

## Stack

- **HTML/CSS/JS** en un solo archivo, autocontenido, **sin backend ni IA**.
- Desplegado como **estático en Cloudflare Workers** (Workers Assets, cero build).
- Tipografías: Newsreader (serif editorial) + Instrument Sans + Caveat (la carta manuscrita).
- Motion: hero con tarjetas rotando + count-up, secciones vivas (íconos flotando, hover), animación de vuelo y celebración.

## Correr / desplegar

```bash
npx wrangler deploy   # sirve ./public como estático
```

**En vivo:** https://carino.robertzu43.workers.dev
