// ==========================================================================
// ENTRE LÍNEAS — app.js  (Pro 2026)
// Lógica principal: login, lector PDF, trivias, ranking, ENLIN
// ==========================================================================

// --------------------------------------------------------------------------
// BANCO DE TRIVIAS
// --------------------------------------------------------------------------
const BANCO_TRIVIAS = {};

function registrarTrivia(obj) {
    if (obj && obj.codigo) {
        BANCO_TRIVIAS[obj.codigo] = obj;
    }
}

window.addEventListener("DOMContentLoaded", () => {
    if (window.TRIVIA_PRINCIPITO1) registrarTrivia(window.TRIVIA_PRINCIPITO1);
    if (window.TRIVIA_LAFLORMB)    registrarTrivia(window.TRIVIA_LAFLORMB);
});

// --------------------------------------------------------------------------
// ESTADO GLOBAL
// --------------------------------------------------------------------------
let alumnosDB       = [];
let alumnoActual    = null;
let triviaActual    = null;
let indicePregunta  = 0;
let puntajeRonda    = 0;
let timerPregunta   = null;
const SEGUNDOS_POR_PREGUNTA = 20;

// Estado del lector PDF
let timerLectura      = null;
let segundosRestantes = 0;
let lecturaListaTiempo = false;
let scrollAlcanzado    = false;

// --------------------------------------------------------------------------
// FIREBASE
// --------------------------------------------------------------------------
function iniciarEscuchaFirebase() {
    database.ref("alumnos").on("value", (snapshot) => {
        const datos = snapshot.val() || {};
        alumnosDB = Object.entries(datos).map(([id, d]) => ({
            idFirebase:    id,
            nombre:        d.nombre,
            dni:           d.dni,
            puntos:        d.puntos        || 0,
            codigosUsados: d.codigosUsados || []
        }));

        if (alumnoActual) {
            alumnoActual = alumnosDB.find(a => a.dni === alumnoActual.dni) || alumnoActual;
        }

        renderRanking();
    });
}

// --------------------------------------------------------------------------
// SPLASH SCREEN
// --------------------------------------------------------------------------
function ocultarSplash() {
    const splash = document.getElementById("splash-screen");
    if (splash) {
        splash.classList.add("oculto");
        setTimeout(() => splash.remove(), 600);
    }
}

// --------------------------------------------------------------------------
// LOGIN (modal)
// --------------------------------------------------------------------------
function loginStudent() {
    const nombreInput = document.getElementById("login-user").value.trim().toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const dniInput    = document.getElementById("login-pass").value.trim().replace(/\s/g, "");
    const errorEl     = document.getElementById("login-error");

    if (!nombreInput || !dniInput) {
        mostrarError("login-error", "Completa ambos campos.");
        return;
    }

    const encontrado = alumnosDB.find(
        a => a.nombre.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === nombreInput
          && a.dni.trim() === dniInput
    );

    if (encontrado) {
        errorEl.textContent = "";
        alumnoActual = encontrado;

        // Cerrar modal login con animación
        const modalLogin = document.getElementById("modal-login");
        modalLogin.style.transition = "opacity .3s ease";
        modalLogin.style.opacity = "0";
        setTimeout(() => modalLogin.classList.add("hidden"), 300);

        // Mostrar sección unlock
        irA("unlock-box");
        document.getElementById("logged-student-name").textContent = alumnoActual.nombre;
        enlinHablar(`Bienvenido/a ${alumnoActual.nombre.split(" ")[0]}. Ingresa el código del libro.`);
        enlinOjos("feliz");
    } else {
        mostrarError("login-error", "Nombre o DNI incorrectos.");
        enlinOjos("confundido");
        enlinHablar("No encontré esos datos. Revisa el nombre completo y tu DNI.");
    }
}

