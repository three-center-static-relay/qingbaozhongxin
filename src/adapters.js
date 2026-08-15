import {OPERATIONS as CORE_OPERATIONS,runAdapter as runCore} from "./adapters-core.js";
import {OPERATIONS as EXTRA_OPERATIONS,runAdapter as runExtra} from "./adapters-extra.js";
import {OPERATIONS as EXTRA2_OPERATIONS,runAdapter as runExtra2} from "./adapters-extra2.js";
import {OPERATIONS as EXTRA3_OPERATIONS,runAdapter as runExtra3} from "./adapters-extra3.js";
import {OPERATIONS as EXTRA4_OPERATIONS,runAdapter as runExtra4} from "./adapters-extra4.js";
export const OPERATIONS={...CORE_OPERATIONS,...EXTRA_OPERATIONS,...EXTRA2_OPERATIONS,...EXTRA3_OPERATIONS,...EXTRA4_OPERATIONS};
export async function runAdapter(provider,operation,args,env){
  if(EXTRA4_OPERATIONS[provider]?.includes(operation))return runExtra4(provider,operation,args,env);
  if(EXTRA3_OPERATIONS[provider]?.includes(operation))return runExtra3(provider,operation,args,env);
  if(EXTRA2_OPERATIONS[provider]?.includes(operation))return runExtra2(provider,operation,args,env);
  if(EXTRA_OPERATIONS[provider]?.includes(operation))return runExtra(provider,operation,args,env);
  return runCore(provider,operation,args,env);
}
