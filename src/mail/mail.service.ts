import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
import { ForgotPasswordMailSchema, SendOTP } from 'src/type/user.entity';

@Injectable()
export class MailService {
  private readonly FROM_EMAIL = 'Support Team" <support@example.com>';
  constructor(private mailerService: MailerService) {}
  async sendMail(data) {
    await this.mailerService.sendMail(data);
  }

  async sendUserConfirmation(user: SendOTP) {
    const template = {
      to: user.email,
      from: this.FROM_EMAIL,
      subject: 'OTP For Login Requested',
      template: './confirmation',
      context: {
        name: user.name,
        otp: user.otp,
      },
    };
    await this.sendMail(template);
  }

  async sendForgotPasswordMail(userData: ForgotPasswordMailSchema) {
    const template = {
      to: userData.email,
      from: this.FROM_EMAIL,
      subject: 'Change Your Password',
      template: './forgotPassword',
      context: {
        name: userData.name,
        url: userData.url,
      },
    };
    await this.sendMail(template);
  }
}
