import {OPERATIONS as CORE_OPERATIONS,runAdapter as runCore} from "./adapters-core.js";
import {OPERATIONS as EXTRA_OPERATIONS,runAdapter as runExtra} from "./adapters-extra.js";
export const OPERATIONS={...CORE_OPERATIONS,...EXTRA_OPERATIONS};
export async function runAdapter(provider,operation,args,env){
  if(EXTRA_OPERATIONS[provider]?.includes(operation))return runExtra(provider,operation,args,env);
  return runCore(provider,operation,args,env);
}
