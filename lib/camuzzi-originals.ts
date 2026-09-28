import {z} from 'zod';
import {parseCamuzzi} from './camuzzi';
const root='https://gatewayov.camuzzigas.com.ar';
export type OriginalFile={number:string;bytes:Uint8Array};
export async function camuzziOriginals(account:string,wanted:string[],budget=12_000_000){
 const missing:{number:string;reason:string}[]=[];const files:OriginalFile[]=[];
 const response=await fetch(root+'/api/Suministro/GetForBusquedaByNumeroCuenta?NumeroCuenta='+encodeURIComponent(account)+'&conDeuda=true',{signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error('Camuzzi no respondió.');const raw=await response.json();const fresh=parseCamuzzi(raw,account);
 const entries=z.object({Suministros:z.array(z.object({CuentaUnificada:z.string(),IdSuministro:z.number().int().positive()}))}).parse(raw);const supply=entries.Suministros.find(x=>x.CuentaUnificada===account);if(!supply)throw Error('Cuenta no encontrada.');
 const list=await fetch(root+'/api/v2/Suministro/'+supply.IdSuministro+'/ListaComprobantes',{signal:AbortSignal.timeout(15000)});if(!list.ok)throw Error('No se pudo obtener la lista de boletas.');
 const data=z.object({results:z.array(z.object({NumeroFactura:z.string(),TipoDocumento:z.string(),ComprobanteHabilitado:z.boolean()}))}).parse(await list.json());
 for(const number of [...new Set(wanted)]){try{
  if(!fresh.bills.some(x=>x.number===number))throw Error('La boleta no figura como pendiente disponible en la consulta actual.');
  const record=data.results.find(x=>x.NumeroFactura===number);if(!record?.ComprobanteHabilitado)throw Error('Camuzzi todavía no habilitó la boleta original.');
  if(!/^\d+-\d+\/\d+$/.test(number)||! /^[A-Z]{1,5}$/.test(record.TipoDocumento))throw Error('Identificador de boleta no válido.');
  if(files.length>=20||budget<=0)throw Error('Límite del archivo conjunto alcanzado. Descargá esta boleta individualmente.');
  const pdf=await fetch(root+'/api/'+number+'/'+record.TipoDocumento+'/comprobante',{headers:{Accept:'application/pdf'},redirect:'manual',signal:AbortSignal.timeout(20000)});if(!pdf.ok||!pdf.body)throw Error('No se pudo descargar el original.');
  const reader=pdf.body.getReader(),chunks:Uint8Array[]=[];let size=0;while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>Math.min(budget,4_000_000)){await reader.cancel();throw Error('La boleta supera el tamaño permitido para este archivo.')}chunks.push(value)}
  const bytes=new Uint8Array(size);let pos=0;for(const c of chunks){bytes.set(c,pos);pos+=c.length}if(new TextDecoder().decode(bytes.subarray(0,5))!=='%PDF-')throw Error('El proveedor no devolvió un PDF.');budget-=size;files.push({number,bytes});
 }catch(e){missing.push({number,reason:(e as Error).message})}}
 return {files,missing};
}