// --------------------------------------------------------------------------
// DESBLOQUEAR LIBRO → abre modal lector
// --------------------------------------------------------------------------
function unlockBook() {
    const codigo  = document.getElementById("book-code").value.trim().toUpperCase();
    const errorEl = document.getElementById("unlock-error");

    if (!codigo) { mostrarError("unlock-error", "Ingresa un código."); return; }

    const trivia = BANCO_TRIVIAS[codigo];
    if (!trivia) {
        mostrarError("unlock-error", "Código no registrado.");
        enlinOjos("confundido");
        enlinHablar("Ese código no existe. Revisa las letras.");
        return;
    }

    const yaUsado = alumnoActual.codigosUsados.includes(codigo);
    if (yaUsado) {
        mostrarError("unlock-error", "Ya completaste esta trivia.");
        enlinOjos("confundido");
        enlinHablar("Ya resolviste este libro. Busca otro código.");
        return;
    }

    errorEl.textContent = "";
    triviaActual   = trivia;
    indicePregunta = 0;
    puntajeRonda   = 0;

    // Abrir modal lector con este libro
    abrirModalLector(trivia);
}

// --------------------------------------------------------------------------
// MODAL LECTOR PDF
// --------------------------------------------------------------------------
function abrirModalLector(trivia) {
    const modal       = document.getElementById("modal-lector");
    const iframe      = document.getElementById("pdf-iframe");
    const tituloEl    = document.getElementById("lector-titulo");
    const autorEl     = document.getElementById("lector-autor");

    // Datos del libro
    tituloEl.textContent = trivia.titulo || "";
    autorEl.textContent  = trivia.autor  ? `— ${trivia.autor}` : "";

    // Cargar PDF
    const pdfRuta = trivia.pdf || "lecturas/" + trivia.codigo.toLowerCase() + ".pdf";
    iframe.src = pdfRuta;

    // Reset estado lector
    lecturaListaTiempo = false;
    scrollAlcanzado    = false;
    actualizarBotonEmpezar();

    // Mostrar modal
    modal.classList.remove("hidden");
    document.body.style.overflow = "hidden";

    // Iniciar typing effect
    const minutos = trivia.tiempoLectura || 8;
    segundosRestantes = minutos * 60;
    const frases = [
        `Has desbloqueado: ${trivia.titulo}.`,
        `Tómate ${minutos} minutos para leer con calma.`,
        "Cuando termines, presiona Empezar Trivia."
    ];
    iniciarTyping(frases, () => {
        // Al terminar el typing, iniciar el contador
        iniciarContadorLectura();
    });

    enlinHablar(`Codigo verificado. Lee con atención y presiona Empezar cuando termines.`);
    enlinOjos("feliz");
}

// --------------------------------------------------------------------------
// TYPING EFFECT
// --------------------------------------------------------------------------
function iniciarTyping(frases, callback) {
    const el = document.getElementById("lector-typing");
    if (!el) return;
    el.textContent = "";

    let fraseIdx = 0;
    let charIdx  = 0;
    let textoActual = "";

    function escribir() {
        if (fraseIdx >= frases.length) {
            // Quitar el cursor parpadeante cuando termina
            el.style.setProperty("--cursor-visible", "none");
            if (callback) callback();
            return;
        }

        const frase = frases[fraseIdx];
        if (charIdx < frase.length) {
            textoActual += frase[charIdx];
            el.textContent = textoActual;
            charIdx++;
            setTimeout(escribir, 38);
        } else {
            // Pausa entre frases
            textoActual += "  ";
            fraseIdx++;
            charIdx = 0;
            setTimeout(escribir, 600);
        }
    }
    escribir();
}

// --------------------------------------------------------------------------
// CONTADOR DE TIEMPO MÍNIMO DE LECTURA
// --------------------------------------------------------------------------
function iniciarContadorLectura() {
    clearInterval(timerLectura);
    actualizarDisplayTiempo();

    timerLectura = setInterval(() => {
        segundosRestantes--;
        actualizarDisplayTiempo();

        if (segundosRestantes <= 0) {
            clearInterval(timerLectura);
            lecturaListaTiempo = true;
            marcarTiempoListo();
            actualizarBotonEmpezar();
        }
    }, 1000);
}

