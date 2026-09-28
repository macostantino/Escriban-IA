import {PDFDocument,StandardFonts,rgb} from 'pdf-lib';
import type {DebtReport} from './report-types';
export async function buildReportPdf(report:DebtReport){
 const doc=await PDFDocument.create();doc.setTitle('Informe de deuda - '+report.name);doc.setAuthor('Libredeuda');doc.setCreationDate(new Date(report.created));
 const regular=await doc.embedFont(StandardFonts.Helvetica),bold=await doc.embedFont(StandardFonts.HelveticaBold);
 const ink=rgb(.09,.18,.24),muted=rgb(.36,.44,.5),teal=rgb(.06,.46,.42),light=rgb(.93,.96,.97);
 let page=doc.addPage([595.28,841.89]),y=785;const margin=44,width=507;
 const clean=(text:string)=>Array.from(text.replace(/[\u2010-\u2015]/g,'-')).map(c=>{try{regular.encodeText(c);return c}catch{return '?'}}).join('');
 function header(){page.drawRectangle({x:0,y:816,width:595.28,height:26,color:teal});page.drawText('LIBREDEUDA / INFORME DE CONSULTA',{x:margin,y:786,size:10,font:bold,color:teal});y=757}
 function next(){page=doc.addPage([595.28,841.89]);header()}
 function ensure(height:number){if(y-height<65)next()}
 function lines(text:string,size:number,maxWidth:number){const result:string[]=[];for(const paragraph of clean(text).split('\n')){let line='';for(const word of paragraph.split(/\s+/)){const candidate=line?line+' '+word:word;if(bold.widthOfTextAtSize(candidate,size)<=maxWidth){line=candidate;continue}if(line)result.push(line);line='';for(const char of word){if(bold.widthOfTextAtSize(line+char,size)>maxWidth){result.push(line);line=''}line+=char}}result.push(line)}return result}
 function write(text:string,size=11,heavy=false,color=ink){for(const line of lines(text,size,width)){ensure(size+7);page.drawText(line,{x:margin,y,size,font:heavy?bold:regular,color});y-=size+6}}
 const money=(value:number)=>new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS'}).format(value);
 const dated=(s:string)=>s.split('-').reverse().join('/');
 header();write(report.name,22,true);write('Facturas pendientes por suministro',13,false,muted);
 write('Consulta: '+new Date(report.created).toLocaleString('es-AR',{timeZone:'America/Argentina/Buenos_Aires'})+' (Argentina)',10,false,muted);y-=12;
 const ok=report.items.filter(x=>x.status==='ok'),pending=report.items.length-ok.length;
 write('RESULTADO '+(pending?'PARCIAL':'DE LA CONSULTA'),11,true,teal);
 write(ok.length+' de '+report.items.length+' servicios consultados. '+pending+' pendientes de verificación.',11);
 write(ok.length?'Total de facturas pendientes obtenidas: '+money(ok.reduce((n,x)=>n+(x.total||0),0)):'Sin importes verificados en esta consulta',15,true);y-=8;
 write('Incluye facturas vigentes y vencidas disponibles en los proveedores consultados. Los servicios sin conexión o con error no se cuentan como deuda cero. Este informe no es un certificado oficial de libre deuda.',10,false,muted);y-=12;
 for(const [index,item] of report.items.entries()){
  ensure(145);page.drawRectangle({x:margin-8,y:y-7,width:width+16,height:27,color:light});write((index+1)+'. '+item.provider,13,true);y-=6;
  write(item.property,11,true);write(item.city+', '+item.province,10,false,muted);write('Suministro / partida: '+item.account,10);
  write(item.status==='ok'?'Consulta completada':'PENDIENTE - '+(item.status==='unsupported'?'Sin conexión automática':'Error de consulta'),10,true,item.status==='ok'?teal:rgb(.65,.32,.08));
  write(item.message,10,false,muted);
  if(item.status==='ok'){
   if(!item.bills.length)write('El proveedor no informó facturas pendientes.',11);
   else for(const b of item.bills){ensure(62);write('Factura '+b.number+' | Período '+b.period,11,true);write('Vence: '+dated(b.due)+' | '+(b.due<new Date(report.created).toLocaleDateString('en-CA',{timeZone:'America/Argentina/Buenos_Aires'})?'Vencida':'Vigente')+' | '+money(b.amount),11);y-=3}
   write('Subtotal: '+money(item.total||0),12,true);
  }
  if(item.source)write('Fuente: '+item.source,8,false,muted);y-=18;
 }
 for(const [i,p] of doc.getPages().entries()){p.drawLine({start:{x:margin,y:49},end:{x:551,y:49},thickness:.5,color:rgb(.8,.85,.88)});p.drawText('Informe informativo - No acredita libre deuda',{x:margin,y:33,size:8,font:regular,color:muted});p.drawText((i+1)+' / '+doc.getPageCount(),{x:515,y:33,size:8,font:regular,color:muted})}
 return doc.save();
}

