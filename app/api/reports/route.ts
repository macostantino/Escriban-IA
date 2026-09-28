import {queryProvider} from '../../../lib/provider-query';
import {EdersaError} from '../../../lib/edersa';


import {PDFDocument} from 'pdf-lib';

import {env} from 'cloudflare:workers';

import {getChatGPTUser} from '../../chatgpt-auth';



import {buildReportPdf} from '../../../lib/report-pdf';

import {locationOf} from '../../../lib/locations';

import {providerNames,type DebtReport,type ReportItem} from '../../../lib/report-types';

import {z} from 'zod';

export async function GET(req:Request){const u=await getChatGPTUser();if(!u)return Response.json({error:'Ingresá con ChatGPT.'},{status:401});try{if(!env.DB)throw Error();const progressId=new URL(req.url).searchParams.get('progress');if(progressId){const row=await env.DB.prepare('SELECT data,pdf_key FROM reports WHERE id=? AND owner=?').bind(progressId,u.userId).first<{data:string;pdf_key:string}>();const data=row?JSON.parse(row.data):{};return Response.json(row?.pdf_key?{percent:100,label:'Consulta completada'}:data.progress||{percent:0,label:'Preparando consulta'},{headers:{'Cache-Control':'no-store'}})}const groupId=new URL(req.url).searchParams.get('groupId');const rows=await env.DB.prepare("SELECT id,created,data FROM reports WHERE owner=? AND group_id=? AND pdf_key<>'' ORDER BY created DESC LIMIT 50").bind(u.userId,groupId||'').all<{id:string;created:string;data:string}>();return Response.json(rows.results.map(x=>{const data=JSON.parse(x.data) as DebtReport;return {id:x.id,created:x.created,name:data.name,count:data.items.length,pending:data.items.filter(i=>i.status!=='ok').length,originals:data.originals?.map((f,index)=>({number:f.number,provider:f.provider,index}))||[],originalsAvailable:!!data.originalsPdfKey,originalsMissing:data.originalsMissing||[],total:data.items.reduce((n,i)=>n+(i.status==='ok'?i.total||0:0),0)}}),{headers:{'Cache-Control':'no-store'}})}catch{return Response.json({error:'No se pudo cargar el historial.'},{status:503})}}

