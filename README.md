# Entre Líneas 📚

Sistema autónomo de gestión de comprensión lectora con Firebase + GitHub Pages.

---

## Estructura de archivos

```
ENTRELINEAS/
│
├── index.html             ← Página principal (única)
├── styles.css             ← Estilos globales
├── firebase-config.js     ← Configuración de Firebase
├── app.js                 ← Lógica principal de la aplicación
│
├── trivias/
│   ├── trivia_principito.js   ← Trivia: El Principito (código: PRINCIPITO1)
│   └── trivia_XXXXX.js        ← (Nuevas trivias van aquí)
│
└── README.md
```

---

## Cómo agregar una nueva trivia

1. Crea un nuevo archivo en `/trivias/` (por ejemplo: `trivia_hobbit.js`)
2. Copia este formato:

```javascript
window.TRIVIA_HOBBIT1 = {
    codigo:  "HOBBIT1",          // Código que escribe el alumno
    titulo:  "El Hobbit",
    autor:   "J.R.R. Tolkien",
    portada: "🐉",               // Emoji decorativo
    preguntas: [
        {
            q: "¿Cómo se llama el protagonista?",
            o: ["Frodo", "Bilbo", "Gandalf", "Sauron"],
            a: 1   // Índice de la respuesta correcta (0-based)
        },
        // ... más preguntas
    ]
};
```

3. Agrega la etiqueta `<script>` en `index.html`, **antes** de `app.js`:

```html
<script src="trivias/trivia_hobbit.js"></script>
```

4. Registra la trivia en `app.js`, dentro del bloque `DOMContentLoaded`:

```javascript
if (window.TRIVIA_HOBBIT1) registrarTrivia(window.TRIVIA_HOBBIT1);
```

---

## Cómo agregar alumnos en Firebase

1. Ve a **Firebase Console → Realtime Database**
2. Navega a la raíz y crea/edita el nodo `alumnos`
3. Estructura de cada alumno:

```json
{
  "alumno_09": {
    "nombre": "Ana García",
    "dni": "79999999",
    "puntos": 0,
    "codigosUsados": []
  }
}
```

> ⚠️ El nombre debe escribirse **exactamente igual** al momento del login (sin importar mayúsculas).

---

## Cómo subir a GitHub Pages

1. Sube todos los archivos a un repositorio de GitHub
2. Ve a **Settings → Pages**
3. En "Source" selecciona la rama `main` y la carpeta `/` (raíz)
4. Guarda. En unos minutos tendrás la URL pública.

> El archivo `alumnos.json` es solo referencia local. **Los datos reales viven en Firebase.**

---

## Lógica de negocio

- Cada alumno se identifica con **Nombre + DNI**
- Cada trivia tiene un **código único** oculto en el libro físico
- Un alumno **solo puede resolver cada trivia una vez** (el código queda bloqueado)
- Los **puntos se acumulan** en Firebase automáticamente
- El **ranking** se actualiza en tiempo real para todos los alumnos

---

## Alumnos de ejemplo (para pruebas)

| Nombre          | DNI      |
|-----------------|----------|
| Mateo Silva     | 71234567 |
| Valeria Castillo| 72345678 |
| Jc Desarrollador| 73456789 |
| Sofía Mendoza   | 74567890 |
| Lucas Paz       | 75678901 |

> Sube estos datos al nodo `alumnos` de tu Firebase para probar.
