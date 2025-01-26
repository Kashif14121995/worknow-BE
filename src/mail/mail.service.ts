import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
import { sendOTP } from 'src/type/user.entity';
import { IMailgunClient } from 'mailgun.js/Interfaces';

@Injectable()
export class MailService {
  private readonly mailGunClient: IMailgunClient;
  private readonly activeMailingService: string;
  private readonly MAILGUN_DOMAIN: string;
  constructor(private mailerService: MailerService) {}
  async sendMail(data) {
    await this.mailerService.sendMail(data);
  }

  async sendUserConfirmation(user: sendOTP) {
    const template = {
      to: user.email,
      from: '"Support Team" <support@example.com>',
      subject: 'Welcome to Nice App! Confirm your Email',
      template: './confirmation',
      context: {
        name: user.name,
        otp: user.otp,
      },
    };
    await this.sendMail(template);
  }
}
