const nodemailer = require("nodemailer");

const createTransporter = () => {
  if (!process.env.EMAIL_USER) return null;
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

const sendOtpEmail = async (to, otp, type = "login") => {
  const action = type === "signup" ? "verify your account" : "sign in";
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;background:#FAF8FF;border-radius:16px;overflow:hidden">
      <div style="background:#AB6DC0;padding:28px 32px;text-align:center">
        <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700">MadeForYou</h1>
        <p style="color:#F3E5F5;margin:6px 0 0;font-size:13px">YOUR PERSONAL SHOP</p>
      </div>
      <div style="padding:32px">
        <p style="color:#1A0033;font-size:16px;margin:0 0 8px">Hi there!</p>
        <p style="color:#5E4B6E;font-size:14px;margin:0 0 28px">Use the OTP below to ${action}. It expires in <strong>10 minutes</strong>.</p>
        <div style="background:#F3E5F5;border-radius:14px;padding:24px;text-align:center;margin-bottom:28px">
          <div style="font-size:38px;font-weight:700;color:#4A148C;letter-spacing:12px">${otp}</div>
        </div>
        <p style="color:#9E8FAB;font-size:12px;margin:0">If you didn't request this, please ignore this email.</p>
      </div>
    </div>`;

  const transporter = createTransporter();
  if (!transporter) {
    console.log(`[DEV] OTP for ${to}: ${otp}`);
    return;
  }
  await transporter.sendMail({
    from: process.env.EMAIL_FROM || `"MadeForYou" <${process.env.EMAIL_USER}>`,
    to,
    subject: `${otp} is your MadeForYou OTP`,
    html,
  });
};

module.exports = { sendOtpEmail };
