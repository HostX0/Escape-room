const { pool } = require("../config/db");
const { mapPgError } = require("./pgError");
function publicError(status, message) { const error = new Error(message); error.status=status;error.publicMessage=message;return error; }
async function transaction(action) {
  const client = await pool.connect();
  try { await client.query("BEGIN"); const result = await action(client); await client.query("COMMIT"); return result; }
  catch (error) { await client.query("ROLLBACK").catch(()=>{}); const mapped=mapPgError(error); throw mapped?publicError(mapped.status,mapped.publicMessage):error; }
  finally { client.release(); }
}
function callback(promise, cb) { promise.then(result=>cb(null,result), error=>cb(error)); }
module.exports={transaction,publicError,callback};
