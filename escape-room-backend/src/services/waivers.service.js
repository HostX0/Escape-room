var fs = require("fs");
var path = require("path");
var PDFDocument = require("pdfkit");
var { pool } = require("../config/db");
var { mapPgError } = require("../utils/pgError");
var { insertAuditLog } = require("../utils/auditLog");

var FONT_REGULAR = path.join(__dirname, "..", "..", "assets", "fonts", "Amiri-Regular.ttf");
var FONT_BOLD = path.join(__dirname, "..", "..", "assets", "fonts", "Amiri-Bold.ttf");

var WAIVER_TEXT = [
  "أقر أنا الموقع أدناه بالموافقة على الشروط والأحكام التالية فيما يتعلق بمشاركتي في أنشطة غرفة الهروب التي تديرها إسكيب روم العراق:",
  "",
  "١. الإقرار بالنشاط البدني",
  "أدرك أن أنشطة غرفة الهروب تتضمن تحديات جسدية وذهنية تشمل التنقل في مساحات محدودة والعمل في إضاءة خافتة وحل ألغاز قد تتطلب جهداً بدنياً والعمل تحت ضغط الوقت.",
  "",
  "٢. تحمل المخاطر",
  "أتحمل طوعياً جميع المخاطر المرتبطة بالمشاركة بما في ذلك خطر الإصابات البسيطة أو الضغط النفسي أو تفاقم حالات صحية موجودة مسبقاً. أقر بأن هذه المخاطر متأصلة في طبيعة أنشطة غرفة الهروب ولا يمكن القضاء عليها بالكامل.",
  "",
  "٣. الالتزام بالسلامة",
  "أوافق على اتباع جميع تعليمات وإرشادات السلامة المقدمة من فريق عمل إسكيب روم العراق في جميع الأوقات. أدرك أن عدم الالتزام بقواعد السلامة قد يؤدي إلى إخراجي فوراً من النشاط دون استرداد المبلغ.",
  "",
  "٤. الإقرار الصحي",
  "أؤكد أنني لا أعاني من أي حالة طبية تمنع المشاركة الآمنة بما في ذلك على سبيل المثال لا الحصر: رهاب الأماكن المغلقة الشديد أو أمراض القلب أو الصرع أو أي حالة قد تتأثر بالمجهود البدني أو الأماكن الضيقة أو التغيرات المفاجئة في الإضاءة.",
  "",
  "٥. إخلاء المسؤولية",
  "أعفي إسكيب روم العراق ومالكيها وموظفيها ووكلائها من أي وجميع المسؤوليات أو المطالبات أو الدعاوى الناشئة عن إصابات طفيفة أثناء المشاركة، باستثناء حالات الإهمال الجسيم أو سوء السلوك المتعمد.",
  "",
  "٦. إجراءات الطوارئ",
  "أقر بأنني أُبلغت بمواقع مخارج الطوارئ والإجراءات المتبعة. أدرك أنه يمكنني طلب مغادرة الغرفة في أي وقت وأن فريق العمل سيقدم المساعدة الفورية في حالة الطوارئ.",
  "",
  "٧. حق الإخراج",
  "أدرك أن للإدارة الحق في رفض دخول أو إخراج أي مشارك يبدو تحت تأثير الكحول أو المخدرات أو يتصرف بطريقة غير آمنة أو ينتهك قواعد السلوك.",
  "",
  "٨. الموافقة على التصوير",
  "أمنح إسكيب روم العراق الإذن بالتقاط صور ومقاطع فيديو أثناء مشاركتي لأغراض ترويجية ووسائل التواصل الاجتماعي. يمكنني الانسحاب من ذلك بإبلاغ الموظفين قبل بدء النشاط.",
  "",
  "بتوقيعي أدناه، أؤكد أنني قرأت وفهمت ووافقت طوعياً على جميع الشروط الواردة في هذا التعهد. أقر بأن هذا التعهد ملزم قانونياً.",
].join("\n");

