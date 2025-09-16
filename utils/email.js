const nodemailer = require("nodemailer");
const pug = require("pug");
const { convert } = require("html-to-text");

module.exports = class Email {
  constructor(user, data) {
    this.to = user.email;
    this.name = user.name;
    this.data = data;
    this.from = `Hoang Minh Thang <${process.env.EMAIL_FROM}>`;
  }

  newTransport() {
    return nodemailer.createTransport({
      host: process.env.BREVO_HOST,
      port: process.env.BREVO_PORT,
      secure: false,
      auth: {
        user: process.env.BREVO_USER,
        pass: process.env.BREVO_KEY,
      },
    });
  }

  // Hàm gửi mail
  async send(template, subject) {
    // 1) Render HTML dựa trên pug file
    const html = pug.renderFile(`${__dirname}/../view/email/${template}.pug`, {
      name: this.name,
      data: this.data,
      subject,
    });

    // 2) Cấu trúc Email option
    const mailOptions = {
      from: this.from,
      to: this.to,
      subject,
      html,
      text: convert(html),
    };

    // Tạo transport và gửi mail
    const transport = await this.newTransport();
    await transport.sendMail(mailOptions);
  }

  async sendVerifyAccount() {
    await this.send("verifyOTP", "Mã code xác thực tài khoản CellphoneS");
  }

  async sendPasswordResetToken() {
    await this.send(
      "passwordReset",
      "Đường dẫn đến website đổi mật khẩu (Hiệu lực trong 10 phút)"
    );
  }

  async sendCreatedSuccessfullOrder() {
    await this.send(
      "orderCreated",
      "Đơn hàng mới nhất"
    );
  }
};
