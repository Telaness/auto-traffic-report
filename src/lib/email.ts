import nodemailer from "nodemailer";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  attachments?: Array<{
    filename: string;
    path: string;
  }>;
}

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: Number(process.env.SMTP_PORT ?? 587) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

export const sendEmail = async (options: EmailOptions): Promise<void> => {
  const transporter = createTransporter();

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: options.to,
    subject: options.subject,
    html: options.html,
    attachments: options.attachments,
  });
};

export const sendReportEmail = async (
  to: string,
  siteName: string,
  reportMonth: string,
  htmlContent: string,
  pdfPath?: string
): Promise<void> => {
  const subject = `【月次トラフィックレポート】${siteName} - ${reportMonth}`;

  const attachments = pdfPath
    ? [
        {
          filename: `${siteName}_${reportMonth.replace(/年|月/g, "")}_report.pdf`,
          path: pdfPath,
        },
      ]
    : [];

  await sendEmail({
    to,
    subject,
    html: `
      <p>お世話になっております。</p>
      <p>${siteName}の${reportMonth}のトラフィックレポートをお送りいたします。</p>
      ${pdfPath ? "<p>詳細はPDFファイルをご確認ください。</p>" : htmlContent}
      <p>ご不明な点がございましたら、お気軽にお問い合わせください。</p>
    `,
    attachments,
  });
};

export const sendAlertEmail = async (
  subject: string,
  message: string
): Promise<void> => {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) return;

  await sendEmail({
    to: adminEmail,
    subject: `【オトレポ アラート】${subject}`,
    html: `<p>${message}</p>`,
  });
};
