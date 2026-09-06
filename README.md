# ✝️ Evangelio del Día — Generador de Historias para Instagram

Aplicación web que genera automáticamente una historia de Instagram
(1080×1920 px) con el Evangelio del día, lista para descargar y publicar.

No necesitás saber programar para usarla.

---

## 1. Cómo funciona (explicación breve)

1. Al apretar **"GENERAR EVANGELIO DE HOY"**, la app detecta la fecha
   de tu computadora y le pregunta a un servicio público y gratuito
   (**AELF**, `api.aelf.org`) cuál es la referencia bíblica real del
   Evangelio de ese día (libro, capítulo y versículos).
2. Como ese servicio da el texto en francés, la app **no lo usa** para
   el texto: solo te muestra la referencia real y te pide que **pegues
   vos el texto en español** (de tu misal, la Biblia de tu parroquia,
   o cualquier fuente confiable). Así nunca se inventa ni se traduce
   mal una cita bíblica.
3. Con esos datos, dibuja la historia en un `<canvas>` de 1080×1920 px,
   ajustando automáticamente el tamaño de letra para que el texto
   entre sin cortarse ni superponerse.
4. Descargás la imagen en PNG, lista para subir a Instagram Stories.
5. Si no hay Internet o el servicio no responde, la app pasa sola al
   **modo manual**: completás todo vos mismo y la imagen se genera igual.

---

## 2. Sobre la fuente del Evangelio (API usada)

- **API:** AELF (`https://api.aelf.org`), servicio público de la
  Asociación Episcopal Litúrgica para los países Francófonos.
- **¿Requiere clave (API key)?** No.
- **¿Tiene límites?** No hay un límite publicado para uso normal
  (una consulta por día por usuario es un uso mínimo).
- **¿Qué se usa de la API?** Solo la **referencia bíblica** (ej.
  "Lucas 14, 25-33"), nunca el texto, porque la API lo devuelve en
  francés.
- **¿Qué pasa si la API deja de responder?** La app lo detecta y
  automáticamente te ofrece el **modo manual**, con un mensaje claro
  (nunca un error técnico ni una pantalla en blanco).
- **¿Se puede reemplazar por otra fuente en el futuro?** Sí. Toda la
  lógica de la API está en un solo lugar de `app.js`, en la función
  `obtenerReferenciaAutomatica()`. Si en el futuro conseguís una API
  confiable que dé el Evangelio completo en español, se reemplaza ahí.

---

## 3. Estructura del proyecto

```
/evangelio-agente
│
├── index.html      → Estructura de la página
├── style.css       → Estilos visuales de la interfaz (no del PNG)
├── app.js          → Toda la lógica: API, canvas, historial, errores
├── config.js       → Datos editables: nombre de iglesia, colores, textos
├── assets/         → Carpeta libre para que guardes tu logo si querés
└── README.md       → Este archivo
```

No hay dependencias externas, no hay que instalar Node, npm, ni nada:
es HTML + CSS + JavaScript puro, para que funcione en cualquier
computadora sin conocimientos de programación.

---

## 4. Instalación

1. Descargá o copiá la carpeta `evangelio-agente` completa a tu
   computadora (por ejemplo, al Escritorio).
2. No hace falta instalar nada más.

---

## 5. Cómo ejecutarlo en tu computadora

La app necesita abrirse a través de un **servidor local** (no
funciona perfecto con doble clic directo en `index.html`, porque
algunos navegadores bloquean la carga de archivos locales por
seguridad). Elegí **una** de estas opciones:

