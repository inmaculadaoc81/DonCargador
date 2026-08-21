import nodemailer from "nodemailer";
export default async function handler(req,res){
  if(req.method!=="POST") return res.status(405).json({error:"Método no permitido"});
  const {name,email,phone,subject,message}=req.body||{};
  if(!name||!email||!message) return res.status(400).json({error:"Faltan datos obligatorios"});
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