function makePublicError(status, message) {
  var e = new Error(message);
  e.status = status;
  e.publicMessage = message;
  return e;
}

function ensureDir(dirPath, cb) {
  fs.mkdir(dirPath, { recursive: true }, function (err) {
    if (err) return cb(err);
    return cb(null, dirPath);
  });
}

function resolveTemplateVersion(cb) {
  var sql = [
    "SELECT template_version, content",
    "FROM waiver_templates",
    "WHERE active_from<=NOW() AND (active_to IS NULL OR active_to > NOW())",
    "ORDER BY active_from DESC",
    "LIMIT 1",
  ].join(" ");
  pool.query(sql, [], function (err, result) {
    if (err) return cb(err);
    if (result.rows.length === 0) return cb(null, { version: 1, content: null });
    return cb(null, {
      version: result.rows[0].template_version,
      content: result.rows[0].content || null,
    });
  });
}

/**
 * Helper: write Arabic text right-aligned.
 * PDFKit 0.18+ with Amiri font handles Arabic shaping natively.
 * No need for arabic-reshaper or manual reversal.
 */
function arText(doc, text, x, y, opts) {
  opts = opts || {};
  opts.align = opts.align || "right";
  opts.features = ["arab", "liga", "calt", "ccmp", "rlig", "rclt", "curs", "mark", "mkmk"];
  if (y != null) {
    doc.text(text, x, y, opts);
  } else {
    doc.text(text, x, doc.y, opts);
  }
}

/**
 * Build an Arabic-only waiver PDF.
 */
