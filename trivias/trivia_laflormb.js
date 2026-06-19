// ============================================================
//  TRIVIA — La Flor Más Bonita
//  Código: LAFLORMB
// ============================================================
window.TRIVIA_LAFLORMB = {
    codigo:        "LAFLORMB",
    titulo:        "La Flor Más Bonita",
    autor:         "Anónimo",
    portada:       "",
    pdf:           "lecturas/laflormb.pdf",
    tiempoLectura: 10,

    preguntas: [
        {
            q: "¿Cuál fue la verdadera intención del rey al organizar la prueba de las semillas?",
            o: [
                "Encontrar a la joven con más conocimientos de jardinería.",
                "Descubrir quién poseía los valores necesarios para ser princesa.",
                "Premiar a la participante más rica del reino.",
                "Enseñar a las jóvenes a cultivar flores."
            ],
            a: 1
        },
        {
            q: "¿Qué se puede inferir sobre Elena cuando decidió asistir al palacio con la maceta vacía?",
            o: [
                "Prefería decir la verdad aunque pudiera perjudicarla.",
                "Estaba segura de que ganaría el concurso.",
                "No comprendía las reglas de la prueba.",
                "Quería llamar la atención de los demás."
            ],
            a: 0
        },
        {
            q: "¿Por qué muchas participantes presentaron flores si las semillas no podían germinar?",
            o: [
                "Porque recibieron ayuda del rey.",
                "Porque encontraron una forma especial de cultivarlas.",
                "Porque buscaron aparentar éxito reemplazando las semillas.",
                "Porque las semillas sí crecieron en algunos casos."
            ],
            a: 2
        },
        {
            q: "¿Qué sentimiento experimentaron probablemente las demás jóvenes cuando Elena fue elegida?",
            o: [
                "Alegría.",
                "Indiferencia.",
                "Sorpresa.",
                "Confianza."
            ],
            a: 2
        },
        {
            q: "¿Cuál es la enseñanza principal de la historia?",
            o: [
                "La riqueza es necesaria para alcanzar el éxito.",
                "La honestidad tiene más valor que las apariencias.",
                "Las competencias siempre generan conflictos.",
                "La jardinería es una habilidad indispensable."
            ],
            a: 1
        }
    ]
};

if (typeof registrarTrivia === "function") {
    registrarTrivia(window.TRIVIA_LAFLORMB);
}
