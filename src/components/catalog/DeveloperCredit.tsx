import { Mail, Phone, MessageCircle } from "lucide-react";

const DEVELOPER_NAME = "Antonio David Tejada Villalon";
const DEVELOPER_ROLE = "Web Developer & Designer";
const DEVELOPER_EMAIL = "4vdel777@gmail.com";
const DEVELOPER_PHONE_DISPLAY = "+54 9 264 414-5337";
const DEVELOPER_PHONE_DIAL = "+5492644145337";
const WHATSAPP_NUMBER = "5492644145337";

const firstName = DEVELOPER_NAME.split(" ")[0];

const whatsappMessage = `Hola ${firstName}, mi nombre es [tu nombre] y te contacto porque [motivo de tu comunicación].`;
const emailSubject = "Contacto desde el sitio Power IT";
const emailBody = `Hola ${firstName},\n\nMi nombre es [tu nombre] y te escribo porque [motivo de tu comunicación].\n\nSaludos.`;

const whatsappHref = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(whatsappMessage)}`;
const telHref = `tel:${DEVELOPER_PHONE_DIAL}`;
const mailHref = `mailto:${DEVELOPER_EMAIL}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;

export function DeveloperCredit() {
  return (
    <div className="space-y-3">
      <p className="text-xs text-foreground-secondary">
        Sitio desarrollado por{" "}
        <span className="font-semibold text-foreground">{DEVELOPER_NAME}</span> — {DEVELOPER_ROLE} · 2026
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <a
          href={mailHref}
          className="flex items-center gap-1.5 px-3 py-1.5 glass rounded-full text-xs font-semibold hover:bg-primary/10 hover:border-primary/30 transition-all"
        >
          <Mail size={13} className="text-primary" />
          {DEVELOPER_EMAIL}
        </a>
        <a
          href={telHref}
          className="flex items-center gap-1.5 px-3 py-1.5 glass rounded-full text-xs font-semibold hover:bg-primary/10 hover:border-primary/30 transition-all"
        >
          <Phone size={13} className="text-primary" />
          {DEVELOPER_PHONE_DISPLAY}
        </a>
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 glass rounded-full text-xs font-semibold hover:bg-success/10 hover:border-success/30 transition-all"
        >
          <MessageCircle size={13} className="text-success" />
          WhatsApp
        </a>
      </div>
    </div>
  );
}
