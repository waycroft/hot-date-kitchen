// Email client
// Try to design such that we can switch between SMTP/API-based email providers down the road.
// Should abstract the email provider interface/business model away from simply sending email.

import nodemailer from 'nodemailer'

export class EmailClient {
  constructor() {
    this.transporter = nodemailer.createTransport({
      service: Bun.env.NODEMAILER_SERVICE,
      auth: {
        user: Bun.env.SES_SMTP_USERNAME,
        pass: Bun.env.SES_SMTP_PASSWORD
      }
    });
  }

  // @typedef {Object} EmailBody
  // @property {string} html
  // @property {string=} text - This is optional, as nodemailer will send plain text fallback automatically.

  // @typedef {Object} Attachment - https://nodemailer.com/message/attachments
  // @property {string} filename
  // @property {string|Buffer|Stream} content

  /* Send email
   * @param {string} from
   * @param {string} to
   * @param {string} replyTo
   * @param {string} subject
   * @param {EmailBody} body
   * @param {Attachment[]} attachments
   */
  sendMail = async function ({
    from,
    to,
    replyTo,
    subject,
    body,
    attachments,
  }) {
    // First verify connection
    await this.transporter.verify();

    const message = {
      from: from, 
      to: to, 
      subject: subject, 
      html: body.html, 
    }

    if (replyTo != null) message.replyTo = replyTo; else message.replyTo = from
    if (body.text != null) message.text = body.text
    if (attachments != null) message.attachments = attachments

    await this.transporter.sendMail(message);
  };
}
