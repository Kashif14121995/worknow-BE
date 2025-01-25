import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { sendOTP } from 'src/type/user.entity';
import Mailgun from 'mailgun.js';
import { IMailgunClient } from 'mailgun.js/Interfaces';
import { SMTP_SERVICE_PROVIDERS } from 'src/app.module';

@Injectable()
export class MailService {
  private readonly mailgun: Mailgun;
  private readonly mailGunClient: IMailgunClient;
  private readonly activeMailingService: string;
  private readonly MAILGUN_DOMAIN: string;
  constructor(
    private readonly configService: ConfigService,
    private mailerService: MailerService,
  ) {
    this.activeMailingService = configService.get('SMTP_CLIENT');

    if (this.activeMailingService == SMTP_SERVICE_PROVIDERS.mailGun) {
      this.mailgun = new Mailgun(FormData);
      this.mailGunClient = this.mailgun.client({
        key: this.configService.get('MAILGUN_API_KEY'),
        username: 'api',
        url: this.configService.get('MAILGUN_HOST'),
      });
      this.MAILGUN_DOMAIN = this.configService.get<string>('MAILGUN_DOMAIN');
    }
  }
  async sendMail(data) {
    if (this.activeMailingService == SMTP_SERVICE_PROVIDERS.mailGun) {
      await this.mailGunClient.messages.create(this.MAILGUN_DOMAIN, data);
    } else {
      await this.mailerService.sendMail(data);
    }
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
