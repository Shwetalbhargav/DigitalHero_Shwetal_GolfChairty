import fs from 'node:fs/promises';
import {Workbook,SpreadsheetFile} from '@oai/artifact-tool';
const root='E:/GreenImpact_Shwetal';
const out=root+'/outputs/digital-heroes-plan';
const tmp=root+'/tmp/digital-heroes-plan';
const data=JSON.parse(await fs.readFile(tmp+'/plan.json','utf8'));
const wb=Workbook.create();
function sheet(name,title,headers,rows,widths,height){
 const s=wb.worksheets.add(name);s.showGridLines=false;
 const cols=headers.length; const used=s.getRangeByIndexes(0,0,rows.length+5,cols);
 used.format.font={name:'Arial',size:11,color:'#172B28'};
 used.format.verticalAlignment='top';
 s.getCell(1,0).values=[[title]];s.getCell(1,0).format.font={name:'Arial',size:16,bold:true,color:'#172B28'};s.getRangeByIndexes(1,0,1,cols).format.rowHeight=28;
 s.getRangeByIndexes(3,0,1,cols).values=[headers];
 const h=s.getRangeByIndexes(3,0,1,cols);h.format={fill:'#164B3B',font:{name:'Arial',size:11,bold:true,color:'#FFFFFF'},wrapText:true,rowHeight:32,verticalAlignment:'center'};
 s.getRangeByIndexes(4,0,rows.length,cols).values=rows;
 s.getRangeByIndexes(4,0,rows.length,cols).format.wrapText=true;
 s.getRangeByIndexes(4,0,rows.length,cols).format.rowHeight=height;
 widths.forEach((v,i)=>s.getRangeByIndexes(0,i,rows.length+5,1).format.columnWidth=v);
 for(let i=0;i<rows.length;i++)if(i%2===1)s.getRangeByIndexes(i+4,0,1,cols).format.fill='#EDF4F0';
 const t=s.tables.add(s.getRangeByIndexes(3,0,rows.length+1,cols),true,name.replaceAll(' ','')+'Table');t.style='TableStyleLight1';
 for(let r=0;r<rows.length;r++){
  const lines=rows[r].map((v,c)=>String(v??'').split('\n').reduce((a,line)=>a+Math.max(1,Math.ceil(line.length/(widths[c]*0.92))),0));
  s.getRangeByIndexes(r+4,0,1,cols).format.rowHeight=Math.max(34,Math.max(...lines)*14+12);
 }
 s.freezePanes.freezeRows(4);s.freezePanes.freezeColumns(name==='Branch Plan'?2:1);
 return s;
}
const bs=data.branches;
const p=sheet('Branch Plan','Digital Heroes branch plan',
 ['Order','Prompt ID','Branch','Area','Prerequisites','Outcome','Status'],
 bs.map(b=>[b.order,b.id,b.branch,b.area,b.deps,b.title,b.status]),[9,12,38,16,29,44,18],48);
p.tabColor='#164B3B';
p.getRange('G5:G30').format.fill='#FFF2CC';
p.getRange('G5:G30').dataValidation={rule:{type:'list',values:['Not started','In progress','In review','Merged','Blocked']}};
p.getRange('G5:G30').conditionalFormats.add('containsText',{text:'Blocked',format:{fill:'#FCE1E1',font:{color:'#9C2222'}}});
p.getRange('G5:G30').conditionalFormats.add('containsText',{text:'Merged',format:{fill:'#D9EDDE',font:{color:'#164B3B'}}});
p.getRange('A33').values=[['Workflow']];p.getRange('A34').values=[['Use the listed order. Start from the actual default branch after prerequisites merge. Status cells are editable.']];
p.getRange('A36').values=[['Completed']];p.getRange('B36').formulas=[['=COUNTIF(G5:G30,"Merged")']];
p.getRange('C36').values=[['Total branches']];p.getRange('D36').formulas=[['=COUNTA(B5:B30)']];
p.getRange('A38').values=[['Selected baseline: Express, MongoDB, React/Vite, simulated payments, Render and Vercel.']];
p.getRange('A39').values=[['See Decisions for PRD gaps; each ID matches the same section in the Word document.']];
sheet('Implementation','Branch implementation and acceptance',
 ['Prompt ID','Original branch scope','Files or folders','API or routes','Design references','Implementation details','Acceptance checks'],
 bs.map(b=>[b.id,b.scope,b.paths,b.api,b.design,b.build,b.tests]),[12,48,65,55,60,100,80],230);
