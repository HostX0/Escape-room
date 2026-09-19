const fs=require('fs'),path=require('path'),crypto=require('crypto');
const files={"Amiri-Regular.ttf": "ab391c4147d054c48976e98322ad0eefe1427aa0e0502a12a4c75d80a70cfcd7", "Amiri-Bold.ttf": "cfccb794268e7d573d857e6d6a67f89cf8a053e8ffd85dfa0c8ec1bb36fc4827"};
(async()=>{
 const dir=path.join(__dirname,'..','assets','fonts');fs.mkdirSync(dir,{recursive:true});
 for(const [name,expected] of Object.entries(files)) {
  const destination=path.join(dir,name);
  if(fs.existsSync(destination)&&crypto.createHash('sha256').update(fs.readFileSync(destination)).digest('hex')===expected) continue;
  const response=await fetch('https://raw.githubusercontent.com/google/fonts/main/ofl/amiri/'+name,{signal:AbortSignal.timeout(30000)});
  if(!response.ok) throw Error('Font download failed: '+name);
  const data=Buffer.from(await response.arrayBuffer());
  if(crypto.createHash('sha256').update(data).digest('hex')!==expected) throw Error('Font checksum changed. Review upstream update: '+name);
  fs.writeFileSync(destination,data);
 }
})().catch(error=>{console.error(error.message);process.exitCode=1;});