function buildPdf(opts, cb) {
  let called=false; const done=cb; cb=(...args)=>{if(!called){called=true;done(...args);}};
  try {
    var doc = new PDFDocument({ size: "A4", margin: 40, bufferPages: true });
    var stream = fs.createWriteStream(opts.outputPath);
    stream.on("error", function (err) { return cb(err); });
    stream.on("finish", function () { return cb(null); });
    doc.pipe(stream);

    doc.on("error", cb);
    doc.registerFont("Arabic", FONT_REGULAR);
    doc.registerFont("ArabicBold", FONT_BOLD);

    var pageWidth = doc.page.width - 80;
    var left = 40;

    // ─── Top accent bar ───
    doc.rect(left, 35, pageWidth, 4).fill("#4f46e5");

    // ─── Company header ───
    doc.font("ArabicBold").fontSize(20).fillColor("#1e293b");
    arText(doc, "إسكيب روم العراق", left, 55, { width: pageWidth });

    doc.font("Arabic").fontSize(9).fillColor("#94a3b8");
    arText(doc, "Escape Room Iraq", left, null, { width: pageWidth });
    doc.moveDown(0.8);

    // ─── Title ───
    doc.font("ArabicBold").fontSize(16).fillColor("#1e293b");
    arText(doc, "تعهد السلامة الشخصية وإخلاء المسؤولية", left, null, { width: pageWidth });
    doc.moveDown(0.3);

    doc.font("Arabic").fontSize(9).fillColor("#94a3b8");
    arText(doc, "Personal Safety Waiver & Liability Release", left, null, { width: pageWidth });
    doc.moveDown(0.8);

    // ─── Separator ───
    doc.rect(left, doc.y, pageWidth, 1).fill("#e2e8f0");
    doc.moveDown(0.8);

    // ─── Participant info box ───
    var infoY = doc.y;
    var infoH = 112;
    doc.rect(left, infoY, pageWidth, infoH).lineWidth(0.5).strokeColor("#cbd5e1").fillAndStroke("#f8fafc", "#cbd5e1");

    // Name
    doc.fillColor("#1e293b").font("ArabicBold").fontSize(12);
    arText(doc, "الاسم: " + opts.participantName, left + 12, infoY + 12, { width: pageWidth - 24 });

    // Keep numeric/Latin values in their own LTR runs; do not reverse a phone inside Arabic text.
    function numericField(label,value,y) {
      doc.font("Arabic").fontSize(10).fillColor("#475569");
      arText(doc,label,left+pageWidth-86,y,{width:74});
      doc.font("Helvetica").fontSize(10);
      doc.text(String(value),left+12,y+3,{width:pageWidth-110,align:"right",lineBreak:false,features:[]});
    }
    numericField("الهاتف:",opts.participantPhone,infoY+34);
    const dateDisplay=opts.bookingStartAt?new Date(opts.bookingStartAt).toLocaleString("en-GB",{timeZone:"Asia/Baghdad",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hour12:false}):"-";
    numericField("التاريخ:",dateDisplay,infoY+54);
    numericField("رقم الحجز:","#"+opts.bookingId,infoY+74);
    doc.font("Arabic").fontSize(10).fillColor("#475569");
    arText(doc,"الثيم:",left+pageWidth-86,infoY+91,{width:74});
    const theme=opts.themeName||"-";
    if(/[\u0600-\u06ff]/.test(theme)) arText(doc,theme,left+12,infoY+91,{width:pageWidth-110});
    else doc.font("Helvetica").text(theme,left+12,infoY+94,{width:pageWidth-110,align:"right",lineBreak:false,features:[]});

    doc.y = infoY + infoH + 14;

    // ─── Waiver body text ───
    var waiverContent = opts.waiverText || WAIVER_TEXT;
    var paragraphs = waiverContent.split("\n");
    var lineHeight = 20;

    for (var i = 0; i < paragraphs.length; i += 1) {
      var para = paragraphs[i].trim();

      if (para === "") {
        doc.y += 6;
        continue;
      }

      // Section headers (start with Arabic numeral)
      if (/^[١٢٣٤٥٦٧٨٩]\./.test(para)) {
        if(doc.y+80>doc.page.height-95) {doc.addPage();doc.y=50;}
        doc.moveDown(0.2);
        doc.font("ArabicBold").fontSize(12).fillColor("#1e293b");
      } else {
        doc.font("Arabic").fontSize(11).fillColor("#374151");
      }

      arText(doc, para, left, null, { width: pageWidth, lineGap: 4 });
      doc.moveDown(0.15);

      if (doc.y > 720) {
        doc.addPage();
        doc.y = 50;
      }
    }

    doc.moveDown(1.5);

    // ─── Signature section ───
    var sigY = doc.y;
    if (sigY > 600) {
      doc.addPage();
      sigY = 60;
    }

    doc.rect(left, sigY, pageWidth, 1).fill("#e2e8f0");
    sigY += 14;

    doc.font("ArabicBold").fontSize(13).fillColor("#1e293b");
    arText(doc, "توقيع المشارك", left, sigY, { width: pageWidth });
    sigY += 24;

    var sigBoxWidth = 260;
    var sigBoxHeight = 100;
    var sigBoxX = left + pageWidth - sigBoxWidth;

    if (opts.signatureImagePath && fs.existsSync(opts.signatureImagePath)) {
      doc.rect(sigBoxX, sigY, sigBoxWidth, sigBoxHeight).lineWidth(1).dash(4, { space: 3 }).strokeColor("#6366f1").stroke();
      doc.undash();
      try {
        doc.image(opts.signatureImagePath, sigBoxX + 8, sigY + 5, {
          width: sigBoxWidth - 16,
          height: sigBoxHeight - 10,
          fit: [sigBoxWidth - 16, sigBoxHeight - 10],
        });
      } catch (imageError) { doc.destroy(); return cb(imageError); }
      doc.font("Arabic").fontSize(8).fillColor("#16a34a");
      var signedDate = new Date().toLocaleString("en-GB", {timeZone:"Asia/Baghdad",hour12:false});
      arText(doc,"تم التوقيع",sigBoxX,sigY+sigBoxHeight+4,{width:sigBoxWidth});
      doc.font("Helvetica").text(signedDate,sigBoxX,sigY+sigBoxHeight+19,{width:sigBoxWidth,align:"right",lineBreak:false,features:[]});
    } else {
      doc.rect(sigBoxX, sigY, sigBoxWidth, sigBoxHeight).lineWidth(1).dash(4, { space: 3 }).strokeColor("#94a3b8").stroke();
      doc.undash();
      doc.font("Arabic").fontSize(11).fillColor("#94a3b8");
      arText(doc, "وقّع هنا", sigBoxX, sigY + 40, { width: sigBoxWidth, align: "center" });
    }

    // Date field
    doc.font("Arabic").fontSize(10).fillColor("#475569");
    arText(doc, "التاريخ: ___________________", left, sigY + 40, { width: 250 });

    // Page footers remain above the bottom margin and cannot create a blank extra page.
    const pages=doc.bufferedPageRange();
    for(let page=pages.start;page<pages.start+pages.count;page++) {
      doc.switchToPage(page);
      const footerY=doc.page.height-65;
      doc.rect(left,footerY-5,pageWidth,0.5).fill("#e2e8f0");
      doc.font("Arabic").fontSize(7).fillColor("#94a3b8");
      arText(doc,"إسكيب روم العراق — تعهد السلامة الشخصية — وثيقة سرية",left,footerY,{width:pageWidth,align:"center",lineBreak:false});
      doc.font("Helvetica").text(String(page+1)+" / "+pages.count,left,footerY,{width:35,lineBreak:false,features:[]});
    }

    doc.end();
  } catch (err) {
    if (stream) stream.destroy();
    if (doc) doc.destroy();
    return cb(err);
  }
}


