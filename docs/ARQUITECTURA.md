# Referencia técnica por área

## Plataforma
React 19.2.6, Next 16.2.6 APIs sobre Vinext 1.0.0-beta.5, Vite 8, TypeScript, Tailwind 4, componentes shadcn/base-ui/radix. Cloudflare Workers mediante plugin Vite, D1 SQLite y R2. Versiones exactas resueltas en package-lock.json; instalar con npm ci. `build/sites-vite-plugin.ts` es código fuente necesario con licencia MIT adjunta, no un directorio de salida descartable.

## Experiencia
`app/page.tsx` requiere usuario y abre `workspace.tsx`. Propiedades (llamadas dossiers/expedientes en modelo), suministros asignados o sin asignar, filtros por provincia/ciudad, edición/baja, consulta individual con progreso NDJSON, consulta de propiedad, historial y descarga de informes/originales. Baja de suministro conserva informes. `credential-settings.tsx` guarda credenciales. `globals.css`, `layout.tsx`, `public/favicon.svg` definen presentación. No hay backend de Claude ni API de IA para calcular deuda: Claude es la herramienta de desarrollo.

## API (ver archivos para validaciones y contratos exactos)
| Ruta | Métodos y función |
| --- | --- |
| `/api/supplies` | GET lista propia; POST alta/edición; DELETE baja por id |
| `/api/groups` | GET propiedades; POST alta/renombrado `{id,name}` |
| `/api/consult` | POST `{id}` consulta gas/luz; emite líneas `{progress}`, `{result}` o `{error}` |
| `/api/reports` | GET `groupId` historial (hasta 50) o `progress` por id; POST `{id,groupId}` genera informe |
| `/api/reports/[id]` | GET resumen PDF; `kind=originals` conjunto; `original=N` individual |
| `/api/supplies/[id]/original` | GET `number` consulta proveedor y descarga original |
| `/api/credentials` | GET email/configured/updated; POST `{email,password}`, nunca devuelve contraseña |

Autenticación en todos los endpoints; rutas mutadoras verifican Origin. `chatgpt-auth.ts` lee identidad de headers del proxy. El plugin de desarrollo quita headers del cliente y crea identidad local con cookie HttpOnly; no es autenticación de producción.

## Persistencia y contratos
- supplies: id, owner, data JSON (groupId, provider, account, property, province, city, providerName opcional, checked, total, note, bills).
- dossiers: id, owner, name.
- reports: id, owner, group_id, created, data JSON, pdf_key. Mientras genera, pdf_key vacío y data.progress; al confirmar almacena DebtReport.
- credentials: owner, encrypted, updated. AES-GCM 256, IV aleatorio de 12 bytes, AAD ligado a owner y versión. No rotar clave sin plan para recifrar.
- `drizzle/0000..0002` crean las cuatro tablas e índices. APIs usan SQL preparado directamente; `db/index.ts` ofrece Drizzle.
- `lib/report-types.ts`: ReportBill, ReportItem (ok/error/unsupported), DebtReport y nombres de proveedores.

## Consultas
`provider-query.ts` despacha gas a Camuzzi y luz a EdERSA. Otros tipos: agua, rentas, municipio, comercio, otras, personalizado; sus portales pueden abrirse pero no tienen consulta automática.
Camuzzi exige cuenta de 17 dígitos, verifica coincidencia, descarta MOSTRARLIQ2=N, suma facturas visibles, conserva vencidas/vigentes sin rango temporal. `camuzzi-originals.ts` valida pertenencia/habilitación y descarga PDFs.
EdERSA exige NIS de 11 dígitos comenzando en 9, sesión propia de cookies, login con credenciales guardadas o variables del servidor, asociación de NIS si falta, selección y confirmación del cliente. Valida detalle contra cantidad y total oficial, excluye saldo cero/pagados, rechaza contradicciones. Hostnames HTTPS permitidos: tramites.edersa.com.ar y pagos.edersa.com.ar. Conector depende del HTML/GXState del portal.
`locations.ts` contiene provincias y alcance geográfico de enlaces; datos antiguos sin ubicación adoptan Río Negro / General Roca.

## Informes y límites
Máximo 30 suministros por informe. Consulta secuencial actual; cada proveedor fallido queda error y total null, no arrastra deuda vieja. Consulta individual fallida conserva el dato anterior en la ficha. Progreso en D1, leído por UI cada segundo. PDFs originales en R2 por usuario/informe; presupuesto agregado de 12 MB; combinación máxima de 100 páginas. Resumen generado con pdf-lib separado de originales. Archivos inaccesibles quedan en originalsMissing. Reserva por UUID evita repetir un informe confirmado. Limpieza de reserva/objetos ante fallo. Tras confirmar se eliminan informes anteriores equivalentes según fingerprint de cuentas/estados/importes/facturas y números de originales (y sus objetos); el historial no es inmutable.

## Integración con asistentes
`document.modelContext.registerTool` registra opcionalmente `read_supply_results`, solo lectura y sin parámetros: supplies, groups, selectedGroupId, reports cargados. La app no requiere WebMCP para funcionar; disponibilidad depende del navegador/herramienta. No confundir esta lectura con consultar portales.

## Pruebas
`scripts/test-camuzzi.mjs`: identidad, esquema, total, facturas ocultas y ausencia de filtro temporal. `lib/edersa.test.mjs`: identidad/NIS, saldos y confirmación. `lib/credential-crypto.test.mjs`: cifrado, nonce, owner, clave y manipulación. Son offline; no certifican que el portal externo siga funcionando. Para revisión UI usar datos propios autorizados y verificar flujo completo, aislamiento por usuario, errores parciales y descarga PDF.
