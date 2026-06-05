// ==========================================================================
// 🚀 ENTRE LÍNEAS — app.js
// Lógica principal: login, trivias, ranking, ENLIN
// ==========================================================================

// --------------------------------------------------------------------------
// 📖 BANCO DE TRIVIAS
// Se registran aquí los objetos definidos en trivias/trivia_*.js
// Para agregar una nueva trivia: crea el archivo en /trivias/ y regístrala aquí.
// --------------------------------------------------------------------------
const BANCO_TRIVIAS = {};

function registrarTrivia(obj) {
    if (obj && obj.codigo) {
        BANCO_TRIVIAS[obj.codigo] = obj;
    }
}

// Se registran al cargar (los scripts de trivias deben cargarse antes que app.js)
window.addEventListener("DOMContentLoaded", () => {
    if (window.TRIVIA_PRINCIPITO1) registrarTrivia(window.TRIVIA_PRINCIPITO1);
    // Agrega futuras trivias aquí:
    // if (window.TRIVIA_HOBBIT1) registrarTrivia(window.TRIVIA_HOBBIT1);
});

// --------------------------------------------------------------------------
// 🌎 ESTADO GLOBAL
// --------------------------------------------------------------------------
let alumnosDB       = [];   // espejo local de Firebase
let alumnoActual    = null; // alumno logueado
let triviaActual    = null; // trivia en curso
let indicePregunta  = 0;
let puntajeRonda    = 0;
let timerPregunta   = null;
const SEGUNDOS_POR_PREGUNTA = 20;

// --------------------------------------------------------------------------
// 📡 FIREBASE — escuchar alumnos en tiempo real
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

        // Refrescar referencia del alumno logueado
        if (alumnoActual) {
            alumnoActual = alumnosDB.find(a => a.dni === alumnoActual.dni) || alumnoActual;
        }

        renderRanking();
    });
}

// --------------------------------------------------------------------------
// 🔑 LOGIN
// --------------------------------------------------------------------------
function loginStudent() {
    const nombreInput = document.getElementById("login-user").value.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
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
        irA("unlock-box");
        document.getElementById("logged-student-name").textContent = alumnoActual.nombre;
        enlinHablar(`¡Bienvenido/a ${alumnoActual.nombre.split(" ")[0]}! Ingresa el código del libro.`);
        enlinOjos("feliz");
    } else {
        mostrarError("login-error", "Nombre o DNI incorrectos.");
        enlinOjos("confundido");
        enlinHablar("No encontré esos datos. ¿Seguro que es correcto?");
    }
}

// --------------------------------------------------------------------------
// 🔓 DESBLOQUEAR TRIVIA
// --------------------------------------------------------------------------
function unlockBook() {
    const codigo   = document.getElementById("book-code").value.trim().toUpperCase();
    const errorEl  = document.getElementById("unlock-error");

    if (!codigo) {
        mostrarError("unlock-error", "Ingresa un código.");
        return;
    }

    const trivia = BANCO_TRIVIAS[codigo];

    if (!trivia) {
        mostrarError("unlock-error", "Código no registrado.");
        enlinOjos("confundido");
        enlinHablar("Ese código no existe. Revisa bien las letras.");
        return;
    }

    const yaUsado = alumnoActual.codigosUsados.includes(codigo);
    if (yaUsado) {
        mostrarError("unlock-error", "Ya completaste esta trivia.");
        enlinOjos("confundido");
        enlinHablar("¡Ya resolviste este libro! Busca otro código.");
        return;
    }

    // ✅ Todo ok → iniciar trivia
    errorEl.textContent = "";
    triviaActual   = trivia;
    indicePregunta = 0;
    puntajeRonda   = 0;

    document.getElementById("quiz-titulo").textContent =
        `${trivia.portada} ${trivia.titulo}`;
    document.getElementById("quiz-autor").textContent =
        trivia.autor ? `— ${trivia.autor}` : "";

    irA("quiz-box");
    enlinOjos("feliz");
    enlinHablar("¡Código verificado! Responde con calma.");
    mostrarPregunta();
}