function actualizarDisplayTiempo() {
    const min = Math.floor(segundosRestantes / 60);
    const seg = segundosRestantes % 60;
    const display = `${min}:${seg.toString().padStart(2, "0")}`;
    const badge   = document.getElementById("tiempo-badge");
    const textoEl = document.getElementById("tiempo-texto");
    const btnText = document.getElementById("btn-empezar-texto");
    const countdownEl = document.getElementById("countdown-display");

    if (textoEl) textoEl.textContent = segundosRestantes > 0
        ? `Tiempo mínimo: ${display}`
        : "Tiempo completado";
    if (countdownEl) countdownEl.textContent = segundosRestantes > 0 ? display : "listo";
}

function marcarTiempoListo() {
    const badge = document.getElementById("tiempo-badge");
    if (badge) badge.classList.add("listo");
    const textoEl = document.getElementById("tiempo-texto");
    if (textoEl) textoEl.textContent = "Tiempo completado";
    enlinHablar("Tiempo de lectura cumplido. Puedes empezar la trivia cuando quieras.");
}

// --------------------------------------------------------------------------
// INDICADOR DE SCROLL (barra lateral + barra inferior)
// --------------------------------------------------------------------------
function iniciarScrollIndicador() {
    // El PDF está en un iframe, no podemos detectar scroll interno directamente.
    // Usamos el scroll del contenedor .pdf-container como proxy (el iframe llena el espacio).
    // El truco: el usuario al leer el PDF hace scroll en el iframe, pero nosotros
    // simulamos con un detector de tiempo + mensaje orientativo.
    // Para el scroll real, usamos el contenedor del modal que sí tiene overflow:auto en mobile.

    const container = document.getElementById("pdf-container");
    if (!container) return;

    // En desktop: el iframe ocupa todo, monitoreamos mensajes del iframe (si mismo origen)
    // Como fallback elegante: usamos un intervalo que va subiendo el progreso gradualmente
    // mientras el tiempo corre, dando feedback visual real.
    // Si el usuario hace scroll en el modal-lector (mobile), lo detectamos.

    const lectorModal = document.querySelector(".lector-modal-card");
    if (lectorModal) {
        lectorModal.addEventListener("scroll", actualizarScrollVisual);
    }
    // También detectar si el iframe envía mensajes de scroll (mismo origen)
    window.addEventListener("message", (e) => {
        if (e.data && typeof e.data.scrollPct === "number") {
            setScrollProgress(e.data.scrollPct);
        }
    });
}

function actualizarScrollVisual(e) {
    const el = e.target;
    const pct = Math.min(100, Math.round((el.scrollTop / (el.scrollHeight - el.clientHeight)) * 100)) || 0;
    setScrollProgress(pct);
}

// Progreso visual de scroll (barra lateral + barra inferior)
let _scrollPctActual = 0;
function setScrollProgress(pct) {
    _scrollPctActual = pct;
    const fill  = document.getElementById("scroll-fill");
    const fillH = document.getElementById("scroll-progress-fill");
    const label = document.getElementById("scroll-progress-label");

    if (fill)  fill.style.height = `${pct}%`;
    if (fillH) fillH.style.width = `${pct}%`;
    if (label) {
        if (pct >= 95) {
            label.textContent = "Documento completado";
            scrollAlcanzado = true;
            actualizarBotonEmpezar();
        } else if (pct > 0) {
            label.textContent = `Progreso de lectura: ${pct}%`;
        }
    }
}

