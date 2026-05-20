/** Gmail suele limitar ~500 destinatarios por mensaje (to + cc + bcc). */
export const ENTRADAS_BCC_CHUNK_SIZE = 450;

export function uniqueRecipientEmails(emails: Iterable<string>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of emails) {
    const e = String(raw || "").trim().toLowerCase();
    if (!e || seen.has(e)) continue;
    seen.add(e);
    out.push(e);
  }
  return out;
}

type MailTransporter = {
  sendMail: (opts: Record<string, unknown>) => Promise<{ messageId?: string }>;
};

/** Un envío (o varios por trozos) con todos los destinatarios en BCC; el remitente va en Para. */
export async function sendEntradasMailBcc(
  transporter: MailTransporter,
  opts: {
    gmailUser: string;
    fromLabel?: string;
    subject: string;
    html: string;
    bcc: string[];
  },
): Promise<{ destinatarios: number; envios: number }> {
  const bcc = uniqueRecipientEmails(opts.bcc);
  if (bcc.length === 0) return { destinatarios: 0, envios: 0 };

  const from = `"${opts.fromLabel ?? "Entradas OFRN"}" <${opts.gmailUser}>`;
  let envios = 0;
  for (let i = 0; i < bcc.length; i += ENTRADAS_BCC_CHUNK_SIZE) {
    const chunk = bcc.slice(i, i + ENTRADAS_BCC_CHUNK_SIZE);
    await transporter.sendMail({
      from,
      to: opts.gmailUser,
      bcc: chunk,
      subject: opts.subject,
      html: opts.html,
    });
    envios += 1;
  }
  return { destinatarios: bcc.length, envios };
}
