import assert from "node:assert/strict";
import {runAdapter} from "../src/adapters.js";
const p="medical_clinical_calculators";
let n=0;
for(let age=20;age<=90;age+=5){
  for(const sex of ["male","female"]){
    let prev=Infinity;
    for(const cr of [0.5,0.7,1,1.3,1.7,2.2,3,4,6,10]){
      const a=await runAdapter(p,"egfr_2021_creatinine",{age_years:age,sex,serum_creatinine:cr,creatinine_unit:"mg/dL"},{});
      const b=await runAdapter(p,"egfr_2021_creatinine",{age_years:age,sex,serum_creatinine:cr*88.4,creatinine_unit:"umol/L"},{});
      assert.equal(a.egfr_ml_min_1_73m2,b.egfr_ml_min_1_73m2,`unit mismatch age=${age} sex=${sex} cr=${cr}`);
      assert.ok(a.egfr_ml_min_1_73m2<=prev+0.11,`eGFR not monotone with creatinine age=${age} sex=${sex}`);
      assert.ok(a.egfr_ml_min_1_73m2>0&&Number.isFinite(a.egfr_ml_min_1_73m2));
      prev=a.egfr_ml_min_1_73m2;n++;
    }
  }
}
for(const [w,h,lo,hi] of [[45,1.75,10,18.5],[60,1.75,18.5,25],[85,1.75,25,30],[110,1.75,30,100]]){
 const b=await runAdapter(p,"bmi",{weight_kg:w,height_m:h},{});assert.ok(b.bmi>=lo&&b.bmi<hi);n++;
}
for(let mask=0;mask<32;mask++){
 const confusion=Boolean(mask&1),urea=(mask&2)?8:5,rr=(mask&4)?30:20,sbp=(mask&8)?85:120,age=(mask&16)?70:50;
 const x=await runAdapter(p,"curb65",{confusion,urea_mmol_l:urea,respiratory_rate:rr,systolic_bp:sbp,diastolic_bp:70,age_years:age},{});
 const expected=(confusion?1:0)+(urea>7?1:0)+(rr>=30?1:0)+(sbp<90?1:0)+(age>=65?1:0);
 assert.equal(x.score,expected);assert.ok(x.score>=0&&x.score<=5);n++;
}
for(let mask=0;mask<8;mask++){
 const rr=(mask&1)?22:18,sbp=(mask&2)?100:120,altered=Boolean(mask&4);
 const q=await runAdapter(p,"qsofa",{respiratory_rate:rr,systolic_bp:sbp,altered_mentation:altered},{});
 const expected=(rr>=22?1:0)+(sbp<=100?1:0)+(altered?1:0);assert.equal(q.score,expected);assert.equal(q.positive_two_or_more,expected>=2);n++;
}
await assert.rejects(()=>runAdapter(p,"egfr_2021_creatinine",{age_years:50,sex:"male",serum_creatinine:0,creatinine_unit:"mg/dL"},{}));
await assert.rejects(()=>runAdapter(p,"egfr_2021_creatinine",{age_years:50,sex:"male",serum_creatinine:3000,creatinine_unit:"umol/L"},{}));
await assert.rejects(()=>runAdapter(p,"qsofa",{respiratory_rate:22,systolic_bp:100},{}));
await assert.rejects(()=>runAdapter(p,"bmi",{weight_kg:-1,height_m:1.7},{}));
console.log(JSON.stringify({ok:true,suite:"medical-calculator-fuzz-20260817",evaluations:n,egfr_unit_pairs:300,curb65_truth_table:32,qsofa_truth_table:8,negative_guards:4}));