// Avance automático del scroll mientras el tiempo corre (simulación visual)
function iniciarProgresoSimulado() {
    const trivia   = triviaActual;
    const totalSeg = (trivia?.tiempoLectura || 8) * 60;
    let   elapsed  = 0;

    const inter = setInterval(() => {
        elapsed++;
        if (elapsed >= totalSeg || lecturaListaTiempo) {
            clearInterval(inter);
            return;
        }
        // Progreso suave basado en tiempo transcurrido
        const pct = Math.min(98, Math.round((elapsed / totalSeg) * 100));
        setScrollProgress(pct);

        if (elapsed >= totalSeg * 0.95) {
            clearInterval(inter);
            setScrollProgress(100);
        }
    }, 1000);
}

// --------------------------------------------------------------------------
// BOTÓN EMPEZAR — habilitado solo cuando tiempo Y scroll están listos
// --------------------------------------------------------------------------
function actualizarBotonEmpezar() {
    const btn     = document.getElementById("btn-empezar");
    const label   = document.getElementById("scroll-progress-label");
    if (!btn) return;

    const listo = lecturaListaTiempo && (scrollAlcanzado || _scrollPctActual >= 95);

    btn.disabled = !listo;

    if (!lecturaListaTiempo) {
        // Aún contando tiempo
    } else if (!scrollAlcanzado && _scrollPctActual < 95) {
        if (label) label.textContent = "Desplázate por todo el documento para continuar";
    }
}

// --------------------------------------------------------------------------
// MODAL DE CONFIRMACIÓN
// --------------------------------------------------------------------------
function pedirConfirmacion() {
    document.getElementById("modal-confirmar").classList.remove("hidden");
}

function volverALeer() {
    document.getElementById("modal-confirmar").classList.add("hidden");
}

function confirmarInicioTrivia() {
    // Cerrar ambos modales
    document.getElementById("modal-confirmar").classList.add("hidden");
    const modalLector = document.getElementById("modal-lector");
    modalLector.style.transition = "opacity .3s ease";
    modalLector.style.opacity = "0";
    setTimeout(() => {
        modalLector.classList.add("hidden");
        modalLector.style.opacity = "";
        // Limpiar iframe
        document.getElementById("pdf-iframe").src = "";
    }, 300);

    document.body.style.overflow = "";
    clearInterval(timerLectura);

    // Configurar quiz
    document.getElementById("quiz-titulo").textContent =
        `${triviaActual.portada || ""} ${triviaActual.titulo}`;
    document.getElementById("quiz-autor").textContent =
        triviaActual.autor ? `— ${triviaActual.autor}` : "";

    irA("quiz-box");
    enlinOjos("feliz");
    enlinHablar("Ahora sí. Responde con calma, tienes 20 segundos por pregunta.");
    mostrarPregunta();
}

// --------------------------------------------------------------------------
// MOSTRAR PREGUNTA
// --------------------------------------------------------------------------
function mostrarPregunta() {
    const total    = triviaActual.preguntas.length;
    const pregData = triviaActual.preguntas[indicePregunta];

    document.getElementById("quiz-question").textContent = pregData.q;
    document.getElementById("quiz-numero").textContent   = `Pregunta ${indicePregunta + 1} de ${total}`;

    const cont = document.getElementById("quiz-options");
    cont.innerHTML = "";
    pregData.o.forEach((opcion, i) => {
        const btn = document.createElement("button");
        btn.className = "option-btn";
        btn.textContent = opcion;
        btn.onclick = () => seleccionarRespuesta(i);
        cont.appendChild(btn);
    });

    document.getElementById("progress").style.width =
        `${((indicePregunta + 1) / total) * 100}%`;

    iniciarTimer();
}

// --------------------------------------------------------------------------
// TIMER
// --------------------------------------------------------------------------
function iniciarTimer() {
    clearInterval(timerPregunta);
    let restante = SEGUNDOS_POR_PREGUNTA;
    const timerEl = document.getElementById("quiz-timer");
    if (!timerEl) return;
    timerEl.textContent = restante;
    timerEl.classList.remove("urgente");

    timerPregunta = setInterval(() => {
        restante--;
        timerEl.textContent = restante;
        if (restante <= 5) timerEl.classList.add("urgente");
        if (restante <= 0) {
            clearInterval(timerPregunta);
            seleccionarRespuesta(-1);
        }
    }, 1000);
}

