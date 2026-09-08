/**
 * =====================================================================
 *  CONFIG.JS — Archivo de configuración del "Evangelio del Día"
 * =====================================================================
 *  Acá cambiás los datos de tu iglesia, colores, tipografías, textos
 *  y márgenes SIN tocar el resto del código (app.js, index.html).
 *
 *  Después de editar este archivo, guardalo y volvé a abrir/recargar
 *  index.html en el navegador para ver los cambios.
 * =====================================================================
 */

const CONFIG = {

  // -------------------------------------------------------------
  // 1) DATOS DE LA IGLESIA
  // -------------------------------------------------------------
  churchName: "Nombre de tu Iglesia",

  // El logo se carga desde la app (botón "Cargar logo"), no hace
  // falta poner nada acá. Si preferís un logo fijo para todos los
  // usuarios de esta computadora, podés poner un archivo local, ej:
  // logoPath: "assets/logo.png"
  // Si lo dejás en null, se usa siempre el logo cargado por el
  // usuario, o una cruz decorativa si no cargó ninguno.
  logoPath: null,

  // -------------------------------------------------------------
  // 2) TEXTOS
  // -------------------------------------------------------------
  headerTitleLine1: "EVANGELIO",     // título grande en mayúsculas
  headerTitleLine2: "del día",       // título en cursiva, debajo
  finalPhrase: "Palabra del Señor",  // frase final debajo del texto
  bottomTag: "La Palabra de Dios\nnos guía", // etiqueta decorativa (usá \n para salto de línea)

  // -------------------------------------------------------------
  // 3) COLORES
  // -------------------------------------------------------------
  colors: {
    backgroundTop: "#f2ede3",     // color superior del fondo (crema claro)
    backgroundBottom: "#e7ded0",  // color inferior del fondo (crema más oscuro)
    accent: "#a9835f",            // color del "trazo" decorativo y detalles
    accentDark: "#8a6a49",        // variante más oscura del acento
    textDark: "#2b2620",          // color principal del texto (casi negro cálido)
    frameBorder: "#8a6a49",       // color del marco que rodea el texto del Evangelio
    tagText: "#4a3f33"            // color de la etiqueta inferior
  },

  // -------------------------------------------------------------
  // 4) TIPOGRAFÍAS
  //    Podés poner varias separadas por coma; el navegador usa la
  //    primera disponible. No hace falta instalar nada: se usan
  //    fuentes que ya vienen en Windows / Mac / Linux.
  // -------------------------------------------------------------
  fonts: {
    titleCaps: "700 normal 'Georgia', 'Times New Roman', serif",
    scriptTitle: "italic 400 'Brush Script MT', 'Segoe Script', cursive",
    reference: "700 normal 'Georgia', 'Times New Roman', serif",
    body: "400 normal 'Georgia', 'Times New Roman', serif",
    tag: "italic 400 'Brush Script MT', 'Segoe Script', cursive"
  },

  // -------------------------------------------------------------
  // 5) TAMAÑO DEL LIENZO (no recomendamos cambiar esto: es el
  //    tamaño exacto que pide Instagram Stories)
  // -------------------------------------------------------------
  canvas: {
    width: 1080,
    height: 1920
  },

  // -------------------------------------------------------------
  // 6) MÁRGENES Y TAMAÑOS DE TEXTO (en píxeles, sobre un lienzo
  //    de 1080x1920). Si el texto del Evangelio es muy largo, la
  //    app va a ir reduciendo estos tamaños automáticamente entre
  //    "bodyFontMax" y "bodyFontMin" hasta que entre.
  // -------------------------------------------------------------
  layout: {
    marginX: 90,              // margen izquierdo/derecho general
    frameMarginTop: 640,      // dónde empieza el marco del texto
    frameMarginBottom: 320,   // separación del marco respecto del pie (deja lugar a la frase final + etiqueta sin que se toquen)
    framePadding: 55,         // espacio interno del marco al texto
    titleFontSize: 88,
    scriptFontSize: 92,
    referenceFontSize: 46,
    bodyFontMax: 42,
    bodyFontMin: 24,
    lineHeightRatio: 1.5
  }
};
