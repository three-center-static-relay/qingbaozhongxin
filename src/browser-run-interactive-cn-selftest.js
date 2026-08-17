import { launch } from "@cloudflare/playwright";

const TARGETS=Object.freeze({pagination:"https://tjj.fujian.gov.cn/xxgkzl/ndbg/",search:"https://sousuo.www.gov.cn/sousuo/search.shtml?code=17da70961a7&dataTypeId=107",login:"https://login.gjzwfw.gov.cn/tacs-uc/login/index"});
const TEST_QUERY="人工智能";
const DUMMY_USER="browser-run-test-user";
const DUMMY_PASSWORD="BrowserRun_Test_123!";
const DUMMY_CAPTCHA="TEST";
const clean=s=>String(s||"").replace(/\s+/g," ").trim();
async function firstVisible(locator,max=12){const n=Math.min(await locator.count(),max);for(let i=0;i<n;i++){const x=locator.nth(i);if(await x.isVisible().catch(()=>false))return x}return null}
async function bodyText(page){return clean((await page.locator("body").innerText({timeout:5000}).catch(()=>""))).slice(0,12000)}

async function testPagination(page){
  const started=Date.now();await page.goto(TARGETS.pagination,{waitUntil:"domcontentloaded",timeout:15000});
  const beforeUrl=page.url(),before=await bodyText(page);let clicked=false,locatorStrategy=null;
  for(const candidate of [page.getByText("下一页>>",{exact:true}),page.getByText("下一页",{exact:true}),page.locator('a:has-text("下一页")')]){const el=await firstVisible(candidate);if(!el)continue;locatorStrategy="semantic-text-next-page";try{await el.click({timeout:6000});clicked=true;await page.waitForTimeout(1200);break}catch{}}
  const afterUrl=page.url(),after=await bodyText(page);
  return{ok:clicked&&(afterUrl!==beforeUrl||after!==before),target:TARGETS.pagination,action:"click-next-page",clicked,locator_strategy:locatorStrategy,before_url:beforeUrl,after_url:afterUrl,content_changed:after!==before,before_marker:/政府信息公开工作年度报告/.test(before),after_marker:/政府信息公开工作年度报告/.test(after),elapsed_ms:Date.now()-started};
}

async function testSearch(page){
  const started=Date.now();await page.goto(TARGETS.search,{waitUntil:"domcontentloaded",timeout:15000});
  const input=await firstVisible(page.locator('input[type="search"],input[type="text"],input:not([type])'),20);
  if(!input)return{ok:false,target:TARGETS.search,action:"fill-and-submit-search",error:"VISIBLE_SEARCH_INPUT_NOT_FOUND",elapsed_ms:Date.now()-started};
  await input.fill(TEST_QUERY,{timeout:5000});const filled=await input.inputValue().catch(()=>"");let submitted=false,submitStrategy="enter";const beforeUrl=page.url();
  try{await input.press("Enter",{timeout:4000});submitted=true}catch{}await page.waitForTimeout(1000);let text=await bodyText(page);
  if(page.url()===beforeUrl&&!text.includes(TEST_QUERY)){for(const candidate of [page.getByRole("button",{name:"开始检索"}),page.getByText("开始检索",{exact:true}),page.locator('input[type="submit"]')]){const el=await firstVisible(candidate);if(!el)continue;try{await el.click({timeout:5000});submitted=true;submitStrategy="semantic-submit-control";await page.waitForTimeout(1200);break}catch{}}text=await bodyText(page)}
  return{ok:filled===TEST_QUERY&&submitted&&(text.includes(TEST_QUERY)||page.url()!==beforeUrl),target:TARGETS.search,action:"fill-and-submit-search",filled_value_matches:filled===TEST_QUERY,submitted,submit_strategy:submitStrategy,result_contains_query:text.includes(TEST_QUERY),result_marker:/搜索结果|相关结果|国务院|中国政府网/.test(text),before_url:beforeUrl,after_url:page.url(),elapsed_ms:Date.now()-started};
}

async function testLoginForm(page){
  const started=Date.now();await page.goto(TARGETS.login,{waitUntil:"domcontentloaded",timeout:15000});
  const user=await firstVisible(page.getByPlaceholder(/用户名|手机号|身份证/),12),password=await firstVisible(page.getByPlaceholder(/请输入密码/),12),captcha=await firstVisible(page.getByPlaceholder(/图形验证码|验证码/),16);const captchaImages=await page.locator('img').count().catch(()=>0);
  let userFilled=false,passwordFilled=false,captchaFieldFilled=false;
  if(user){await user.fill(DUMMY_USER,{timeout:4000});userFilled=(await user.inputValue().catch(()=>""))===DUMMY_USER}
  if(password){await password.fill(DUMMY_PASSWORD,{timeout:4000});passwordFilled=(await password.inputValue().catch(()=>""))===DUMMY_PASSWORD}
  if(captcha){await captcha.fill(DUMMY_CAPTCHA,{timeout:4000});captchaFieldFilled=(await captcha.inputValue().catch(()=>""))===DUMMY_CAPTCHA}
  const text=await bodyText(page);
  return{ok:Boolean(user&&password&&captcha&&userFilled&&passwordFilled&&captchaFieldFilled),target:TARGETS.login,action:"detect-and-fill-login-controls-with-dummy-values-without-submit",login_page_loaded:/个人用户登录|法人用户登录|国家政务服务/.test(text),username_control_found:Boolean(user),password_control_found:Boolean(password),captcha_control_found:Boolean(captcha),captcha_image_candidates:captchaImages,dummy_username_filled:userFilled,dummy_password_filled:passwordFilled,dummy_captcha_field_filled:captchaFieldFilled,captcha_solved:false,login_submitted:false,credentials_real:false,human_in_the_loop_required_for_real_captcha_or_mfa:true,elapsed_ms:Date.now()-started};
}

export async function browserRunInteractiveCnSelftest(env={}){
  const started=Date.now();if(!env?.BROWSER)return{ok:false,selftest:"browser-run-interactive-cn",error:"BROWSER_BINDING_UNAVAILABLE"};let browser;
  try{browser=await launch(env.BROWSER);const page=await browser.newPage();page.setDefaultTimeout(7000);const pagination=await testPagination(page).catch(e=>({ok:false,error:String(e?.message||e),target:TARGETS.pagination}));const search=await testSearch(page).catch(e=>({ok:false,error:String(e?.message||e),target:TARGETS.search}));const login_form=await testLoginForm(page).catch(e=>({ok:false,error:String(e?.message||e),target:TARGETS.login}));const ok=pagination.ok===true&&search.ok===true&&login_form.ok===true;return{ok,selftest:"browser-run-interactive-cn",browser_session:"playwright",actions_verified:["navigate","semantic-element-discovery","click","fill","press-enter","pagination","form-control-detection"],pagination,search,login_form,captcha_policy:"field-fill-only-with-fixed-dummy-value; no solving, bypass, OCR, or login submission",login_policy:"no real credentials; no login submission; human-in-the-loop for real CAPTCHA/MFA",arbitrary_target:false,anti_bot_evasion:false,proxy_rotation:false,elapsed_ms:Date.now()-started}}catch(e){return{ok:false,selftest:"browser-run-interactive-cn",error:"BROWSER_SESSION_EXCEPTION",message:String(e?.message||e).slice(0,500),elapsed_ms:Date.now()-started}}finally{if(browser)await browser.close().catch(()=>{})}
}