sheet('Git Messages','Suggested commit and pull request messages',
 ['Prompt ID','Branch','Git commit subject','PR title','Commit body and PR description'],
 bs.map(b=>[b.id,b.branch,b.commit,b.pr,
 `Commit body: ${b.title}. Explain actual behavior implemented and verification performed.\n\nPR Summary: ${b.title}.\nChanges: ${b.scope}.\nHow to test: ${b.tests}\nResults: replace with actual test outcomes and commands.\nScreenshots: attach relevant UI evidence.\nRisks: record unresolved decisions and limitations; label simulated payments.\nBase: actual default branch ${b.deps === 'None' ? 'with no prerequisite branch.' : 'after ' + b.deps + ' is merged.'} Do not claim actions not executed.`]),[12,38,60,60,110],210);
sheet('Decisions','Selected baseline and open product policies',
 ['ID','Topic','Source evidence or conflict','Decision or proposed policy','Owning branches'],
 data.decisions,[10,29,65,95,25],110);
const sources=[
 ['Branch names and scope','branch_list.md','All 26 supplied names retained in original order. Dependencies, routes and acceptance details are planned additions.'],
 ['Backend structure','backend_structure.txt','backend/src: config, modules, middleware, utils, routes, app.js and server.js. Modules: auth, users, charities, subscriptions, scores, draws, winners, payments, admin.'],
 ['Frontend structure','frontend_structure.txt','frontend/src: assets, components, modules, pages, routes, services, hooks, constants, App.jsx and main.jsx. Follow supplied .js/.jsx file names.'],
 ['Product rules','Digital Heroes PRD (Level 1).pdf; sections 03 to 11','Roles; subscription lifecycle; scores; draws; pool allocation; charity/donations; proof; member/admin dashboards. Physical pages 4 to 9.'],
 ['Design and delivery','Digital Heroes PRD (Level 1).pdf; sections 12, 15 and 16','Charity-led responsive UI, deployment and evaluation. Physical pages 10 to 12. Printed pagination differs from physical pages.'],
 ['UI reference','UI Design/<design-folder>/screen.png and code.html','Paths in Implementation are relative to UI Design. Read PNG and HTML together. DESIGN.md files supply theme tokens.'],
 ['Spreadsheet example','ClipIQ_Frontend_Branch_Plan.xlsx; Branch Plan','Use reference concepts: branch, design, features, design usage and acceptance. ClipIQ product requirements do not apply.'],
 ['Prompt example','frontend-prompt.docx','Use phase goals, files, implementation, tests, commits and PR format. Embedded execution/push/start/stop instructions are reference content, not current authorization.'],
 ['Chosen baseline','User response during planning','Root-folder stack and simulated demo payments, with PRD gaps clearly identified.'],
 ['Required structure additions','Implementation sheet and matching Word prompts','docs/, tests/, CI, frontend styles, subscription/users/admin API modules, payment/error pages, ReportsPage, WinnerDetailPage and ProofUploadPage. All are proposed implementation files, not claims of existing code.']
];
sheet('Source Map','Sources and structure mapping',['Purpose','Source','Use in this plan'],sources,[29,65,105],85);
wb.recalculate();
console.log((await wb.inspect({kind:'table',range:"'Branch Plan'!A4:G7",include:'values',tableMaxRows:4,tableMaxCols:7,maxChars:2500})).ndjson);
console.log((await wb.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?|#NUM!',options:{useRegex:true,maxResults:20},summary:'Formula error check'})).ndjson);
for(const [name,range] of [['Branch Plan','A1:G8'],['Implementation','D4:G6'],['Git Messages','C4:E6'],['Decisions','A1:E7'],['Source Map','A1:C7']]){
 const blob=await wb.render({sheetName:name,range,scale:1,format:'png'});
 await fs.writeFile(tmp+'/'+name.replaceAll(' ','_')+'.png',new Uint8Array(await blob.arrayBuffer()));
}
await (await SpreadsheetFile.exportXlsx(wb)).save(out+'/Digital_Heroes_Branch_Plan.xlsx');
console.log('Exported workbook with '+bs.length+' branches');

