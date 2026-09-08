# ✝️ Evangelio del Día — Generador de Historias para Instagram

Aplicación web que genera automáticamente una historia de Instagram
(1080×1920 px) con el Evangelio del día, lista para descargar y publicar.

No necesitás saber programar para usarla.

---

## 1. Cómo funciona (explicación breve)

1. Al apretar **"GENERAR EVANGELIO DE HOY"**, la app detecta la fecha
   de tu computadora e intenta obtener el Evangelio **automáticamente,
   sin que tengas que buscar ni pegar nada**, probando fuentes en este
   orden:
   - **Nivel 1 — Texto completo en español (automático):** consulta
     el servicio público "Evangelium" (basado en Evangelizo.org), que
     devuelve la referencia y el texto ya en español. Si funciona,
     la imagen se puede generar sin escribir una sola palabra.
   - **Nivel 2 — Solo referencia real (respaldo):** si el Nivel 1 no
     responde, consulta AELF (fuente oficial católica) para al menos
     obtener la referencia bíblica real (libro, capítulo, versículos)
     y te pide pegar el texto en español.
   - **Nivel 3 — Modo manual:** si no hay Internet o ninguna fuente
     respondió, completás todo vos. La app **nunca inventa** una cita
     ni un texto bíblico en ningún nivel.
2. Con esos datos, dibuja la historia en un `<canvas>` de 1080×1920 px,
   ajustando automáticamente el tamaño de letra para que el texto
   entre sin cortarse ni superponerse.
3. Descargás la imagen en PNG, lista para subir a Instagram Stories.

---

## 2. Sobre las fuentes del Evangelio (APIs usadas)

### Nivel 1 — Evangelium (texto completo automático)
- **API:** `https://evangelium.manuelsanchez.dev/api/es/days/{fecha}`,
  un proyecto independiente y gratuito que expone en JSON los datos
  de [Evangelizo.org](https://www.evangelizo.org/) en varios idiomas,
  incluido español.
- **¿Requiere clave?** No. **¿Límites?** No publicados.
- **¿Es 100% confiable?** Es un proyecto de un desarrollador
  independiente, **no un servicio oficial de la Iglesia**. Puede estar
  caído en algún momento. Por eso la app valida que la fecha
  devuelta coincida con la pedida y que el texto no esté vacío antes
  de usarlo — si algo no cierra, pasa sola al Nivel 2, nunca muestra
  un texto sospechoso o incompleto como si fuera el real.

### Nivel 2 — AELF (solo referencia, respaldo)
- **API:** `https://api.aelf.org`, servicio oficial de la Asociación
  Episcopal Litúrgica para los países Francófonos. Gratuita, sin
  clave, muy estable.
- Se usa solo para la **referencia** (ej. "Lucas 14, 25-33"), nunca
  para el texto, porque esa API lo da en francés.

### Si ambas fallan
La app pasa al **modo manual** con un mensaje claro (nunca un error
técnico ni una pantalla en blanco), y vos completás los datos.

### ¿Se puede cambiar la fuente en el futuro?
Sí. Toda la lógica está en dos funciones bien separadas en `app.js`:
`obtenerEvangelioCompletoAutomatico()` (Nivel 1) y
`obtenerReferenciaAutomatica()` (Nivel 2).

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
| El servicio de texto completo (Nivel 1) no responde | Pasa en silencio al Nivel 2 (solo referencia) | Pegar el texto en español cuando te lo pida |
| Ningún servicio automático responde | Avisa y pasa a modo manual | Completar los datos vos mismo |
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
