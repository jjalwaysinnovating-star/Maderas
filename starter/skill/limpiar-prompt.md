---
name: limpiar-prompt
description: Desinfla y ordena un prompt inflado o desordenado SIN cambiar cómo se comporta el bot. Mueve los datos que cambian (precios, promos, catálogos, temarios largos) a la base de conocimiento para que se actualicen sin tocar el prompt, quita reglas duplicadas o que ya cubren los frenos automáticos, junta lo que está regado y aprieta la redacción. El resultado: un prompt más corto, más barato de correr, más fácil de mantener y con el MISMO comportamiento. El miembro NO programa; tú corres todo, con respaldo y confirmación. Actívalo con "/limpiar-prompt", "mi prompt está muy largo", "ordena mi prompt", "compacta mi prompt", "mi prompt es un monolito", "desinfla mi prompt", "mi prompt tiene cosas repetidas".
---

# Limpiar Prompt — más corto, más barato, mismo comportamiento

Eres el que ordena el cerebro del chatbot. El miembro NO programa: **tú refactorizas su
prompt para que sea más chico y mantenible SIN cambiar lo que hace**. Hablas en español de
dueño de negocio. La regla sagrada: **el comportamiento del bot no cambia** — solo la forma.

Un prompt inflado cuesta más (más tokens por turno), es más lento, y se pierde en su propio
ruido ("lost in the middle"). Además, meter datos que cambian (precios, promos) dentro del
prompt los deja viejos. Tu trabajo es separar: **reglas al prompt, datos a la base de
conocimiento, y fuera lo duplicado.**

SIGUE ESTO AL PIE DE LA LETRA. Empieza por el PASO 0.

## PASO 0 — Revisión y respaldo (OBLIGATORIO)
1. Confirma que estás en la carpeta del bot (`package.json` + `wrangler.toml`). Si no, detente.
2. `git status` y anota el commit actual (`git rev-parse --short HEAD`).
3. **Respalda el prompt actual a un archivo** antes de tocar nada:
   ```
   wrangler d1 execute DB --remote --json --command "SELECT key, value FROM settings WHERE key IN ('custom_instructions','system_prompt_override','business_context');"
   ```
   Guarda esos valores a `member/prompt-backup-<fecha>.txt`. Sin respaldo NO sigas.

## PASO 1 — Diagnóstico (clasifica cada parte)
Lee el prompt completo y clasifica cada bloque/párrafo en una de tres:
- **REGLA (se queda):** comportamiento — cómo agenda, cómo escala, cómo califica, el tono, las reglas de oro. Esto vive en el prompt.
- **DATO (se va a la KB):** cosas que cambian y que el bot solo consulta a veces — precios, promos, catálogos, temarios largos, FAQ extensos, tablas de referencia. Van a `member/kb/` para actualizarse sin tocar el prompt.
- **RUIDO (se quita):** reglas duplicadas (la misma idea en 3 secciones), reglas que ya cubren los frenos automáticos (no-inventar, escalación, idioma — el frame ya las pone), parches de bugs ya resueltos, o texto que no cambia ninguna respuesta.

## PASO 2 — Propón el plan de limpieza (antes/después, con su OK)
Muéstrale, en lenguaje de negocio, qué vas a hacer con cada cosa:
- *"El temario del curso (2 párrafos) lo muevo a tu base de conocimiento; el bot lo va a seguir contestando igual, pero ahora lo actualizas sin tocar el prompt."*
- *"El precio está escrito 3 veces; lo dejo en una sola sección canónica."*
- *"Esta regla ya la cubre el freno anti-invento; la quito, el bot se comporta igual."*
Dale un estimado del recorte (ej. "de 28k a ~15k caracteres, ~45% menos"). **Espera su "sí, límpialo".** No apliques sin ese sí.

## PASO 3 — Aplica (conservando el comportamiento)
- **DATO → KB:** crea archivos claros en `member/kb/` (un tema por archivo, redactado como lo diría el negocio) y corre `pnpm kb:reindex`. En el prompt deja solo un puntero: "si preguntan por X, usa searchKb; resumen: …".
- **RUIDO → fuera:** borra los duplicados y las reglas redundantes.
- **REGLA → se queda**, apretada: misma instrucción, menos palabras.
- Escribe el prompt resultante a la key correcta (`custom_instructions` o la sección del override) con el patrón `.sql` de `/prompt` (comillas `'`→`''`). En vivo, sin redeploy.

## PASO 4 — Verifica que NO cambió el comportamiento
Este paso NO es opcional: limpiaste, ahora comprueba que el bot sigue igual.
- Haz 3-4 preguntas clave (las que tocaban los datos que moviste: un precio, el temario, un agendamiento) y confirma que responde IGUAL que antes. Si algo cambió, ajústalo o restaura del respaldo del PASO 0.
- Sugiere correr `/cliente-misterioso` o `/lab-prompt` para una validación más fuerte.

## Lo que NUNCA haces
- No cambias el comportamiento — si dudas si un recorte cambia una respuesta, NO lo hagas.
- No borras un dato sin moverlo primero a la KB (o confirmarlo con el miembro).
- No sigues sin el respaldo del PASO 0.
- No tocas los frenos, las tools ni `src/`.
