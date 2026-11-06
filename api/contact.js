import nodemailer from "./_correo.js";
const clean=(v,max=4000)=>String(v??"").replace(/[<>]/g,"").trim().slice(0,max);
const EMAIL_RE=/^[^\s@"(),:;<>[\]\\]+@[^\s@"(),:;<>[\]\\]+\.[a-z]{2,}$/i;
export default async function handler(req,res){
  if(req.method!=="POST") return res.status(405).json({error:"Método no permitido"});
  const b=req.body||{};
  if(clean(b.website)) return res.status(200).json({ok:true});
  const name=clean(b.name,120),email=clean(b.email,180),phone=clean(b.phone,60),subject=clean(b.subject,160),message=clean(b.message);
  if(!name||!email||!message) return res.status(400).json({error:"Faltan datos obligatorios"});
  if(!EMAIL_RE.test(email)) return res.status(400).json({error:"El correo electrónico no es válido"});
  if(!process.env.CONTACT_EMAIL) return res.status(500).json({error:"Falta configurar CONTACT_EMAIL"});
  try{
    const transporter=nodemailer.createTransport({
      host:process.env.SMTP_HOST,
      port:Number(process.env.SMTP_PORT||465),
      secure:String(process.env.SMTP_SECURE||"true")==="true",
      auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASS}
    });
    await transporter.sendMail({
      from:`Don Cargador <${process.env.SMTP_USER}>`,
      to:process.env.CONTACT_EMAIL,
      replyTo:email,
      subject:`Consulta Don Cargador: ${subject||"Cargador para portátil"}`,
      text:`Nombre: ${name}\nEmail: ${email}\nTeléfono: ${phone||"-"}\nEquipo: ${subject||"-"}\n\n${message}`
    });
    res.status(200).json({ok:true});
  }catch(e){res.status(500).json({error:"Error al enviar"});}
}