// --------------------------------------------------------------------------
// SELECCIONAR RESPUESTA
// --------------------------------------------------------------------------
function seleccionarRespuesta(indexElegido) {
    clearInterval(timerPregunta);

    const pregData = triviaActual.preguntas[indicePregunta];
    const correcta = pregData.a;
    const botones  = document.querySelectorAll(".option-btn");

    botones.forEach((btn, i) => {
        btn.disabled = true;
        if (i === correcta)                          btn.classList.add("correcta");
        if (i === indexElegido && i !== correcta)    btn.classList.add("incorrecta");
    });

    if (indexElegido === correcta) {
        puntajeRonda += 100;
        enlinHablar("Correcto. Excelente.");
        enlinOjos("feliz");
    } else {
        enlinHablar("Esa no era. Sigue adelante.");
        enlinOjos("confundido");
    }

    setTimeout(() => {
        indicePregunta++;
        if (indicePregunta < triviaActual.preguntas.length) {
            mostrarPregunta();
        } else {
            mostrarResultados();
        }
    }, 1200);
}

// --------------------------------------------------------------------------
// GUARDAR EN FIREBASE
// --------------------------------------------------------------------------
async function guardarEnFirebase() {
    if (!alumnoActual) return;

    const nuevosPuntos        = alumnoActual.puntos + puntajeRonda;
    const nuevosCodigosUsados = [...alumnoActual.codigosUsados, triviaActual.codigo];

    try {
        await database.ref("alumnos/" + alumnoActual.idFirebase).update({
            puntos:        nuevosPuntos,
            codigosUsados: nuevosCodigosUsados
        });
        alumnoActual.puntos        = nuevosPuntos;
        alumnoActual.codigosUsados = nuevosCodigosUsados;
    } catch (err) {
        console.error("Error al guardar en Firebase:", err);
    }
}

// --------------------------------------------------------------------------
// MOSTRAR RESULTADOS
// --------------------------------------------------------------------------
async function mostrarResultados() {
    await guardarEnFirebase();

    const maxPts    = triviaActual.preguntas.length * 100;
    const porciento = Math.round((puntajeRonda / maxPts) * 100);

    document.getElementById("result-score-num").textContent  = puntajeRonda;
    document.getElementById("result-score-max").textContent  = maxPts;
    document.getElementById("result-porcentaje").textContent = `${porciento}%`;

    let medalla = "", mensaje = "";
    if (porciento === 100) {
        medalla  = "🥇";
        mensaje  = "Perfecto. Eres un lector extraordinario.";
        enlinOjos("feliz");
    } else if (porciento >= 60) {
        medalla  = "🥈";
        mensaje  = "Muy bien. Tus puntos fueron guardados.";
        enlinOjos("feliz");
    } else {
        medalla  = "📚";
        mensaje  = "Sigue leyendo. La próxima te irá mejor.";
        enlinOjos("confundido");
    }

    document.getElementById("result-medalla").textContent = medalla;
    document.getElementById("result-mensaje").textContent = mensaje;
    document.getElementById("result-libro").textContent   =
        `${triviaActual.portada || ""} ${triviaActual.titulo}`;

    irA("result-box");
    enlinHablar(mensaje);
}

// --------------------------------------------------------------------------
// CERRAR SESIÓN
// --------------------------------------------------------------------------
function cerrarSesion() {
    alumnoActual   = null;
    triviaActual   = null;
    indicePregunta = 0;
    puntajeRonda   = 0;
    clearInterval(timerLectura);

    document.getElementById("login-user").value = "";
    document.getElementById("login-pass").value = "";
    document.getElementById("book-code").value  = "";

    // Volver a mostrar el modal de login
    const modalLogin = document.getElementById("modal-login");
    modalLogin.classList.remove("hidden");
    modalLogin.style.opacity = "";

    irA("login-box");
    enlinOjos("normal");
    enlinHablar("Sesión cerrada. Hasta la próxima.");
}

