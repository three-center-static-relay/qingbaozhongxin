import {OPERATIONS as CORE_OPERATIONS,runAdapter as runCore} from "./adapters-core.js";
import {OPERATIONS as EXTRA_OPERATIONS,runAdapter as runExtra} from "./adapters-extra.js";
import {OPERATIONS as EXTRA2_OPERATIONS,runAdapter as runExtra2} from "./adapters-extra2.js";
import {OPERATIONS as EXTRA3_OPERATIONS,runAdapter as runExtra3} from "./adapters-extra3.js";
import {OPERATIONS as EXTRA4_OPERATIONS,runAdapter as runExtra4} from "./adapters-extra4.js";
import {OPERATIONS as EXTRA5_OPERATIONS,runAdapter as runExtra5} from "./adapters-extra5.js";
import {OPERATIONS as EXTRA6_OPERATIONS,runAdapter as runExtra6} from "./adapters-extra6.js";
import {OPERATIONS as EXTRA7_OPERATIONS,runAdapter as runExtra7} from "./adapters-extra7.js";
export const OPERATIONS={...CORE_OPERATIONS,...EXTRA_OPERATIONS,...EXTRA2_OPERATIONS,...EXTRA3_OPERATIONS,...EXTRA4_OPERATIONS,...EXTRA5_OPERATIONS,...EXTRA6_OPERATIONS,...EXTRA7_OPERATIONS};
export async function runAdapter(provider,operation,args,env){
  if(EXTRA7_OPERATIONS[provider]?.includes(operation))return runExtra7(provider,operation,args,env);
  if(EXTRA6_OPERATIONS[provider]?.includes(operation))return runExtra6(provider,operation,args,env);
  if(EXTRA5_OPERATIONS[provider]?.includes(operation))return runExtra5(provider,operation,args,env);
  if(EXTRA4_OPERATIONS[provider]?.includes(operation))return runExtra4(provider,operation,args,env);
  if(EXTRA3_OPERATIONS[provider]?.includes(operation))return runExtra3(provider,operation,args,env);
  if(EXTRA2_OPERATIONS[provider]?.includes(operation))return runExtra2(provider,operation,args,env);
  if(EXTRA_OPERATIONS[provider]?.includes(operation))return runExtra(provider,operation,args,env);
  return runCore(provider,operation,args,env);
}
