const { normalizePhone, isValidPhone, isISODateTime } = require("./validators");
const { publicError } = require("./transaction");
function participants(input, primary=true) {
  if (!Array.isArray(input) || !input.length || input.length>8) throw publicError(400,"Participants count must be between 1 and 8");
  const result=input.map(p=>({full_name:String(p?.full_name||"").trim(),phone:normalizePhone(p?.phone),is_primary:p?.is_primary===true}));
  if (result.some(p=>!p.full_name||p.full_name.length>120||!isValidPhone(p.phone))) throw publicError(400,"Participant name or phone is invalid");
  if(new Set(result.map(p=>p.phone)).size!==result.length) throw publicError(409,"Participant phone is duplicated in this booking");
  if(result.filter(p=>p.is_primary).length!==(primary?1:0)) throw publicError(400,primary?"Exactly one primary participant is required":"Cannot add a new primary participant");
  return result;
}
function futureStart(value) {
  if(!isISODateTime(value)||new Date(value).getTime()<=Date.now()) throw publicError(400,"Choose a future booking time with an explicit timezone");
  return new Date(value).toISOString();
}
function dateBounds(value) {
  if(typeof value!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(value)||Number.isNaN(Date.parse(value+"T00:00:00Z"))||new Date(value+"T00:00:00Z").toISOString().slice(0,10)!==value) throw publicError(400,"date must be a valid YYYY-MM-DD");
  const start=new Date(value+"T00:00:00+03:00");return [start,new Date(start.getTime()+86400000)];
}
module.exports={participants,futureStart,dateBounds};
