# Libredeuda

Aplicación privada para organizar suministros por provincia, ciudad y expediente con nombre.

- El usuario puede crear expedientes, asignar cuentas existentes y registrar nuevos suministros en un expediente.
- Consultar un expediente obtiene resultados actuales de sus conexiones disponibles. Camuzzi funciona mediante el servicio público oficial. Los demás organismos se marcan como pendientes, sin inventar datos ni reutilizar importes anteriores en el informe.
- Cada consulta guarda una instantánea en D1 y un PDF en R2, ambos privados por usuario. El historial permite descargar PDFs para adjuntarlos a un correo; no se envían correos desde la aplicación.
- Se guardan las boletas originales de Camuzzi sin modificar, un PDF conjunto con sus páginas y el informe de resumen por separado. Solo se descargan comprobantes habilitados y coincidentes con las facturas pendientes de la cuenta consultada. Los otros organismos continúan pendientes de integración. Ninguno de estos archivos constituye un certificado oficial de libre deuda.
- No se ingresan fechas. El proveedor informa vencimientos y el servidor registra la fecha de consulta.
- Camuzzi excluye liquidaciones que el propio servicio marca MOSTRARLIQ2=N. No se aplica filtro de fechas ni límite de antigüedad.

Pruebas realizadas: TypeScript, build de producción, parser Camuzzi, guardado y lectura de ubicaciones, consulta de expediente con resultado parcial, descarga PDF, historial, rechazo sin autenticación y revisión visual de PDF simple y de varias páginas. WebMCP read_supply_results recupera suministros, expedientes e historial seleccionado.