// --------------------------------------------------------------------------
// RANKING
// --------------------------------------------------------------------------
function renderRanking() {
    const lista = document.getElementById("leaderboard");
    if (!lista) return;

    const ordenados = [...alumnosDB].sort((a, b) => b.puntos - a.puntos);
    const top5      = ordenados.slice(0, 5);

    lista.innerHTML = "";
    top5.forEach((al, i) => {
        const li    = document.createElement("li");
        const icons = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];
        li.innerHTML = `
            <span class="rank-pos">${icons[i]}</span>
            <span class="rank-nombre">${al.nombre}</span>
            <span class="rank-pts">${al.puntos} pts</span>
        `;
        lista.appendChild(li);
    });
}

function buscarEstudiante() {
    const query     = document.getElementById("search-student").value.trim().toLowerCase();
    const resultado = document.getElementById("search-result-card");

    if (!query) { resultado.classList.add("hidden"); return; }

    const ordenados = [...alumnosDB].sort((a, b) => b.puntos - a.puntos);
    const idx       = ordenados.findIndex(a => a.nombre.toLowerCase().includes(query));

    resultado.classList.remove("hidden");
    if (idx !== -1) {
        const al = ordenados[idx];
        resultado.innerHTML = `
            <div>
                <strong>Posición #${idx + 1}</strong><br>
                <span>${al.nombre}</span>
            </div>
            <div class="rank-pts">${al.puntos} pts</div>
        `;
    } else {
        resultado.innerHTML = `<span>No encontrado.</span>`;
    }
}

// --------------------------------------------------------------------------
// NAVEGACIÓN
// --------------------------------------------------------------------------
const SECCIONES = ["login-box", "unlock-box", "quiz-box", "result-box"];

function irA(idSeccion) {
    SECCIONES.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.toggle("hidden", id !== idSeccion);
    });
    if (idSeccion !== "login-box") {
        window.scrollTo({ top: 0, behavior: "smooth" });
    }
}

// --------------------------------------------------------------------------
// MODO NOCTURNO
// --------------------------------------------------------------------------
function toggleModoNoche() {
    document.body.classList.toggle("modo-nocturno");
    const btn = document.getElementById("btn-noche");
    const activo = document.body.classList.contains("modo-nocturno");
    if (btn) {
        btn.innerHTML = activo
            ? `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style="width:13px;height:13px;fill:currentColor"><path d="M6.76 4.84l-1.8-1.79-1.41 1.41 1.79 1.79 1.42-1.41zM4 10.5H1v2h3v-2zm9-9.95h-2V3.5h2V.55zm7.45 3.91l-1.41-1.41-1.79 1.79 1.41 1.41 1.79-1.79zm-3.21 13.7l1.79 1.8 1.41-1.41-1.8-1.79-1.4 1.4zM20 10.5v2h3v-2h-3zm-8-5c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm-1 16.95h2V19.5h-2v2.95zm-7.45-3.91l1.41 1.41 1.79-1.8-1.41-1.41-1.79 1.8z"/></svg> Modo Día`
            : `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style="width:13px;height:13px;fill:currentColor"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg> Modo Lectura`;
    }
}

// --------------------------------------------------------------------------
// MENÚ HAMBURGUESA
// --------------------------------------------------------------------------
function toggleMenu() {
    document.getElementById("nav-links").classList.toggle("active");
}

// --------------------------------------------------------------------------
// NAVBAR — efecto scroll
// --------------------------------------------------------------------------
function iniciarNavbarScroll() {
    const navbar = document.getElementById("navbar");
    window.addEventListener("scroll", () => {
        navbar.classList.toggle("scrolled", window.scrollY > 40);
    }, { passive: true });
}

