const {test}=require('node:test');
const assert=require('node:assert/strict');
const XLSX=require('xlsx');
const {loadTs}=require('./load-ts.cjs');
const extract=loadTs('src/lib/ai/attachment-extract.ts',{'pdf-parse':{PDFParse:class {async getInfo(){return {total:31}} async destroy(){}}}}).extractAttachmentText;
for(const bookType of ['xlsx','xls'])test(`reads ${bookType} using updated SheetJS without touching files`,async()=>{
 const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([['Alimento','Quantidade'],['Arroz','150 g']]),'Dieta');
 const result=await extract(XLSX.write(wb,{type:'buffer',bookType}),`dieta.${bookType}`,'');
 assert.equal(result.ok,true);assert.match(result.text,/Arroz,150 g/);
});
test('rejects excessive spreadsheet dimensions before CSV expansion',async()=>{
 const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(Array.from({length:501},()=>['teste'])),'Dieta');
 const result=await extract(XLSX.write(wb,{type:'buffer',bookType:'xlsx'}),'large.xlsx','');assert.equal(result.ok,false);
});
test('rejects more than 30 PDF pages without text or table extraction',async()=>{
 assert.equal((await extract(Buffer.from('mock'),'large.pdf','application/pdf')).ok,false);
});
