# Importar y ejecutar

1. Extraer `Escriban-IA-claude.zip` en una carpeta vacía. También se puede abrir este proyecto directamente en una herramienta con acceso a archivos y terminal.
2. Abrir esa carpeta como proyecto Escriban-IA. Dar a Claude el contenido de `PROMPT-PARA-CLAUDE.txt`. El asistente necesita acceso a los archivos y terminal para ejecutar; adjuntar archivos a un chat por sí solo no inicia un servidor.
3. Instalar Node >=22.13.0 (Node 24 es compatible con las pruebas realizadas) y npm. La primera instalación requiere acceso al registro npm.
4. Ejecutar desde la raíz:

```sh
npm run install:ci
node scripts/prepare-local.mjs
npm run dev
```

Abrir http://localhost:5173. El plugin local permite ingresar como `local_seedy` / `seedy@sites.test`; funciona solo en loopback. Los datos se guardan en `.wrangler/state`. Detener con Ctrl+C. `prepare-local` genera una clave local en `.dev.vars` solo cuando falta y aplica migraciones pendientes con Wrangler local. No reemplaza claves existentes. Guardar esa clave junto con cualquier respaldo de credenciales cifradas; una clave nueva no descifra registros anteriores.

Configurar correo y contraseña de EdERSA en la pantalla de credenciales. Alternativamente el servidor admite `EDERSA_EMAIL` y `EDERSA_PASSWORD` en `.dev.vars`. Camuzzi no necesita esas credenciales. Las consultas reales requieren Internet y dependen de los portales oficiales. El código de EdERSA puede asociar automáticamente el NIS a la cuenta configurada.

## Ejecutar desde GitHub (Codespaces)
En GitHub: botón **Code → Codespaces → Create codespace on main**. La primera vez instala dependencias y prepara D1 local (`.devcontainer/devcontainer.json`); luego `npm run dev` arranca solo y se abre el puerto 5173 "Libredeuda". Si no se abre, pestaña **Ports** → abrir 5173. Mantener el puerto como **Private** (valor por defecto): solo el dueño del codespace puede acceder con su cuenta de GitHub.

El inicio de sesión local funciona en la dirección `https://<codespace>-5173.app.github.dev` de ese mismo codespace; otras direcciones siguen rechazadas. Los datos y la clave de `.dev.vars` viven dentro del codespace: se conservan al detenerlo, pero se pierden al eliminarlo. Codespaces se detiene tras un período de inactividad y consume horas de la cuota gratuita de GitHub.

## Comprobaciones
```sh
node scripts/verify-export.mjs
node scripts/check-project.mjs
npm run build
```
La verificación del manifiesto corresponde al paquete recién extraído: luego de editar archivos es normal que sus hashes cambien. `npm run lint` es el análisis general existente; puede señalar problemas preexistentes y no forma parte del arranque. `npm run db:generate` genera migraciones tras cambios al esquema; no las aplica por sí solo.

`npm start` usa el build de Cloudflare y NO incluye el middleware de login local de Vite. Para uso local interactivo usar `npm run dev`. En producción se necesitan D1 `DB`, R2 `BUCKET`, `CREDENTIALS_ENCRYPTION_KEY` (32 bytes en base64) y el proxy de autenticación confiable que inyecta los encabezados `oai-authenticated-user-*`. No publicar el Worker directamente confiando en encabezados enviados por el cliente. El proyecto de Sites original se identifica en `.openai/hosting.json`; ese identificador no concede permisos de despliegue. No se incluye una migración a otro proveedor de hosting.

## Alcance del respaldo
Incluye código completo actual, configuraciones, lockfile, migraciones, pruebas, assets y licencias vendorizadas. Excluye `.git`, `node_modules`, builds, cachés, archivos temporales, `.env*`, `.dev.vars*` reales y estado local de D1/R2. Los artefactos históricos de `.sites-runtime` no son las fuentes actuales.

No es una copia de los registros, PDFs o credenciales del servicio publicado. Para trasladarlos hacen falta exportación autorizada de D1 y R2, la clave de cifrado original y conservación/mapeo de los identificadores `owner`. El usuario local es distinto del usuario de producción. No enviar secretos a Claude como texto de contexto.

## Diagnóstico
- `node`/`npm` no reconocido: instalar Node y reabrir la terminal.
- Tablas inexistentes / API 503: detener dev, ejecutar `prepare-local` y reiniciar. Confirmar `.openai/hosting.json` con DB y BUCKET.
- No guarda credenciales: verificar clave base64 de 32 bytes en `.dev.vars` y reiniciar dev.
- Login no funciona: usar localhost, no una IP de la red ni `npm start`.
- Puerto ocupado: `npm run dev -- --port 5174` y abrir el puerto indicado.
- Error del proveedor: revisar cuenta/NIS y credenciales; conservar error explícito, no inventar resultados.