const {transaction,publicError,callback}=require("../utils/transaction");
async function pdfBuffer(options, signature) {
  const dir=await fs.promises.mkdtemp(path.join(require('os').tmpdir(),'escape-waiver-'));
  try {
    const output=path.join(dir,'waiver.pdf'),sig=signature?path.join(dir,'signature.png'):null;
    if(signature) await fs.promises.writeFile(sig,signature,{mode:0o600});
    await new Promise((resolve,reject)=>buildPdf({...options,outputPath:output,signatureImagePath:sig},error=>error?reject(error):resolve()));
    return await fs.promises.readFile(output);
  } finally { await fs.promises.rm(dir,{recursive:true,force:true}); }
}
function generateForBooking(payload,cb) {
  callback(transaction(async client=>{
    const booking=(await client.query("SELECT b.id,b.start_at,b.status,t.name AS theme_name FROM bookings b LEFT JOIN themes t ON t.id=b.theme_id WHERE b.id=$1 FOR UPDATE OF b",[payload.booking_id])).rows[0];
    if(!booking) throw publicError(404,"Booking not found");
    if(['cancelled','no_show'].includes(booking.status)) throw publicError(409,"Inactive booking");
    const people=(await client.query("SELECT * FROM booking_participants WHERE booking_id=$1 ORDER BY is_primary DESC,id",[booking.id])).rows;
    if(!people.length) throw publicError(400,"No participants found");
    const template=(await client.query("SELECT template_version,content FROM waiver_templates WHERE active_from<=NOW() AND (active_to IS NULL OR active_to>NOW()) ORDER BY active_from DESC LIMIT 1")).rows[0]||{template_version:1,content:WAIVER_TEXT};
    const generated=[],skipped=[];
    for(const participant of people) {
      if((await client.query("SELECT id FROM waivers WHERE participant_id=$1",[participant.id])).rows.length){skipped.push({participant_id:participant.id,reason:"Waiver already exists"});continue;}
      const snapshot=template.content||WAIVER_TEXT;
      const data=await pdfBuffer({participantName:participant.full_name,participantPhone:participant.phone,bookingId:booking.id,bookingStartAt:booking.start_at,themeName:booking.theme_name,waiverText:snapshot});
      const row=(await client.query(`INSERT INTO waivers(booking_id,participant_id,template_version,pdf_path,pdf_data,template_snapshot)
        VALUES($1,$2,$3,$4,$5,$6) RETURNING id,booking_id,participant_id,template_version,pdf_path,generated_at,signed_at`,
        [booking.id,participant.id,template.template_version,'database:waiver-'+participant.id,data,snapshot])).rows[0];
      generated.push(row);
    }
    if(payload.staff_id) await client.query("INSERT INTO audit_logs(staff_id,action,entity_type,entity_id,details) VALUES($1,'generate_waivers','booking',$2,$3::jsonb)",[payload.staff_id,booking.id,JSON.stringify({generated:generated.length})]);
    return {booking_id:Number(booking.id),template_version:template.template_version,generated,skipped};
  }),cb);
}
function signWaiver(payload,cb) {
  callback((async()=>{
    if(typeof payload.signature_base64!=='string'||!/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(payload.signature_base64)) throw publicError(400,"A PNG signature is required");
    const signature=Buffer.from(payload.signature_base64.split(',')[1],'base64');
    if(signature.length>350000||signature.length<24||require('../utils/imageType').detect(signature)?.mime!=='image/png') throw publicError(400,"Invalid signature image");
    const width=signature.readUInt32BE(16),height=signature.readUInt32BE(20);
    if(!width||!height||width>4096||height>4096||width*height>8000000) throw publicError(400,"Signature dimensions are too large");
    return transaction(async client=>{
      // Same lock order as generation and booking edits.
      const booking=(await client.query("SELECT id,status FROM bookings WHERE id=$1 FOR UPDATE",[payload.booking_id])).rows[0];
      if(!booking||['cancelled','no_show'].includes(booking.status)) throw publicError(409,"Inactive booking");
      const waiver=(await client.query(`SELECT w.*,p.full_name,p.phone,b.start_at,t.name AS theme_name FROM waivers w
       JOIN booking_participants p ON p.id=w.participant_id JOIN bookings b ON b.id=w.booking_id
       LEFT JOIN themes t ON t.id=b.theme_id WHERE w.id=$1 AND w.booking_id=$2 FOR UPDATE OF w`,[payload.waiver_id,payload.booking_id])).rows[0];
      if(!waiver) throw publicError(404,"Waiver not found");
      if(waiver.signed_at) throw publicError(409,"This waiver has already been signed");
      if(!waiver.template_snapshot) throw publicError(409,"Legacy waiver requires a verified template migration before signing");
      const data=await pdfBuffer({participantName:waiver.full_name,participantPhone:waiver.phone,bookingId:waiver.booking_id,bookingStartAt:waiver.start_at,themeName:waiver.theme_name,waiverText:waiver.template_snapshot},signature);
      const row=(await client.query("UPDATE waivers SET pdf_data=$1,signed_at=NOW() WHERE id=$2 RETURNING id,booking_id,participant_id,pdf_path,signed_at",[data,waiver.id])).rows[0];
      return row;
    });
  })(),cb);
}
function getWaiverFile(id,cb) {
  callback((async()=>{
    const row=(await pool.query("SELECT pdf_data FROM waivers WHERE id=$1",[id])).rows[0];
    if(!row?.pdf_data) throw publicError(404,"Waiver data not found. Legacy disk files need a private data migration.");
    return row.pdf_data;
  })(),cb);
}
function listWaiversForBooking(id,cb) {
  callback(pool.query(`SELECT w.id,w.booking_id,w.participant_id,w.pdf_path,w.generated_at,w.signed_at,p.full_name,p.phone,p.is_primary
   FROM waivers w JOIN booking_participants p ON p.id=w.participant_id WHERE w.booking_id=$1 ORDER BY p.is_primary DESC,p.id`,[id]).then(result=>({waivers:result.rows})),cb);
}
module.exports={generateForBooking,signWaiver,getWaiverFile,listWaiversForBooking,buildPdf};
