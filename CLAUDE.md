# Escriban-IA / Libredeuda

Proyecto existente: conservar su estructura y comportamiento. La marca visible es Libredeuda. Leer primero este archivo y `docs/EJECUTAR.md`; consultar `docs/ARQUITECTURA.md` solo para la función que se vaya a tocar. No cargar todo el repositorio, el lockfile ni los componentes UI en el contexto.

## Arranque
Node >=22.13 y npm. Desde la raíz: `npm run install:ci`, `node scripts/prepare-local.mjs`, `npm run dev`. Abrir http://localhost:5173. El inicio de sesión local ya está implementado en `build/sites-vite-plugin.ts`; no requiere cuenta ChatGPT real. No sustituir Vinext por Next ni D1/R2 por almacenamiento en memoria.

## Mapa mínimo
- `app/workspace.tsx`: interfaz principal, propiedades, suministros, consultas, historial, WebMCP.
- `app/api/`: endpoints; `app/chatgpt-auth.ts`: identidad; `app/credential-settings.tsx`: credenciales.
- `lib/provider-query.ts`: Camuzzi/EdERSA; `lib/camuzzi*.ts`, `lib/edersa.ts`: conectores.
- `lib/report-types.ts`, `lib/report-pdf.ts`: contratos e informe; `lib/credential*.ts`: bóveda.
- `db/schema.ts`, `drizzle/`: esquema y migraciones. `vite.config.ts`, `build/`, `.openai/hosting.json`: ejecución.
- `components/ui/`, `hooks/`, `vendor/`, `public/`: interfaz reutilizable, estilos y assets.

## Invariantes
Todo dato y PDF pertenece a `owner`; mantener autenticación, filtros de propietario y controles de Origin. Credenciales solo en servidor, AES-GCM, nunca devolver contraseña. Fallo o proveedor no integrado NO significa deuda cero. Informes usan consultas nuevas, no saldos anteriores. Guardar originales sin modificar y resumen por separado. No filtrar facturas por antigüedad ni pedir fechas. No son certificados oficiales. No enviar correos. EdERSA puede asociar un NIS a la cuenta del proveedor durante la consulta; no ejecutar pruebas reales automáticamente.

## Validación
`node scripts/check-project.mjs` ejecuta TypeScript y pruebas offline existentes. `npm run build` verifica compilación. No afirmar validación de proveedores reales sin haberla realizado. El README original quedó desactualizado respecto de EdERSA: prevalecen el código y `docs/ARQUITECTURA.md`.

El ZIP contiene fuentes, no datos de producción ni secretos ni dependencias instaladas. `EXPORT-MANIFEST.json` inventaría archivos con SHA-256. `node scripts/verify-export.mjs` verifica una copia recién extraída. `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/export-project.ps1` regenera el paquete.
