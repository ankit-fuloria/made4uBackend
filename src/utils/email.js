const nodemailer = require("nodemailer");

const createTransporter = () => {
  if (!process.env.EMAIL_USER) return null;
  const port = Number(process.env.EMAIL_PORT) || 587;
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port,
    // 465 is implicit TLS (secure: true); 587/others use STARTTLS (secure: false).
    secure: port === 465,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

const sendOtpEmail = async (to, otp, type = "login") => {
  const action = type === "signup" ? "verify your account" : "sign in";
  const html = `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F3EEFA;padding:40px 16px;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
    <tr>
      <td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background-color:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 8px 28px rgba(74,20,140,0.10);">
          <tr>
            <td style="background-color:#8E5CA8;background-image:linear-gradient(135deg,#7B4397,#AB6DC0);padding:40px 32px 32px;text-align:center;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 16px;">
                <tr><td style="width:56px;height:56px;background-color:rgba(255,255,255,0.2);border-radius:16px;text-align:center;font-size:26px;line-height:56px;">💜</td></tr>
              </table>
              <h1 style="color:#ffffff;margin:0;font-size:23px;font-weight:800;letter-spacing:-0.3px;">Heart Made Memo</h1>
              <p style="color:#EBDFF7;margin:6px 0 0;font-size:12px;letter-spacing:2px;text-transform:uppercase;">Handmade gifts, made for you</p>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 32px 8px;">
              <p style="color:#1A0033;font-size:16px;margin:0 0 6px;font-weight:600;">Hi there! 👋</p>
              <p style="color:#6B5B7B;font-size:14px;line-height:1.6;margin:0 0 26px;">Use the code below to ${action}. This code expires in <strong style="color:#4A148C;">10 minutes</strong>.</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="background-color:#F8F4FF;border:1.5px dashed #D3B8E8;border-radius:16px;padding:26px 16px;">
                    <span style="font-size:38px;font-weight:800;color:#4A148C;letter-spacing:10px;font-family:'Courier New',Courier,monospace;">${otp}</span>
                  </td>
                </tr>
              </table>
              <p style="color:#9E8FAB;font-size:12.5px;margin:24px 0 0;text-align:center;">Didn't request this? You can safely ignore this email.</p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#FAF8FF;padding:20px 32px;text-align:center;border-top:1px solid #EFE6F7;">
              <p style="color:#B3A3C2;font-size:11.5px;margin:0;">🧶 Crafted with love · © 2026 Heart Made Memo</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>`;

  const transporter = createTransporter();
  if (!transporter) {
    console.log(`[DEV] OTP for ${to}: ${otp}`);
    return;
  }
  await transporter.sendMail({
    from: process.env.EMAIL_FROM || `"Heart Made Memo" <${process.env.EMAIL_USER}>`,
    to,
    subject: `${otp} is your Heart Made Memo OTP`,
    html,
  });
};

module.exports = { sendOtpEmail };
