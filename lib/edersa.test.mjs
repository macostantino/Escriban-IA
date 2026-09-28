import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseEdersa,consultEdersa} from './edersa.ts';
const invoice=(balance,paid='N')=>({Campo1Titulo:'Fecha',Campo1Valor:'01/09/26',Campo2Titulo:'Comprobante',Campo2Valor:'FC B-0001-12345',Campo3Titulo:'Fecha Vto',Campo3Valor:'10/09/26',Campo7Titulo:'Saldo',Campo7Valor:'$ '+balance,Campo9Titulo:'Pagado',Campo9Valor:paid,Campo10Titulo:'Estado',Campo10Valor:paid==='S'?'Pagado':'Pendiente',Identificador:'test-id'});
const response=(bills,count,total)=>({vSALWSCONSULTAFACTURAS:{TextoEncabezado:'Cliente: 231287/1\nDetalle de deuda desde el 14/09/21',Facturas:bills,TextoPie:`Cant. comprobantes adeudados: ${count} - Importe Adeudado: $${total}`}});
test('excludes paid history and confirms zero only with official totals',()=>{const r=parseEdersa(response([invoice('0.00','S')],0,'0.00'),'92312870001');assert.equal(r.total,0);assert.deepEqual(r.bills,[])});
test('returns outstanding balance and original identifier',()=>{const r=parseEdersa(response([invoice('1234.56')],1,'1234.56'),'92312870001');assert.equal(r.bills[0].amount,1234.56);assert.equal(r.bills[0].due,'2026-09-10');assert.equal(r.originals.get(r.bills[0].number),'test-id')});
test('rejects missing confirmation, another NIS, contradictory status and incomplete detail',()=>{assert.throws(()=>parseEdersa({},'92312870001'));assert.throws(()=>parseEdersa(response([],0,'0.00'),'90000000001'));assert.throws(()=>parseEdersa(response([invoice('10','S')],1,'10'),'92312870001'));assert.throws(()=>parseEdersa(response([],1,'10'),'92312870001'))});
test('rejects invalid NIS before accessing provider',async()=>{await assert.rejects(consultEdersa('300-231287-1',{}),/11 dígitos/)});
