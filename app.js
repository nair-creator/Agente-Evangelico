/**
 * =====================================================================
 *  APP.JS — Evangelio del Día
 * =====================================================================
 *  Este archivo contiene toda la lógica: obtener la fecha, pedir la
 *  referencia del Evangelio a la API AELF, dibujar la historia en un
 *  <canvas> de 1080x1920, generar el PNG y guardar el historial.
 *
 *  Está organizado en secciones para que sea fácil de leer y modificar.
 * =====================================================================
 */

(function () {
  "use strict";

  // -------------------------------------------------------------
  // 0) REFERENCIAS A ELEMENTOS DEL DOM
  // -------------------------------------------------------------
  const el = {
    banner: document.getElementById("banner"),

    btnGenerar: document.getElementById("btnGenerar"),
    btnToggleAvanzado: document.getElementById("btnToggleAvanzado"),
    panelAvanzado: document.getElementById("panelAvanzado"),
    inputFecha: document.getElementById("inputFecha"),
    btnManual: document.getElementById("btnManual"),

    stepData: document.getElementById("stepData"),
    displayFecha: document.getElementById("displayFecha"),
    selectSanto: document.getElementById("selectSanto"),
    inputCapitulo: document.getElementById("inputCapitulo"),
    inputVersiculos: document.getElementById("inputVersiculos"),
    inputTexto: document.getElementById("inputTexto"),
    inputLogo: document.getElementById("inputLogo"),
    btnQuitarLogo: document.getElementById("btnQuitarLogo"),
    btnPreview: document.getElementById("btnPreview"),
    btnDescargar: document.getElementById("btnDescargar"),

    stepPreview: document.getElementById("stepPreview"),
    canvas: document.getElementById("storyCanvas"),

    historyList: document.getElementById("historyList"),
  };

  const ctx = el.canvas.getContext("2d");

  // Estado interno de la app (fecha elegida, logo cargado, etc.)
  const state = {
    isoDate: todayIso(),
    logoDataUrl: null,
  };

  // -------------------------------------------------------------
  // 1) UTILIDADES DE FECHA
  // -------------------------------------------------------------

  // Devuelve la fecha local de hoy en formato AAAA-MM-DD (sin usar UTC,
  // para que nunca se desfase un día según la zona horaria del usuario).
  function todayIso() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  // Convierte "2026-09-06" en "domingo 6 de septiembre de 2026"
  function formatFechaLarga(isoDate) {
    const [y, m, d] = isoDate.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    const texto = new Intl.DateTimeFormat("es-AR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date);
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }

  function formatFechaCorta(isoDate) {
    const [y, m, d] = isoDate.split("-");
    return `${d}/${m}/${y}`;
  }

  // -------------------------------------------------------------
  // 2) MENSAJES AL USUARIO (nunca errores técnicos crudos)
  // -------------------------------------------------------------
  function showBanner(message, type = "info") {
    el.banner.textContent = message;
    el.banner.className = `banner ${type}`;
    el.banner.classList.remove("hidden");
  }
  function hideBanner() {
    el.banner.classList.add("hidden");
  }

  // -------------------------------------------------------------
  // 3) OBTENER LA REFERENCIA DEL EVANGELIO (API AELF)
  // -------------------------------------------------------------
  //
  // API usada: AELF (https://api.aelf.org) — Asociación para la
  // Edición Litúrgica Francófona. Es gratuita, no requiere API key
  // y no tiene límite de uso conocido para volumen normal.
  //
  // Devuelve las lecturas litúrgicas del día (universales, válidas
  // para toda la Iglesia católica), pero el TEXTO viene en francés.
  // Por eso esta app usa la API solo para obtener automáticamente
  // la REFERENCIA real (libro, capítulo, versículos) — nunca el
  // texto — y te pide pegar el texto en español vos mismo. Así
  // nunca se inventa ni se traduce mal una cita bíblica.
  //
  // Si la API no responde (sin internet, caída, cambio de formato),
  // la app pasa automáticamente al modo manual con un aviso claro.

  const AELF_URL = (isoDate) => `https://api.aelf.org/v1/messes/${isoDate}/romain`;

  // Mapa de abreviaturas francesas de libros a nombres en español
  const LIBRO_FR_A_ES = {
    Mt: "Mateo",
    Mc: "Marcos",
    Lc: "Lucas",
    Jn: "Juan",
  };

  async function obtenerReferenciaAutomatica(isoDate) {
    if (!navigator.onLine) {
      throw new Error("SIN_CONEXION");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    let response;
    try {
      response = await fetch(AELF_URL(isoDate), { signal: controller.signal });
    } catch (err) {
      throw new Error("FALLO_RED");
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      throw new Error("API_ERROR");
    }

    let data;
    try {
      data = await response.json();
    } catch (err) {
      throw new Error("RESPUESTA_INVALIDA");
    }

    const misas = data && data.messes;
    if (!Array.isArray(misas) || misas.length === 0) {
      throw new Error("EVANGELIO_NO_ENCONTRADO");
    }

    let lecturaEvangelio = null;
    for (const misa of misas) {
      if (!Array.isArray(misa.lectures)) continue;
      const encontrada = misa.lectures.find((l) => l.type === "evangile");
      if (encontrada) {
        lecturaEvangelio = encontrada;
        break;
      }
    }

    if (!lecturaEvangelio || !lecturaEvangelio.reference) {
      throw new Error("EVANGELIO_NO_ENCONTRADO");
    }

    // La referencia viene como "Lc 14, 25-33"
    const partes = lecturaEvangelio.reference.trim().split(" ");
    const abreviatura = partes[0];
    const restoDeReferencia = partes.slice(1).join(" "); // "14, 25-33"

    const libroEs = LIBRO_FR_A_ES[abreviatura] || null;

    // "14, 25-33" -> capítulo "14", versículos "25-33"
    let capitulo = "";
    let versiculos = "";
    const match = restoDeReferencia.match(/^(\d+)\s*,\s*(.+)$/);
    if (match) {
      capitulo = match[1];
      versiculos = match[2];
    } else {
      versiculos = restoDeReferencia;
    }

    return {
      libro: libroEs, // puede ser null si no es uno de los 4 evangelios
      capitulo,
      versiculos,
    };
  }

  // -------------------------------------------------------------
  // 4) FLUJO PRINCIPAL: BOTÓN "GENERAR EVANGELIO DE HOY"
  // -------------------------------------------------------------

  el.btnGenerar.addEventListener("click", async () => {
    hideBanner();
    state.isoDate = el.inputFecha.value || todayIso();
    await generarConFuenteAutomatica(state.isoDate);
  });

  el.btnManual.addEventListener("click", () => {
    hideBanner();
    state.isoDate = el.inputFecha.value || todayIso();
    abrirFormularioDatos({ libro: null, capitulo: "", versiculos: "", texto: "" });
    showBanner(
      "Modo manual: completá vos los datos del Evangelio y generá la imagen.",
      "info"
    );
  });

  el.btnToggleAvanzado.addEventListener("click", () => {
    el.panelAvanzado.classList.toggle("hidden");
  });

  // Precarga el selector de fecha con la fecha de hoy
  el.inputFecha.value = todayIso();

  async function generarConFuenteAutomatica(isoDate) {
    setCargando(true);
    try {
      const ref = await obtenerReferenciaAutomatica(isoDate);

      if (!ref.libro) {
        // Es una lectura evangélica pero de un libro que no mapeamos
        // (muy poco común). Igual mostramos capítulo/versículos reales.
        showBanner(
          "Se obtuvo la referencia del día, pero no pudimos identificar el libro automáticamente. Revisalo antes de continuar.",
          "warning"
        );
      } else {
        showBanner(
          "Referencia obtenida automáticamente ✅. Ahora pegá el texto del Evangelio en español para continuar.",
          "info"
        );
      }

      abrirFormularioDatos({
        libro: ref.libro || "Otro",
        capitulo: ref.capitulo,
        versiculos: ref.versiculos,
        texto: "",
      });
    } catch (err) {
      const mensaje = mensajeAmigablePorError(err);
      showBanner(mensaje, "warning");
      abrirFormularioDatos({ libro: null, capitulo: "", versiculos: "", texto: "" });
    } finally {
      setCargando(false);
    }
  }

  function mensajeAmigablePorError(err) {
    switch (err.message) {
      case "SIN_CONEXION":
        return "No hay conexión a Internet. Podés cargar el Evangelio manualmente.";
      case "FALLO_RED":
        return "No pudimos conectarnos al servicio de referencias bíblicas. Podés cargar el Evangelio manualmente.";
      case "API_ERROR":
        return "El servicio de referencias bíblicas no respondió correctamente. Podés cargar el Evangelio manualmente.";
      case "RESPUESTA_INVALIDA":
        return "Recibimos una respuesta que no pudimos entender. Podés cargar el Evangelio manualmente.";
      case "EVANGELIO_NO_ENCONTRADO":
        return "No encontramos automáticamente el Evangelio de esa fecha. Podés cargar el Evangelio manualmente.";
      default:
        return "Ocurrió un problema al buscar el Evangelio automáticamente. Podés cargar el Evangelio manualmente.";
    }
  }

  function setCargando(cargando) {
    el.btnGenerar.disabled = cargando;
    el.btnGenerar.textContent = cargando
      ? "Buscando Evangelio del día..."
      : "GENERAR EVANGELIO DE HOY";
  }

  // -------------------------------------------------------------
  // 5) FORMULARIO DE DATOS (paso 2)
  // -------------------------------------------------------------

  function abrirFormularioDatos({ libro, capitulo, versiculos, texto }) {
    el.displayFecha.textContent = formatFechaLarga(state.isoDate);

    if (libro && ["Mateo", "Marcos", "Lucas", "Juan"].includes(libro)) {
      el.selectSanto.value = libro;
    } else {
      el.selectSanto.value = "Otro";
    }
    el.inputCapitulo.value = capitulo || "";
    el.inputVersiculos.value = versiculos || "";
    el.inputTexto.value = texto || "";

    el.stepData.classList.remove("hidden");
    el.stepPreview.classList.add("hidden");
    el.btnDescargar.disabled = true;

    el.stepData.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // -------------------------------------------------------------
  // 6) LOGO: carga con onload/onerror y persistencia en localStorage
  // -------------------------------------------------------------

  const LOGO_STORAGE_KEY = "evangelio_logo_dataurl";

  // Al iniciar, si había un logo guardado, lo recuperamos
  try {
    const guardado = localStorage.getItem(LOGO_STORAGE_KEY);
    if (guardado) state.logoDataUrl = guardado;
  } catch (e) {
    // localStorage puede fallar en navegadores en modo privado; no rompemos la app
  }

  el.inputLogo.addEventListener("change", (evt) => {
    const file = evt.target.files && evt.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showBanner("El archivo elegido no es una imagen. Se usará el diseño alternativo.", "warning");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      state.logoDataUrl = reader.result;
      try {
        localStorage.setItem(LOGO_STORAGE_KEY, reader.result);
      } catch (e) {
        // si no entra en localStorage, seguimos igual solo en memoria
      }
      showBanner("Logo cargado correctamente.", "info");
    };
    reader.onerror = () => {
      state.logoDataUrl = null;
      showBanner(
        "No pudimos leer esa imagen. Se utilizará automáticamente el diseño alternativo.",
        "warning"
      );
    };
    reader.readAsDataURL(file);
  });

  el.btnQuitarLogo.addEventListener("click", () => {
    state.logoDataUrl = null;
    el.inputLogo.value = "";
    try {
      localStorage.removeItem(LOGO_STORAGE_KEY);
    } catch (e) {}
    showBanner("Logo quitado. Se usará el diseño alternativo con una cruz.", "info");
  });

  // Carga una imagen de forma segura: nunca deja la promesa "colgada"
  // ni ejecuta drawImage sobre una imagen rota.
  function cargarImagenSegura(src) {
    return new Promise((resolve) => {
      if (!src) {
        resolve(null);
        return;
      }
      const img = new Image();
      img.onload = () => {
        if (img.complete && img.naturalWidth > 0) {
          resolve(img);
        } else {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  // -------------------------------------------------------------
  // 7) TEXTO: wrapping y ajuste automático de tamaño
  // -------------------------------------------------------------

  // Parte el texto en líneas que entran en maxWidth, sin cortar palabras.
  function armarLineas(ctx, texto, maxWidth) {
    const palabras = texto.split(/\s+/).filter(Boolean);
    const lineas = [];
    let lineaActual = "";

    for (const palabra of palabras) {
      const intento = lineaActual ? `${lineaActual} ${palabra}` : palabra;
      if (ctx.measureText(intento).width <= maxWidth) {
        lineaActual = intento;
      } else {
        if (lineaActual) lineas.push(lineaActual);
        lineaActual = palabra;
      }
    }
    if (lineaActual) lineas.push(lineaActual);
    return lineas;
  }

  // Prueba tamaños de fuente decrecientes hasta que el texto entre
  // en el ancho y alto disponibles. Nunca corta palabras.
  function ajustarTextoAlEspacio(ctx, texto, maxWidth, maxHeight, opts) {
    const { fontMax, fontMin, lineHeightRatio, fontFamily } = opts;

    for (let size = fontMax; size >= fontMin; size -= 1) {
      ctx.font = `${size}px ${fontFamily}`;
      const lineas = armarLineas(ctx, texto, maxWidth);
      const alturaTotal = lineas.length * size * lineHeightRatio;
      if (alturaTotal <= maxHeight) {
        return { fontSize: size, lineas, cabe: true };
      }
    }

    // Ni siquiera con el tamaño mínimo entra: devolvemos igual el
    // resultado al tamaño mínimo, marcado como "no cabe", para que
    // la app avise al usuario sin cortar ni inventar nada.
    ctx.font = `${fontMin}px ${fontFamily}`;
    const lineas = armarLineas(ctx, texto, maxWidth);
    return { fontSize: fontMin, lineas, cabe: false };
  }

  // -------------------------------------------------------------
  // 8) DIBUJO DEL CANVAS COMPLETO
  // -------------------------------------------------------------

  function extraerFuente(fontString) {
    // "700 normal 'Georgia', serif" -> { weight:"700", style:"normal", family:"'Georgia', serif" }
    const partes = fontString.trim().split(/\s+/);
    const weight = partes[0];
    const style = partes[1];
    const family = partes.slice(2).join(" ");
    return { weight, style, family };
  }

  function fontCss(fontConfig, size) {
    const { weight, style, family } = extraerFuente(fontConfig);
    const styleFinal = style === "italic" ? "italic " : "";
    return `${styleFinal}${weight} ${size}px ${family}`;
  }

  async function dibujarHistoria(datos) {
    const W = CONFIG.canvas.width;
    const H = CONFIG.canvas.height;
    const C = CONFIG.colors;
    const L = CONFIG.layout;

    ctx.clearRect(0, 0, W, H);

    // ---- FONDO (siempre generado por canvas, nunca imágenes externas) ----
    const gradiente = ctx.createLinearGradient(0, 0, 0, H);
    gradiente.addColorStop(0, C.backgroundTop);
    gradiente.addColorStop(1, C.backgroundBottom);
    ctx.fillStyle = gradiente;
    ctx.fillRect(0, 0, W, H);

    // Viñeta suave en los bordes
    const vign = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.75);
    vign.addColorStop(0, "rgba(0,0,0,0)");
    vign.addColorStop(1, "rgba(0,0,0,0.06)");
    ctx.fillStyle = vign;
    ctx.fillRect(0, 0, W, H);

    let cursorY = 120;

    // ---- LOGO O CRUZ DECORATIVA ----
    const logoImg = await cargarImagenSegura(state.logoDataUrl);
    const logoSize = 110;
    const logoCenterX = W / 2;
    const logoCenterY = cursorY;

    if (logoImg) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(logoCenterX, logoCenterY, logoSize / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(
        logoImg,
        logoCenterX - logoSize / 2,
        logoCenterY - logoSize / 2,
        logoSize,
        logoSize
      );
      ctx.restore();
    } else {
      dibujarCruzDecorativa(ctx, logoCenterX, logoCenterY, logoSize * 0.4, C.accentDark);
    }

    cursorY += logoSize / 2 + 40;

    // ---- NOMBRE DE LA IGLESIA ----
    ctx.fillStyle = C.textDark;
    ctx.font = fontCss(CONFIG.fonts.reference, 34);
    ctx.textAlign = "center";
    ctx.fillText(CONFIG.churchName.toUpperCase(), W / 2, cursorY);
    cursorY += 60;

    // ---- SEPARADOR CON CRUZ PEQUEÑA ----
    dibujarSeparadorCruz(ctx, W / 2, cursorY, C.accentDark);
    cursorY += 90;

    // ---- TÍTULO "EVANGELIO" ----
    ctx.fillStyle = C.textDark;
    ctx.font = fontCss(CONFIG.fonts.titleCaps, L.titleFontSize);
    ctx.textAlign = "center";
    dibujarTextoConEspaciado(ctx, CONFIG.headerTitleLine1, W / 2, cursorY, 6);
    cursorY += L.titleFontSize + 20;

    // ---- SUBTÍTULO "del día" (script) ----
    ctx.fillStyle = C.accentDark;
    ctx.font = fontCss(CONFIG.fonts.scriptTitle, L.scriptFontSize);
    ctx.fillText(CONFIG.headerTitleLine2, W / 2, cursorY);
    cursorY += L.scriptFontSize + 50;

    // ---- BARRA DE REFERENCIA ("Lucas 14, 25-33") ----
    const referenciaTexto = armarTextoReferencia(datos);
    const barW = W - L.marginX * 2;
    const barH = 96;
    const barY = cursorY;
    dibujarBarraReferencia(ctx, L.marginX, barY, barW, barH, C.accent);

    ctx.fillStyle = "#2b2620";
    ctx.font = fontCss(CONFIG.fonts.reference, L.referenceFontSize);
    ctx.textAlign = "center";
    ctx.fillText(referenciaTexto, W / 2, barY + barH / 2 + L.referenceFontSize * 0.35);

    cursorY = barY + barH + 30;

    // ---- MARCO CON EL TEXTO DEL EVANGELIO ----
    const frameTop = cursorY;
    const frameBottom = H - L.frameMarginBottom;
    const frameHeight = frameBottom - frameTop;
    const frameWidth = W - L.marginX * 2;

    dibujarMarco(ctx, L.marginX, frameTop, frameWidth, frameHeight, C.frameBorder);

    const textMaxWidth = frameWidth - L.framePadding * 2;
    const textMaxHeight = frameHeight - L.framePadding * 2;

    const { family } = extraerFuente(CONFIG.fonts.body);
    const resultado = ajustarTextoAlEspacio(ctx, datos.texto, textMaxWidth, textMaxHeight, {
      fontMax: L.bodyFontMax,
      fontMin: L.bodyFontMin,
      lineHeightRatio: L.lineHeightRatio,
      fontFamily: family,
    });

    ctx.fillStyle = C.textDark;
    ctx.textAlign = "left";
    ctx.font = `${resultado.fontSize}px ${family}`;
    const lineHeight = resultado.fontSize * L.lineHeightRatio;
    let textY = frameTop + L.framePadding + resultado.fontSize;
    for (const linea of resultado.lineas) {
      ctx.fillText(linea, L.marginX + L.framePadding, textY);
      textY += lineHeight;
    }

    // ---- FRASE FINAL ----
    ctx.fillStyle = C.accentDark;
    ctx.font = fontCss(CONFIG.fonts.reference, 32);
    ctx.textAlign = "center";
    ctx.fillText(CONFIG.finalPhrase, W / 2, frameBottom + 60);

    // ---- ETIQUETA DECORATIVA INFERIOR ----
    dibujarEtiquetaInferior(ctx, W, H, CONFIG.bottomTag, C.tagText);

    return resultado.cabe;
  }

  function armarTextoReferencia(datos) {
    const libro = datos.libro && datos.libro !== "Otro" ? datos.libro : (datos.libroLibre || "");
    const cap = datos.capitulo ? `${datos.capitulo}` : "";
    const vers = datos.versiculos ? `, ${datos.versiculos}` : "";
    return `${libro} ${cap}${vers}`.trim();
  }

  function dibujarCruzDecorativa(ctx, cx, cy, size, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = size * 0.16;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(cx, cy - size);
    ctx.lineTo(cx, cy + size * 0.7);
    ctx.moveTo(cx - size * 0.6, cy - size * 0.25);
    ctx.lineTo(cx + size * 0.6, cy - size * 0.25);
    ctx.stroke();
    ctx.restore();
  }

  function dibujarSeparadorCruz(ctx, cx, cy, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    // líneas a los costados
    ctx.beginPath();
    ctx.moveTo(cx - 230, cy);
    ctx.lineTo(cx - 60, cy);
    ctx.moveTo(cx + 60, cy);
    ctx.lineTo(cx + 230, cy);
    ctx.stroke();
    // cruz pequeña al centro
    dibujarCruzDecorativa(ctx, cx, cy - 5, 26, color);
    ctx.restore();
  }

  function dibujarTextoConEspaciado(ctx, texto, cx, y, espaciado) {
    // Simula letter-spacing dibujando letra por letra centrado
    const letras = texto.split("");
    const anchos = letras.map((l) => ctx.measureText(l).width + espaciado);
    const anchoTotal = anchos.reduce((a, b) => a + b, 0) - espaciado;
    let x = cx - anchoTotal / 2;
    const prevAlign = ctx.textAlign;
    ctx.textAlign = "left";
    letras.forEach((letra, i) => {
      ctx.fillText(letra, x, y);
      x += anchos[i];
    });
    ctx.textAlign = prevAlign;
  }

  function dibujarBarraReferencia(ctx, x, y, w, h, color) {
    ctx.save();
    ctx.fillStyle = color;
    const r = 10;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function dibujarMarco(ctx, x, y, w, h, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    const r = 18;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  function dibujarEtiquetaInferior(ctx, W, H, texto, color) {
    ctx.save();
    ctx.translate(W - 210, H - 190);
    ctx.rotate(-0.04);
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.font = fontCss(CONFIG.fonts.tag, 40);
    const lineas = texto.split("\n");
    lineas.forEach((linea, i) => {
      ctx.fillText(linea, 0, i * 44);
    });
    // línea decorativa debajo
    const anchoLinea = 140;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-anchoLinea / 2, lineas.length * 44 + 6);
    ctx.lineTo(anchoLinea / 2, lineas.length * 44 + 6);
    ctx.stroke();
    ctx.restore();
  }

  // -------------------------------------------------------------
  // 9) LEER FORMULARIO Y ARMAR OBJETO "datos"
  // -------------------------------------------------------------

  function leerDatosFormulario() {
    const libroSel = el.selectSanto.value;
    return {
      libro: libroSel,
      libroLibre: libroSel === "Otro" ? "" : libroSel,
      capitulo: el.inputCapitulo.value.trim(),
      versiculos: el.inputVersiculos.value.trim(),
      texto: el.inputTexto.value.trim(),
    };
  }

  function validarDatos(datos) {
    if (!datos.texto) {
      return "Falta pegar el texto del Evangelio. La app nunca inventa una cita bíblica.";
    }
    if (!datos.versiculos && !datos.capitulo) {
      return "Falta indicar al menos el capítulo o los versículos.";
    }
    return null;
  }

  // -------------------------------------------------------------
  // 10) BOTONES PREVISUALIZAR Y DESCARGAR
  // -------------------------------------------------------------

  el.btnPreview.addEventListener("click", async () => {
    const datos = leerDatosFormulario();
    const errorValidacion = validarDatos(datos);
    if (errorValidacion) {
      showBanner(errorValidacion, "warning");
      return;
    }

    try {
      const cabeBien = await dibujarHistoria(datos);
      el.stepPreview.classList.remove("hidden");
      el.btnDescargar.disabled = false;
      el.stepPreview.scrollIntoView({ behavior: "smooth", block: "start" });

      if (!cabeBien) {
        showBanner(
          "Evangelio extenso — el texto es muy largo y quedó con letra muy chica. Podés usar una versión resumida del texto para que se lea mejor.",
          "warning"
        );
      } else {
        hideBanner();
      }
    } catch (err) {
      showBanner(
        "No pudimos generar la vista previa. Se utilizará automáticamente el diseño alternativo; probá de nuevo.",
        "error"
      );
    }
  });

  el.btnDescargar.addEventListener("click", () => {
    try {
      el.canvas.toBlob((blob) => {
        if (!blob) {
          showBanner("No pudimos generar el archivo PNG. Probá de nuevo.", "error");
          return;
        }
        const datos = leerDatosFormulario();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `evangelio-${state.isoDate}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        guardarEnHistorial(datos);
      }, "image/png");
    } catch (err) {
      showBanner("No pudimos descargar la imagen. Probá de nuevo.", "error");
    }
  });

  // -------------------------------------------------------------
  // 11) HISTORIAL (localStorage)
  // -------------------------------------------------------------

  const HISTORY_KEY = "evangelio_historial";
  const HISTORY_MAX = 20;

  function leerHistorial() {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function guardarEnHistorial(datos) {
    const historial = leerHistorial();
    const referencia = armarTextoReferencia(datos);
    historial.unshift({
      fecha: state.isoDate,
      referencia,
    });
    const recortado = historial.slice(0, HISTORY_MAX);
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(recortado));
    } catch (e) {}
    renderizarHistorial();
  }

  function renderizarHistorial() {
    const historial = leerHistorial();
    el.historyList.innerHTML = "";

    if (historial.length === 0) {
      const li = document.createElement("li");
      li.className = "history-empty";
      li.textContent = "Todavía no generaste ningún Evangelio.";
      el.historyList.appendChild(li);
      return;
    }

    for (const item of historial) {
      const li = document.createElement("li");
      li.textContent = `${formatFechaCorta(item.fecha)} — ${item.referencia}`;
      el.historyList.appendChild(li);
    }
  }

  // -------------------------------------------------------------
  // 12) INICIO
  // -------------------------------------------------------------
  renderizarHistorial();

})();