### Opción A (la más simple): extensión de VS Code
1. Instalá [Visual Studio Code](https://code.visualstudio.com/) (gratis).
2. Instalá la extensión **"Live Server"**.
3. Abrí la carpeta `evangelio-agente` en VS Code.
4. Click derecho sobre `index.html` → **"Open with Live Server"**.
5. Se abre solo en tu navegador.

### Opción B: con Python (si ya lo tenés instalado)
1. Abrí una terminal dentro de la carpeta `evangelio-agente`.
2. Ejecutá:
   ```
   python -m http.server 8000
   ```
3. Abrí tu navegador en: `http://localhost:8000`

### Opción C: extensión de Chrome
1. Instalá la extensión **"Web Server for Chrome"** desde la Chrome
   Web Store.
2. Abrila y elegí la carpeta `evangelio-agente`.
3. Click en el enlace que te da (ej. `http://127.0.0.1:8887`).

---

## 6. Cómo usarlo (flujo diario)

1. Abrí la aplicación.
2. Presioná **"GENERAR EVANGELIO DE HOY"**.
3. Esperá unos segundos.
4. Revisá la referencia (libro, capítulo, versículos) que se completó
   sola, y **pegá el texto del Evangelio en español** en el cuadro de
   texto.
5. Presioná **"PREVISUALIZAR"**.
6. Si te gusta el resultado, presioná **"DESCARGAR PNG"**.
7. Subí la imagen a Instagram Stories.

Podés usar **"Opciones avanzadas"** para probar con otra fecha, o para
saltar directo al **modo manual** si preferís cargar todo vos mismo.

---

## 7. Cómo publicarlo gratis en Internet (opcional)

Si querés que cualquier persona de tu equipo de redes pueda usarlo
desde un link, sin instalar nada, subilo gratis. La opción más
sencilla es **Netlify**:

### ✅ Recomendada: Netlify (arrastrar y soltar, sin cuenta técnica)
1. Entrá a https://app.netlify.com/drop
2. Arrastrá la carpeta `evangelio-agente` completa a la página.
3. En segundos te da un link público (ej. `https://tu-app.netlify.app`).
4. Lista para usar desde el celular o cualquier computadora.

### Alternativa: GitHub Pages
1. Creá una cuenta gratis en https://github.com
2. Creá un repositorio nuevo y subí los archivos de la carpeta.
3. Andá a **Settings → Pages** del repositorio.
4. En "Branch" elegí `main` y guardá.
5. GitHub te da un link tipo `https://tu-usuario.github.io/tu-repo`.

### Alternativa: Vercel
1. Creá una cuenta gratis en https://vercel.com
2. Click en "Add New Project" → subí la carpeta o conectá tu repositorio
   de GitHub.
3. Dejá la configuración por defecto (es un sitio estático).
4. Vercel te da un link público al terminar el despliegue.

---

## 8. Dónde cambiar el nombre de la iglesia

Abrí `config.js` con cualquier editor de texto (o VS Code) y cambiá:

```js
churchName: "Nombre de tu Iglesia",
```

Guardá el archivo y recargá la página.

---

## 9. Dónde cargar el logo

El logo **no se pone en el código**: se carga desde la propia
aplicación, en el campo **"Logo de la iglesia"** del formulario,
apretando "Elegir archivo". Se guarda automáticamente para la próxima
vez que abras la app (en `localStorage`, en esa misma computadora y
navegador).

Si no cargás ningún logo, la app dibuja automáticamente una cruz
decorativa en su lugar — nunca se rompe el diseño.

Si preferís que el logo esté fijo para todos (sin tener que cargarlo
cada vez desde otra computadora), poné el archivo de imagen dentro de
`assets/` (por ejemplo `assets/logo.png`) y escribí esa ruta en
`config.js` en `logoPath`. (Esto requiere una pequeña modificación en
`app.js` para leer esa ruta como fuente por defecto; el código está
preparado con comentarios en `config.js` para guiarte si querés
hacerlo vos o pedirlo como mejora.)

---

## 10. Cómo cambiar colores y diseño

Todo se edita en `config.js`, sección `colors`, `fonts` y `layout`:

```js
colors: {
  backgroundTop: "#f2ede3",
  backgroundBottom: "#e7ded0",
  accent: "#a9835f",
  ...
}
```

Cambiá los códigos de color (podés buscar "selector de color HTML" en
Google para elegir cualquier color y copiar su código). Guardá y
recargá la página para ver el cambio.

Los tamaños de letra y márgenes están en `layout`, y los textos fijos
(como "Palabra del Señor" o la etiqueta inferior) están en
`headerTitleLine1`, `headerTitleLine2`, `finalPhrase` y `bottomTag`.

---

## 11. Lista de posibles errores y soluciones

| Situación | Qué hace la app | Qué podés hacer |
|---|---|---|
| Sin conexión a Internet | Avisa y pasa a modo manual | Completar los datos vos mismo |
| El servicio de referencias (AELF) no responde | Avisa y pasa a modo manual | Reintentar más tarde o seguir manual |
| El logo no carga o el archivo está dañado | Usa automáticamente una cruz decorativa | Probar con otra imagen (JPG o PNG) |
| El texto del Evangelio es muy largo | Reduce la letra automáticamente; si aun así no entra, avisa sin cortar el texto | Usar una versión resumida del texto |
| Recargás la página a mitad de uso | La app vuelve a la pantalla inicial; el logo e historial quedan guardados | Volver a apretar "Generar" |
| El navegador bloquea `index.html` abierto con doble clic | La app puede no cargar bien los estilos | Usar un servidor local (ver sección 5) |

La aplicación nunca muestra errores técnicos en inglés ni queda en
blanco: siempre da un mensaje en español explicando qué pasó y qué
hacer.

---

## 12. Personalización rápida — resumen

| Qué querés cambiar | Dónde |
|---|---|
| Nombre de la iglesia | `config.js` → `churchName` |
| Logo | Botón "Cargar logo" dentro de la app |
| Colores | `config.js` → `colors` |
| Tipografías | `config.js` → `fonts` |
| Frase final / etiqueta inferior | `config.js` → `finalPhrase`, `bottomTag` |
| Tamaños de letra y márgenes | `config.js` → `layout` |
