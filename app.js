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
    campoOtroSanto: document.getElementById("campoOtroSanto"),
    inputOtroSanto: document.getElementById("inputOtroSanto"),
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
  // 3) OBTENER EL EVANGELIO AUTOMÁTICAMENTE — CADENA DE 3 NIVELES
  // -------------------------------------------------------------
  //
  // NIVEL 1 — TEXTO COMPLETO EN ESPAÑOL (automático, sin pegar nada)
  //   API: "Evangelium" (https://evangelium.manuelsanchez.dev), un
  //   servicio gratuito y sin clave que expone en JSON los datos de
  //   Evangelizo.org (fuente católica multilingüe) para varios
  //   idiomas, incluido español. Devuelve referencia Y texto.
  //   ⚠️ Es un proyecto independiente (no oficial de la Iglesia), así
  //   que puede estar caído en algún momento. Por eso nunca es la
  //   única fuente: si falla, se pasa sola al Nivel 2.
  //
  // NIVEL 2 — SOLO REFERENCIA REAL (respaldo si falla el Nivel 1)
  //   API: AELF (https://api.aelf.org), oficial de la Asociación
  //   Episcopal Litúrgica Francófona. Gratuita, sin clave, muy
  //   estable. Da la referencia bíblica real (libro/capítulo/
  //   versículos) pero el texto viene en francés, así que en este
  //   nivel solo se usa la referencia y se pide pegar el texto.
  //
  // NIVEL 3 — MODO MANUAL (si fallan los dos anteriores, o sin
  //   Internet): el usuario completa todo. La app NUNCA inventa una
  //   cita ni un texto bíblico en ningún nivel.

  const EVANGELIUM_URL = (isoDate) => `https://evangelium.manuelsanchez.dev/api/es/days/${isoDate}`;
  // "romain" NO es una zona válida de AELF (fue un error de esta app).
  // Las zonas válidas son países reales; "france" sigue el calendario
  // romano universal en los días de semana, así que la lectura del
  // Evangelio es la misma que en cualquier país de rito latino.
  const AELF_URL = (isoDate) => `https://api.aelf.org/v1/messes/${isoDate}/france`;

  // Mapa de abreviaturas francesas de libros a nombres en español (Nivel 2)
  const LIBRO_FR_A_ES = { Mt: "Mateo", Mc: "Marcos", Lc: "Lucas", Jn: "Juan" };

  const LIBROS_VALIDOS = ["Mateo", "Marcos", "Lucas", "Juan"];

  // Quita etiquetas HTML y decodifica entidades (&amp;, &nbsp;, etc.)
  // de forma segura, sin ejecutar ningún script embebido.
  function limpiarTextoPlano(html) {
    if (!html) return "";
    const sinEtiquetas = String(html).replace(/<[^>]*>/g, " ");
    const textarea = document.createElement("textarea");
    textarea.innerHTML = sinEtiquetas;
    return textarea.value.replace(/\s+/g, " ").replace(/\s*\n\s*/g, "\n").trim();
  }

  // Quita acentos para comparar nombres de libros sin importar tildes
  function sinAcentos(s) {
    return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  }

  // Intenta separar una referencia en español libre, ej:
  // "Lucas 14, 25-33" o "San Juan 3,16" -> { libro, capitulo, versiculos }
  function parsearReferenciaLibre(referencia) {
    const limpia = (referencia || "").replace(/^Según\s+/i, "").replace(/^San\s+/i, "").trim();
    const match = limpia.match(/^([A-Za-zÀ-ÿ]+)\.?\s+(\d+)\s*[,.:]?\s*(.+)$/);
    if (!match) {
      return { libro: null, libroLibre: limpia, capitulo: "", versiculos: "" };
    }
    const [, nombreLibro, capitulo, versiculos] = match;
    const encontrado = LIBROS_VALIDOS.find((l) => sinAcentos(l) === sinAcentos(nombreLibro));
    return {
      libro: encontrado || null,
      libroLibre: encontrado || nombreLibro,
      capitulo,
      versiculos: versiculos.trim(),
    };
  }

  async function fetchConTimeout(url, ms = 8000) {
    if (!navigator.onLine) throw new Error("SIN_CONEXION");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), ms);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error("API_ERROR");
      return response;
    } catch (err) {
      if (err.message === "API_ERROR") throw err;
      throw new Error("FALLO_RED");
    } finally {
      clearTimeout(timeout);
    }
  }

  // NIVEL 1: texto completo en español
  async function obtenerEvangelioCompletoAutomatico(isoDate) {
    const response = await fetchConTimeout(EVANGELIUM_URL(isoDate));

    let data;
    try {
      data = await response.json();
    } catch (err) {
      throw new Error("RESPUESTA_INVALIDA");
    }

    const gospel = data && data.gospel;
    console.debug("[Evangelio] Respuesta cruda de Evangelium:", data);
    const textoLimpio = limpiarTextoPlano(gospel && gospel.text);

    // Validación estricta: si no vino texto real y suficientemente
    // largo, o si la fecha devuelta no coincide con la pedida (señal
    // de datos viejos en caché), lo tratamos como fallo y pasamos al
    // Nivel 2 — nunca mostramos un texto vacío o sospechoso como si
    // fuera el Evangelio real.
    if (!gospel || textoLimpio.length < 20) {
      throw new Error("EVANGELIO_NO_ENCONTRADO");
    }
    if (data.date && data.date !== isoDate) {
      throw new Error("FECHA_NO_COINCIDE");
    }

    const ref = parsearReferenciaLibre(limpiarTextoPlano(gospel.reference_displayed || gospel.title || ""));

    return {
      libro: ref.libro,
      libroLibre: ref.libroLibre,
      capitulo: ref.capitulo,
      versiculos: ref.versiculos,
      texto: textoLimpio,
    };
  }

  // NIVEL 2: solo referencia real (AELF)
  async function obtenerReferenciaAutomatica(isoDate) {
    const response = await fetchConTimeout(AELF_URL(isoDate));

    let data;
    try {
      data = await response.json();
    } catch (err) {
      throw new Error("RESPUESTA_INVALIDA");
    }

    // Aceptamos tanto { messes: [...] } como un array directo en la
    // raíz, por si la API cambia de forma con el tiempo.
    const misas = Array.isArray(data) ? data : data && data.messes;
    console.debug("[Evangelio] Respuesta cruda de AELF:", data);
    if (!Array.isArray(misas) || misas.length === 0) {
      throw new Error("EVANGELIO_NO_ENCONTRADO");
    }

    let lecturaEvangelio = null;
    for (const misa of misas) {
      if (!Array.isArray(misa.lectures)) continue;

      // 1) Buscamos por tipo "evangile" (sin importar mayúsculas/acentos)
      let encontrada = misa.lectures.find(
        (l) => l.type && sinAcentos(String(l.type)).includes("evangile")
      );

      // 2) Si no hay coincidencia por tipo, el Evangelio suele ser la
      // última lectura de la misa: lo usamos como último recurso antes
      // de rendirnos, para tolerar pequeños cambios de formato de la API.
      if (!encontrada && misa.lectures.length > 0) {
        const ultima = misa.lectures[misa.lectures.length - 1];
        if (ultima && ultima.reference) encontrada = ultima;
      }

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

    let capitulo = "";
    let versiculos = "";
    const match = restoDeReferencia.match(/^(\d+)\s*,\s*(.+)$/);
    if (match) {
      capitulo = match[1];
      versiculos = match[2];
    } else {
      versiculos = restoDeReferencia;
    }

    return { libro: libroEs, libroLibre: libroEs, capitulo, versiculos, texto: "" };
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

  // Muestra/oculta el campo de texto libre según si el santo elegido es "Otro"
  el.selectSanto.addEventListener("change", () => {
    el.campoOtroSanto.classList.toggle("hidden", el.selectSanto.value !== "Otro");
  });

  async function generarConFuenteAutomatica(isoDate) {
    setCargando(true);

    // ---- NIVEL 1: intentamos el texto completo en español ----
    try {
      const completo = await obtenerEvangelioCompletoAutomatico(isoDate);
      console.info("[Evangelio] Nivel 1 (Evangelium) OK:", completo);
      showBanner(
        "✅ Evangelio de hoy obtenido automáticamente (referencia y texto). Revisalo y generá tu imagen — no hace falta que busques ni pegues nada.",
        "info"
      );
      abrirFormularioDatos({
        libro: completo.libro || "Otro",
        libroLibre: completo.libroLibre,
        capitulo: completo.capitulo,
        versiculos: completo.versiculos,
        texto: completo.texto,
      });
      setCargando(false);
      return;
    } catch (errNivel1) {
      // Se registra en la consola para diagnóstico, pero no se muestra
      // todavía ningún error al usuario: seguimos al Nivel 2.
      console.warn("[Evangelio] Nivel 1 (Evangelium) falló:", errNivel1.message, errNivel1);
    }

    // ---- NIVEL 2: solo la referencia real, hay que pegar el texto ----
    try {
      const ref = await obtenerReferenciaAutomatica(isoDate);
      console.info("[Evangelio] Nivel 2 (AELF) OK:", ref);
      showBanner(
        "Pudimos obtener la referencia real del día, pero no el texto completo automáticamente esta vez. Pegá el texto en español para continuar.",
        "warning"
      );
      abrirFormularioDatos({
        libro: ref.libro || "Otro",
        libroLibre: ref.libroLibre,
        capitulo: ref.capitulo,
        versiculos: ref.versiculos,
        texto: "",
      });
    } catch (errNivel2) {
      console.warn("[Evangelio] Nivel 2 (AELF) falló:", errNivel2.message, errNivel2);
      // ---- NIVEL 3: modo manual completo ----
      const mensaje = mensajeAmigablePorError(errNivel2);
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
        return "No pudimos conectarnos a los servicios que buscan el Evangelio. Podés cargar el Evangelio manualmente.";
      case "API_ERROR":
        return "El servicio de referencias bíblicas no respondió correctamente. Podés cargar el Evangelio manualmente.";
      case "RESPUESTA_INVALIDA":
        return "Recibimos una respuesta que no pudimos entender. Podés cargar el Evangelio manualmente.";
      case "EVANGELIO_NO_ENCONTRADO":
        return "No encontramos automáticamente el Evangelio de esa fecha. Podés cargar el Evangelio manualmente.";
      case "FECHA_NO_COINCIDE":
        return "La fuente automática devolvió datos de otra fecha. Por seguridad, no los usamos. Podés cargar el Evangelio manualmente.";
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

  function abrirFormularioDatos({ libro, libroLibre, capitulo, versiculos, texto }) {
    el.displayFecha.textContent = formatFechaLarga(state.isoDate);

    if (libro && LIBROS_VALIDOS.includes(libro)) {
      el.selectSanto.value = libro;
      el.campoOtroSanto.classList.add("hidden");
      el.inputOtroSanto.value = "";
    } else {
      el.selectSanto.value = "Otro";
      el.campoOtroSanto.classList.remove("hidden");
      el.inputOtroSanto.value = libroLibre || "";
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

  // Tamaño máximo (en px) al que se reduce cualquier logo cargado, para
  // que entre sin problemas en localStorage y no ralentice el dibujo.
  const LOGO_MAX_DIMENSION = 400;

  // Redibuja la imagen cargada en un canvas más chico y devuelve un
  // dataURL liviano. Si algo falla en el camino, devuelve null (nunca
  // lanza un error hacia afuera) para que el llamador use el fallback.
  function comprimirLogo(imgOriginal) {
    try {
      const escala = Math.min(
        1,
        LOGO_MAX_DIMENSION / Math.max(imgOriginal.naturalWidth, imgOriginal.naturalHeight)
      );
      const w = Math.max(1, Math.round(imgOriginal.naturalWidth * escala));
      const h = Math.max(1, Math.round(imgOriginal.naturalHeight * escala));
      const tmp = document.createElement("canvas");
      tmp.width = w;
      tmp.height = h;
      const tmpCtx = tmp.getContext("2d");
      tmpCtx.drawImage(imgOriginal, 0, 0, w, h);
      return tmp.toDataURL("image/png");
    } catch (e) {
      return null;
    }
  }

  el.inputLogo.addEventListener("change", (evt) => {
    const file = evt.target.files && evt.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showBanner("El archivo elegido no es una imagen. Se usará el diseño alternativo.", "warning");
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      // Antes de aceptar el archivo como logo, lo cargamos como imagen
      // real y verificamos que no esté "rota" (mismo control robusto
      // que se usa al dibujar en el canvas).
      const imgValidada = await cargarImagenSegura(reader.result);
      if (!imgValidada) {
        state.logoDataUrl = null;
        showBanner(
          "No pudimos leer esa imagen (parece estar dañada). Se utilizará automáticamente el diseño alternativo.",
          "warning"
        );
        return;
      }

      const comprimido = comprimirLogo(imgValidada) || reader.result;
      state.logoDataUrl = comprimido;

      try {
        localStorage.setItem(LOGO_STORAGE_KEY, comprimido);
        showBanner("Logo cargado correctamente.", "info");
      } catch (e) {
        // El logo igual se usa en esta sesión (queda en memoria);
        // solo avisamos que no se pudo guardar para la próxima vez.
        showBanner(
          "El logo se usará ahora, pero es muy pesado para guardarlo para la próxima vez. Probá con una imagen más chica si querés que se recuerde.",
          "warning"
        );
      }
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

    // El texto se dibuja siempre "clippeado" al rectángulo del marco:
    // aunque el Evangelio sea demasiado largo incluso al tamaño mínimo
    // de fuente, nunca se va a dibujar por fuera del marco ni a pisar
    // la frase final o la etiqueta inferior (requisito: "nunca superponer
    // elementos"). El aviso al usuario ya se muestra aparte (ver "cabe").
    ctx.save();
    ctx.beginPath();
    ctx.rect(L.marginX, frameTop, frameWidth, frameHeight);
    ctx.clip();

    ctx.fillStyle = C.textDark;
    ctx.textAlign = "left";
    ctx.font = `${resultado.fontSize}px ${family}`;
    const lineHeight = resultado.fontSize * L.lineHeightRatio;
    let textY = frameTop + L.framePadding + resultado.fontSize;
    for (const linea of resultado.lineas) {
      ctx.fillText(linea, L.marginX + L.framePadding, textY);
      textY += lineHeight;
    }
    ctx.restore();

    // ---- FRASE FINAL ----
    // Se ubica a una distancia fija del pie del lienzo (no del marco)
    // para que nunca choque con la etiqueta decorativa inferior, sin
    // importar cuánto haya crecido o encogido el marco de texto.
    const finalPhraseY = H - 210;
    ctx.fillStyle = C.accentDark;
    ctx.font = fontCss(CONFIG.fonts.reference, 32);
    ctx.textAlign = "center";
    ctx.fillText(CONFIG.finalPhrase, W / 2, finalPhraseY);

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
    ctx.translate(W - 210, H - 110);
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
      libroLibre: libroSel === "Otro" ? el.inputOtroSanto.value.trim() : libroSel,
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
    if (datos.libro === "Otro" && !datos.libroLibre) {
      return "Elegiste 'Otro' — completá el nombre del libro bíblico.";
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
  // 12) RED DE SEGURIDAD GLOBAL
  // -------------------------------------------------------------
  // Si algo inesperado falla en cualquier parte de la app (un error de
  // JavaScript no previsto, o una Promise sin manejar), esto evita que
  // la página quede en blanco: se muestra un aviso comprensible y la
  // app sigue utilizable en modo manual.
  window.addEventListener("error", () => {
    showBanner(
      "Ocurrió un problema inesperado en la aplicación. Podés seguir usando el modo manual para generar tu historia.",
      "error"
    );
  });
  window.addEventListener("unhandledrejection", () => {
    showBanner(
      "Ocurrió un problema inesperado al procesar una operación. Podés seguir usando el modo manual para generar tu historia.",
      "error"
    );
  });

  // -------------------------------------------------------------
  // 13) INICIO
  // -------------------------------------------------------------
  renderizarHistorial();

})();