// --------------------------------------------------------------------------
// PARALLAX sutil en libros de fondo
// --------------------------------------------------------------------------
function iniciarParallax() {
    const books = document.querySelectorAll(".bg-book");
    document.addEventListener("mousemove", (e) => {
        const cx = window.innerWidth  / 2;
        const cy = window.innerHeight / 2;
        const dx = (e.clientX - cx) / cx;
        const dy = (e.clientY - cy) / cy;

        books.forEach((b, i) => {
            const factor = (i + 1) * 4;
            b.style.transform = b.style.transform.replace(/translate\([^)]+\)/, "") +
                ` translate(${dx * factor}px, ${dy * factor}px)`;
        });
    }, { passive: true });
}

// --------------------------------------------------------------------------
// ENLIN
// --------------------------------------------------------------------------
const FRASES_ENLIN = [
    "Leer es el superpoder más accesible del mundo.",
    "Cada código es la puerta a un mundo nuevo.",
    "Tus puntos se guardan automáticamente.",
    "Solo puedes resolver cada código una vez. Vale la pena prepararse.",
    "La lectura fortalece tu imaginación y tu memoria.",
    "Los mejores lectores del salón están en el ranking. ¿Serás uno?",
    "Tómate tu tiempo con cada lectura. La calidad importa más que la velocidad.",
];

let enlinTimeout = null;

function enlinHablar(texto) {
    const burbuja = document.getElementById("enlin-bubble");
    if (!burbuja) return;
    burbuja.textContent = texto;
    burbuja.classList.remove("hidden");
    clearTimeout(enlinTimeout);
    enlinTimeout = setTimeout(() => burbuja.classList.add("hidden"), 6000);
}

function enlinOjos(estado) {
    const ojos = document.getElementById("enlin-eyes");
    if (ojos) ojos.className = `eyes-${estado}`;
}

function enlinClickAleatorio() {
    enlinHablar(FRASES_ENLIN[Math.floor(Math.random() * FRASES_ENLIN.length)]);
}

// --------------------------------------------------------------------------
// ENLIN — arrastrable
// --------------------------------------------------------------------------
function hacerEnlinArrastrable() {
    const widget    = document.getElementById("enlin-widget");
    const clickArea = document.getElementById("enlin-clickarea");
    let arrastrando = false, movio = false;
    let sx = 0, sy = 0, ox = 0, oy = 0;

    const getXY = e => e.touches
        ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
        : { x: e.clientX, y: e.clientY };

    const start = e => { movio = false; arrastrando = true; const { x, y } = getXY(e); sx = x - ox; sy = y - oy; };
    const move  = e => { if (!arrastrando) return; movio = true; e.preventDefault(); const { x, y } = getXY(e); ox = x - sx; oy = y - sy; widget.style.transform = `translate3d(${ox}px,${oy}px,0)`; };
    const end   = () => { arrastrando = false; if (!movio) enlinClickAleatorio(); };

    clickArea.addEventListener("mousedown",  start, { passive: true });
    document.addEventListener("mousemove",   move,  { passive: false });
    document.addEventListener("mouseup",     end,   { passive: true });
    clickArea.addEventListener("touchstart", start, { passive: true });
    document.addEventListener("touchmove",   move,  { passive: false });
    document.addEventListener("touchend",    end,   { passive: true });
}

// --------------------------------------------------------------------------
// INICIO
// --------------------------------------------------------------------------
window.addEventListener("DOMContentLoaded", () => {
    iniciarEscuchaFirebase();
    hacerEnlinArrastrable();
    iniciarNavbarScroll();
    iniciarParallax();
    iniciarScrollIndicador();

    // Mostrar modal login después de splash
    setTimeout(() => {
        ocultarSplash();
        setTimeout(() => {
            enlinHablar("Hola. Soy ENLIN. Inicia sesión para comenzar tu lectura.");
        }, 500);
    }, 2000);
});

// --------------------------------------------------------------------------
// HELPERS
// --------------------------------------------------------------------------
function mostrarError(idEl, msg) {
    const el = document.getElementById(idEl);
    if (el) el.textContent = msg;
}
