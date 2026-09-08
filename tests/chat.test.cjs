const {test}=require('node:test');
const assert=require('node:assert/strict');
const {loadTs}=require('./load-ts.cjs');
const coerce=loadTs('src/lib/ai/coerce.ts');
test('future workout dates remain distinct; invalid dates never default to today',()=>{
 assert.equal(coerce.parseDateOrToday('2099-01-02').toISOString(),'2099-01-02T00:00:00.000Z');
 assert.throws(()=>coerce.parseDateOrToday('2026-02-31'));
 assert.equal(coerce.parseDateOrToday(null).getUTCHours(),0);
 assert.equal(coerce.numberInRange(' ',0,100),null);
});
function fixture(fail=false){
 let updated=0,created=0,locked=0;
 const tx={ $queryRaw:async()=>{locked++}, workout:{findFirst:async()=>({id:7}),update:async(args)=>{ assert.equal(args.where.profileId,'test-owner'); assert.deepEqual(args.data.exercises.deleteMany,{}); if(fail)throw Error('db');updated++ },create:async()=>{created++}}};
 const {executeToolCall}=loadTs('src/lib/ai/assistant-tools.ts',{'@/lib/prisma':{prisma:{$transaction:async fn=>fn(tx)}},'next/cache':{revalidatePath(){}},'@/lib/goal-live-value':{}});
 return {executeToolCall,counts:()=>({updated,created,locked})};
}
test('replacement updates existing workout within locked transaction',async()=>{
 const f=fixture();const result=await f.executeToolCall('registrar_treino',{nome:'Treino A',data:'2099-01-02',exercicios:[{nome:'Supino',series:3}]},{profileId:'test-owner'});
 assert.equal(result.ok,true); assert.deepEqual(f.counts(),{updated:1,created:0,locked:1});
});
test('malformed exercise objects and missing required names never access database',async()=>{
 const f=fixture();
 for(const args of [{nome:'A',exercicios:['Supino']},{exercicios:[]},null,[]])assert.equal((await f.executeToolCall('registrar_treino',args,{profileId:'test-owner'})).ok,false);
 assert.deepEqual(f.counts(),{updated:0,created:0,locked:0});
});