export async function POST(req:Request){let reserved=false;let reservationId='';let objectKey='';const attachmentKeys:string[]=[];const u=await getChatGPTUser();if(!u)return Response.json({error:'Ingresá con ChatGPT.'},{status:401});if(req.headers.get('origin')!==new URL(req.url).origin)return Response.json({error:'Origen no permitido.'},{status:403});try{

 const input=z.object({id:z.string().uuid(),groupId:z.string().uuid()}).parse(await req.json());if(!env.DB||!env.BUCKET)throw Error('storage');

 const existing=await env.DB.prepare('SELECT id,pdf_key FROM reports WHERE id=? AND owner=?').bind(input.id,u.userId).first<{id:string;pdf_key:string}>();if(existing)return existing.pdf_key?Response.json({id:input.id}):Response.json({error:'Esta consulta todavía está en proceso. Esperá a que termine.'},{status:409});

 const group=await env.DB.prepare('SELECT name FROM dossiers WHERE id=? AND owner=?').bind(input.groupId,u.userId).first<{name:string}>();if(!group)return Response.json({error:'Propiedad no disponible.'},{status:404});

 const rows=await env.DB.prepare('SELECT data FROM supplies WHERE owner=?').bind(u.userId).all<{data:string}>();const supplies=rows.results.map(x=>JSON.parse(x.data)).filter(x=>x.groupId===input.groupId);

 if(!supplies.length)return Response.json({error:'Agregá al menos un suministro a la propiedad.'},{status:400});

 if(supplies.length>30)return Response.json({error:'Cada informe admite hasta 30 suministros. Dividí esta propiedad para consultarlo.'},{status:400});

 await env.DB.prepare('INSERT INTO reports(id,owner,group_id,created,data,pdf_key) VALUES(?,?,?,?,?,?)').bind(input.id,u.userId,input.groupId,new Date().toISOString(),'{}','').run();reserved=true;reservationId=input.id;

 const downloads=new Map<string,Awaited<ReturnType<typeof queryProvider>>['download']>();
 const items:ReportItem[]=[];const progress=async(percent:number,label:string)=>{await env.DB!.prepare('UPDATE reports SET data=? WHERE id=? AND owner=?').bind(JSON.stringify({progress:{percent,label}}),input.id,u.userId).run()};

 // Small batches limit simultaneous requests and avoid marking unsupported providers as paid.

 for(let offset=0;offset<supplies.length;offset+=1){await progress(Math.floor(offset/supplies.length*70),'Consultando '+(supplies[offset].providerName||providerNames[supplies[offset].provider])+'  '+supplies[offset].account);const batch=await Promise.all(supplies.slice(offset,offset+1).map(async s=>{

  const base:ReportItem={id:s.id,provider:s.providerName||providerNames[s.provider]||s.provider,account:s.account,property:s.property,...locationOf(s),status:'unsupported',message:'La consulta automática de este organismo no está integrada. Verificar en su portal oficial.',bills:[],total:null,source:''};

  if(!['gas','luz'].includes(s.provider))return base;

  try{const result=await queryProvider(s.provider,s.account,async(p,label)=>progress(Math.floor((offset+p/100)/supplies.length*70),label));const fresh=result.data;downloads.set(s.id,result.download);await env.DB!.prepare('UPDATE supplies SET data=? WHERE id=? AND owner=?').bind(JSON.stringify({...s,...fresh}),s.id,u.userId).run();return {...base,status:'ok' as const,bills:fresh.bills,total:fresh.total,message:fresh.total===0?'No tiene deuda pendiente':fresh.note,source:result.source}}catch(e){return {...base,status:'error' as const,message:e instanceof EdersaError?e.message:'No se pudo consultar al proveedor. No se reutilizaron importes anteriores; reintentá la consulta.'}}

 }));items.push(...batch)}

 await progress(70,'Consultas finalizadas  descargando boletas originales');

 const report:DebtReport={id:input.id,groupId:input.groupId,name:group.name,created:new Date().toISOString(),items};report.originals=[];report.originalsMissing=[];let budget=12_000_000;const originalBytes:Uint8Array[]=[];

 for(const item of items){if(item.status!=='ok'||!item.bills.length)continue;const download=downloads.get(item.id);if(!download)continue;try{const originals=await download(item.bills.map(b=>b.number),budget);for(const file of originals.files){const key='reports/'+u.userId+'/'+input.id+'/original-'+report.originals.length+'.pdf';await env.BUCKET.put(key,file.bytes,{httpMetadata:{contentType:'application/pdf'}});attachmentKeys.push(key);report.originals.push({number:file.number,provider:item.provider,key});originalBytes.push(file.bytes);budget-=file.bytes.length}report.originalsMissing.push(...originals.missing.map(m=>({...m,provider:item.provider})))}catch{report.originalsMissing.push(...item.bills.map(b=>({number:b.number,provider:item.provider,reason:'No se pudo descargar el original desde el proveedor.'})))}}

 if(originalBytes.length){try{let combined:Uint8Array;if(originalBytes.length===1)combined=originalBytes[0];else{const merged=await PDFDocument.create();for(const data of originalBytes){const source=await PDFDocument.load(data);if(merged.getPageCount()+source.getPageCount()>100)throw Error('Demasiadas páginas');const pages=await merged.copyPages(source,source.getPageIndices());pages.forEach(p=>merged.addPage(p))}combined=await merged.save()}const key='reports/'+u.userId+'/'+input.id+'/boletas-originales.pdf';await env.BUCKET.put(key,combined,{httpMetadata:{contentType:'application/pdf'}});attachmentKeys.push(key);report.originalsPdfKey=key}catch{report.originalsMissing.push({number:'Archivo conjunto',provider:'Documentos',reason:'No se pudieron unir las boletas. Descargá los originales individualmente.'})}}

 await progress(90,'Guardando informe y boletas');const bytes=await buildReportPdf(report);const key='reports/'+u.userId+'/'+input.id+'.pdf';objectKey=key;await env.BUCKET.put(key,bytes,{httpMetadata:{contentType:'application/pdf'}});

 await env.DB.prepare('UPDATE reports SET created=?,data=?,pdf_key=? WHERE id=? AND owner=?').bind(report.created,JSON.stringify(report),key,report.id,u.userId).run();reserved=false;

 const fingerprint=(r:DebtReport)=>JSON.stringify(r.items.map(i=>({id:i.id,account:i.account,status:i.status,total:i.total,bills:[...i.bills].sort((a,b)=>a.number.localeCompare(b.number))})).sort((a,b)=>a.id.localeCompare(b.id)));const older=await env.DB.prepare("SELECT id,data,pdf_key FROM reports WHERE owner=? AND group_id=? AND id<>? AND pdf_key<>''").bind(u.userId,input.groupId,input.id).all<{id:string;data:string;pdf_key:string}>();for(const old of older.results){try{const previous=JSON.parse(old.data) as DebtReport;if(fingerprint(previous)!==fingerprint(report)||JSON.stringify((previous.originals||[]).map(f=>f.number).sort())!==JSON.stringify((report.originals||[]).map(f=>f.number).sort()))continue;await env.DB.prepare('DELETE FROM reports WHERE id=? AND owner=?').bind(old.id,u.userId).run();const keys=[old.pdf_key,...(previous.originals||[]).map(f=>f.key),...(previous.originalsPdfKey?[previous.originalsPdfKey]:[])];await env.BUCKET.delete(keys)}catch{}}

 return Response.json({id:report.id,pending:items.filter(i=>i.status!=='ok').length},{headers:{'Cache-Control':'no-store'}})

 }catch{if(reserved){try{if(objectKey)await env.BUCKET?.delete(objectKey);if(attachmentKeys.length)await env.BUCKET?.delete(attachmentKeys);await env.DB?.prepare("DELETE FROM reports WHERE id=? AND owner=? AND pdf_key=''").bind(reservationId,u.userId).run()}catch{}}return Response.json({error:'No se pudo guardar el informe PDF. Reintentá la consulta; no se generó un informe confirmado.'},{status:503})}}



