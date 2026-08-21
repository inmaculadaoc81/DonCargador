import nodemailer from "nodemailer";
export default async function handler(req,res){
  if(req.method!=="POST") return res.status(405).json({error:"Método no permitido"});
  const {name,email,phone,subject,message}=req.body||{};
  if(!name||!email||!message) return res.status(400).json({error:"Faltan datos obligatorios"});
  try{
    const transporter=nodemailer.createTransport({
      host:process.env.SMTP_HOST,
      port:Number(process.env.SMTP_PORT||465),
      secure:String(process.env.SMTP_SECURE||"true")==="true",
      auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASS}
    });
    await transporter.sendMail({
      from:`Don Cargador <${process.env.SMTP_USER}>`,
      to:process.env.CONTACT_EMAIL||"soporte@kelatos.com",
      replyTo:email,
      subject:`Consulta Don Cargador: ${subject||"Cargador para portátil"}`,
      text:`Nombre: ${name}\nEmail: ${email}\nTeléfono: ${phone||"-"}\nEquipo: ${subject||"-"}\n\n${message}`
    });
    res.status(200).json({ok:true});
  }catch(e){res.status(500).json({error:"Error al enviar"});}
}