// --------------------------------------------------------------------------
// ❓ MOSTRAR PREGUNTA
// --------------------------------------------------------------------------
function mostrarPregunta() {
    const total    = triviaActual.preguntas.length;
    const pregData = triviaActual.preguntas[indicePregunta];

    // Texto
    document.getElementById("quiz-question").textContent = pregData.q;

    // Número
    document.getElementById("quiz-numero").textContent =
        `Pregunta ${indicePregunta + 1} de ${total}`;

    // Opciones
    const cont = document.getElementById("quiz-options");
    cont.innerHTML = "";
    pregData.o.forEach((opcion, i) => {
        const btn = document.createElement("button");
        btn.className = "option-btn";
        btn.textContent = opcion;
        btn.onclick = () => seleccionarRespuesta(i);
        cont.appendChild(btn);
    });

    // Barra de progreso
    document.getElementById("progress").style.width =
        `${((indicePregunta + 1) / total) * 100}%`;

    // Timer visual
    iniciarTimer();
}

// --------------------------------------------------------------------------
// ⏱️ TIMER POR PREGUNTA
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
            // Tiempo agotado → respuesta incorrecta automática
            seleccionarRespuesta(-1);
        }
    }, 1000);
}

// --------------------------------------------------------------------------
// ✅ SELECCIONAR RESPUESTA
// --------------------------------------------------------------------------
function seleccionarRespuesta(indexElegido) {
    clearInterval(timerPregunta);

    const pregData  = triviaActual.preguntas[indicePregunta];
    const correcta  = pregData.a;
    const botones   = document.querySelectorAll(".option-btn");

    // Feedback visual
    botones.forEach((btn, i) => {
        btn.disabled = true;
        if (i === correcta)    btn.classList.add("correcta");
        if (i === indexElegido && i !== correcta) btn.classList.add("incorrecta");
    });

    if (indexElegido === correcta) {
        puntajeRonda += 100;
        enlinHablar("¡Correcto! 🎉");
        enlinOjos("feliz");
    } else {
        enlinHablar("Esa no era... Sigue adelante 💪");
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
// 💾 GUARDAR RESULTADOS EN FIREBASE
// --------------------------------------------------------------------------
async function guardarEnFirebase() {
    if (!alumnoActual) return;

    const nuevosPuntos      = alumnoActual.puntos + puntajeRonda;
    const nuevosCodigosUsados = [
        ...alumnoActual.codigosUsados,
        triviaActual.codigo
    ];

    try {
        await database.ref("alumnos/" + alumnoActual.idFirebase).update({
            puntos:        nuevosPuntos,
            codigosUsados: nuevosCodigosUsados
        });
        // Actualizar local inmediatamente
        alumnoActual.puntos        = nuevosPuntos;
        alumnoActual.codigosUsados = nuevosCodigosUsados;
    } catch (err) {
        console.error("Error al guardar en Firebase:", err);
    }
}

// --------------------------------------------------------------------------
// 🏅 MOSTRAR RESULTADOS
// --------------------------------------------------------------------------
async function mostrarResultados() {
    await guardarEnFirebase();

    const maxPts    = triviaActual.preguntas.length * 100;
    const porciento = Math.round((puntajeRonda / maxPts) * 100);

    document.getElementById("result-score-num").textContent  = puntajeRonda;
    document.getElementById("result-score-max").textContent  = maxPts;
    document.getElementById("result-porcentaje").textContent = `${porciento}%`;

    // Medalla
    let medalla = "", mensaje = "";
    if (porciento === 100) {
        medalla  = "🥇";
        mensaje  = "¡Perfecto! ¡Eres un lector extraordinario!";
        enlinOjos("feliz");
    } else if (porciento >= 60) {
        medalla  = "🥈";
        mensaje  = "¡Muy bien! Tus puntos fueron guardados.";
        enlinOjos("feliz");
    } else {
        medalla  = "📚";
        mensaje  = "¡Sigue leyendo! La próxima te irá mejor.";
        enlinOjos("confundido");
    }

    document.getElementById("result-medalla").textContent  = medalla;
    document.getElementById("result-mensaje").textContent  = mensaje;
    document.getElementById("result-libro").textContent    =
        `${triviaActual.portada} ${triviaActual.titulo}`;

    irA("result-box");
    enlinHablar(mensaje);
}

// --------------------------------------------------------------------------
// 🔄 CERRAR SESIÓN
// --------------------------------------------------------------------------
function cerrarSesion() {
    alumnoActual   = null;
    triviaActual   = null;
    indicePregunta = 0;
    puntajeRonda   = 0;

    document.getElementById("login-user").value = "";
    document.getElementById("login-pass").value = "";
    document.getElementById("book-code").value  = "";

    irA("login-box");
    enlinOjos("normal");
    enlinHablar("Sesión cerrada. ¡Hasta la próxima!");
}

// --------------------------------------------------------------------------
// 🏆 RANKING (TOP 5 + BÚSQUEDA)
// --------------------------------------------------------------------------
function renderRanking() {
    const lista = document.getElementById("leaderboard");
    if (!lista) return;

    const ordenados = [...alumnosDB].sort((a, b) => b.puntos - a.puntos);
    const top5      = ordenados.slice(0, 5);

    lista.innerHTML = "";
    top5.forEach((al, i) => {
        const li  = document.createElement("li");
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
    const query    = document.getElementById("search-student").value.trim().toLowerCase();
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
// 🧭 NAVEGACIÓN entre secciones
// --------------------------------------------------------------------------
const SECCIONES = ["login-box", "unlock-box", "quiz-box", "result-box"];

function irA(idSeccion) {
    SECCIONES.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.toggle("hidden", id !== idSeccion);
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
}

// --------------------------------------------------------------------------
// 🌙 MODO NOCTURNO
// --------------------------------------------------------------------------
function toggleModoNoche() {
    document.body.classList.toggle("modo-nocturno");
    const btn = document.getElementById("btn-noche");
    if (btn) btn.textContent = document.body.classList.contains("modo-nocturno") ? "☀️ Modo Día" : "🌙 Modo Lectura";
}

// --------------------------------------------------------------------------
// 📱 MENÚ HAMBURGUESA
// --------------------------------------------------------------------------
function toggleMenu() {
    document.getElementById("nav-links").classList.toggle("active");
}

// --------------------------------------------------------------------------
// 💬 ENLIN — personaje mascota
// --------------------------------------------------------------------------
const FRASES_ENLIN = [
    "¡Leer es el superpoder más accesible del mundo!",
    "Cada código es la puerta a un mundo nuevo.",
    "Tus puntos se guardan automáticamente. 🌟",
    "Solo puedes resolver cada código una vez. ¡Vale la pena prepararse!",
    "¡La lectura fortalece tu imaginación y tu memoria!",
    "Los mejores lectores del salón están en el ranking. ¿Serás uno?",
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
    // estado: 'normal' | 'feliz' | 'confundido'
    const ojos = document.getElementById("enlin-eyes");
    if (ojos) ojos.className = `eyes-${estado}`;
}

function enlinClickAleatorio() {
    enlinHablar(FRASES_ENLIN[Math.floor(Math.random() * FRASES_ENLIN.length)]);
}

// --------------------------------------------------------------------------
// 🖱️ ENLIN — arrastrable
// --------------------------------------------------------------------------
function hacerEnlinArrastrable() {
    const widget    = document.getElementById("enlin-widget");
    const clickArea = document.getElementById("enlin-clickarea");
    let arrastrando = false, movio = false;
    let sx = 0, sy = 0, ox = 0, oy = 0;

    const getXY = e => e.touches
        ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
        : { x: e.clientX, y: e.clientY };

    const start = e => {
        movio = false; arrastrando = true;
        const { x, y } = getXY(e);
        sx = x - ox; sy = y - oy;
    };
    const move = e => {
        if (!arrastrando) return;
        movio = true;
        e.preventDefault();
        const { x, y } = getXY(e);
        ox = x - sx; oy = y - sy;
        widget.style.transform = `translate3d(${ox}px,${oy}px,0)`;
    };
    const end = () => {
        arrastrando = false;
        if (!movio) enlinClickAleatorio();
    };

    clickArea.addEventListener("mousedown",  start, { passive: true });
    document.addEventListener("mousemove",   move,  { passive: false });
    document.addEventListener("mouseup",     end,   { passive: true });
    clickArea.addEventListener("touchstart", start, { passive: true });
    document.addEventListener("touchmove",   move,  { passive: false });
    document.addEventListener("touchend",    end,   { passive: true });
}

// --------------------------------------------------------------------------
// 🚀 INICIO
// --------------------------------------------------------------------------
window.addEventListener("DOMContentLoaded", () => {
    iniciarEscuchaFirebase();
    hacerEnlinArrastrable();
    irA("login-box");

    setTimeout(() => {
        enlinHablar("¡Hola! Soy ENLIN. Inicia sesión para comenzar. 📖");
    }, 700);
});

// --------------------------------------------------------------------------
// 🛠️ HELPERS
// --------------------------------------------------------------------------
function mostrarError(idEl, msg) {
    const el = document.getElementById(idEl);
    if (el) el.textContent = msg;
}
