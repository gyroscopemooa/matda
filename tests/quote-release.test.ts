import test from "node:test";
import { execFileSync } from "node:child_process";
test("Phase 1 keeps every Phase 2 mutation and future route closed", () => {
  execFileSync(
    process.execPath,
    [
      "--import",
      "tsx",
      "--eval",
      `
    const assert=require('node:assert/strict');
    const {act}=require('./src/lib/domain.ts');
    const {flags,isReleasedPath}=require('./src/lib/config.ts');
    const user={id:'user',name:'고객',role:'customer'};
    const db={users:[user],rows:[],sessions:[]};
    assert.equal(flags.quotes,false);
    for(const action of ['profile.enableProvider','provider.save','template.save','quote.enable','quote.submit','quote.question','quote.answer','quote.select','quote.chat','selection.accept','trade.confirm','review.create'])
      assert.throws(()=>act(db,user,action,{}), /비활성화/);
    assert.equal(isReleasedPath('/community'),true);
    for(const path of ['/quotes','/quotes/new','/providers','/biz/rfqs']) assert.equal(isReleasedPath(path),false);
  `,
    ],
    { env: { ...process.env, NEXT_PUBLIC_RELEASE_PHASE: "1" }, stdio: "pipe" },
  );
});
