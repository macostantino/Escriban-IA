import {getChatGPTUser} from '../app/chatgpt-auth';
import {readCredentials} from './credentials';
import {env} from 'cloudflare:workers';
import {parseCamuzzi} from './camuzzi';
import {camuzziOriginals} from './camuzzi-originals';
import {consultEdersa} from './edersa';
export async function queryProvider(provider:string,account:string,progress?: (percent:number,label:string)=>Promise<void>){
 if(provider==='luz'){const secrets=env as unknown as Record<string,string>;const user=await getChatGPTUser();if(!user)throw Error('Ingresá con ChatGPT.');const saved=await readCredentials(user.userId);const {originals,download,...data}=await consultEdersa(account,saved||{email:secrets.EDERSA_EMAIL,password:secrets.EDERSA_PASSWORD},progress);return {data,download,source:'https://tramites.edersa.com.ar/OFICINA_VIRTUAL_PROD_EDERSA/servlet/com.oficinavirtual.login'}}
 if(provider!=='gas'||!/^\d{17}$/.test(account))throw Error('Suministro no compatible.');
 await progress?.(20,'Consultando Camuzzi '+account);const response=await fetch('https://gatewayov.camuzzigas.com.ar/api/Suministro/GetForBusquedaByNumeroCuenta?NumeroCuenta='+encodeURIComponent(account)+'&conDeuda=true',{headers:{Accept:'application/json'},signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error('Camuzzi no respondió.');const data=parseCamuzzi(await response.json(),account);await progress?.(85,'Verificando facturas de '+account);return {data,download:(numbers:string[],budget?:number)=>camuzziOriginals(account,numbers,budget),source:'https://oficinavirtual.camuzzigas.com.ar/busqueda-suministro'};
}
