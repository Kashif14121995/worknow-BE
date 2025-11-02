import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
import { ForgotPasswordMailSchema, SendOTP } from 'src/common/types/user.entity';

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

  // Application-related email triggers
  async sendApplicationReceivedEmail(data: {
    providerEmail: string;
    providerName: string;
    seekerName: string;
    jobTitle: string;
    appliedDate: string;
  }) {
    const template = {
      to: data.providerEmail,
      from: this.FROM_EMAIL,
      subject: `New Application Received - ${data.jobTitle}`,
      template: './application-received',
      context: {
        providerName: data.providerName,
        seekerName: data.seekerName,
        jobTitle: data.jobTitle,
        appliedDate: data.appliedDate,
      },
    };
    await this.sendMail(template);
  }

  async sendApplicationShortlistedEmail(data: {
    seekerEmail: string;
    seekerName: string;
    providerName: string;
    jobTitle: string;
    jobLocation: string;
  }) {
    const template = {
      to: data.seekerEmail,
      from: this.FROM_EMAIL,
      subject: `Application Shortlisted - ${data.jobTitle}`,
      template: './application-shortlisted',
      context: {
        seekerName: data.seekerName,
        providerName: data.providerName,
        jobTitle: data.jobTitle,
        jobLocation: data.jobLocation,
      },
    };
    await this.sendMail(template);
  }

  async sendApplicationRejectedEmail(data: {
    seekerEmail: string;
    seekerName: string;
    providerName: string;
    jobTitle: string;
  }) {
    const template = {
      to: data.seekerEmail,
      from: this.FROM_EMAIL,
      subject: `Application Update - ${data.jobTitle}`,
      template: './application-rejected',
      context: {
        seekerName: data.seekerName,
        providerName: data.providerName,
        jobTitle: data.jobTitle,
      },
    };
    await this.sendMail(template);
  }

  async sendApplicationHiredEmail(data: {
    seekerEmail: string;
    seekerName: string;
    providerName: string;
    jobTitle: string;
    jobLocation: string;
    shiftDetails?: string;
  }) {
    const template = {
      to: data.seekerEmail,
      from: this.FROM_EMAIL,
      subject: `Congratulations! You've Been Hired - ${data.jobTitle}`,
      template: './application-hired',
      context: {
        seekerName: data.seekerName,
        providerName: data.providerName,
        jobTitle: data.jobTitle,
        jobLocation: data.jobLocation,
        shiftDetails: data.shiftDetails || 'TBD',
      },
    };
    await this.sendMail(template);
  }

  // Shift-related email triggers
  async sendShiftAssignedEmail(data: {
    seekerEmail: string;
    seekerName: string;
    providerName: string;
    jobTitle: string;
    startDate: string;
    startTime: string;
    endDate: string;
    endTime: string;
    location: string;
  }) {
    const template = {
      to: data.seekerEmail,
      from: this.FROM_EMAIL,
      subject: `Shift Assigned - ${data.jobTitle}`,
      template: './shift-assigned',
      context: {
        seekerName: data.seekerName,
        providerName: data.providerName,
        jobTitle: data.jobTitle,
        startDate: data.startDate,
        startTime: data.startTime,
        endDate: data.endDate,
        endTime: data.endTime,
        location: data.location,
      },
    };
    await this.sendMail(template);
  }

  // Payment-related email triggers
  async sendPaymentReceivedEmail(data: {
    seekerEmail: string;
    seekerName: string;
    providerName: string;
    jobTitle: string;
    amount: number;
    transactionId: string;
    paymentDate: string;
  }) {
    const template = {
      to: data.seekerEmail,
      from: this.FROM_EMAIL,
      subject: `Payment Received - $${data.amount}`,
      template: './payment-received',
      context: {
        seekerName: data.seekerName,
        providerName: data.providerName,
        jobTitle: data.jobTitle,
        amount: data.amount.toFixed(2),
        transactionId: data.transactionId,
        paymentDate: data.paymentDate,
      },
    };
    await this.sendMail(template);
  }

  // Message-related email triggers
  async sendNewMessageEmail(data: {
    receiverEmail: string;
    receiverName: string;
    senderName: string;
    messagePreview: string;
  }) {
    const template = {
      to: data.receiverEmail,
      from: this.FROM_EMAIL,
      subject: `New Message from ${data.senderName}`,
      template: './new-message',
      context: {
        receiverName: data.receiverName,
        senderName: data.senderName,
        messagePreview: data.messagePreview.length > 100 
          ? data.messagePreview.substring(0, 100) + '...' 
          : data.messagePreview,
      },
    };
    await this.sendMail(template);
  }

  // Job posting email triggers
  async sendJobPostedEmail(data: {
    providerEmail: string;
    providerName: string;
    jobTitle: string;
    jobId: string;
    jobLocation: string;
    postedDate: string;
  }) {
    const template = {
      to: data.providerEmail,
      from: this.FROM_EMAIL,
      subject: `Job Successfully Posted - ${data.jobTitle}`,
      template: './job-posted',
      context: {
        providerName: data.providerName,
        jobTitle: data.jobTitle,
        jobId: data.jobId,
        jobLocation: data.jobLocation,
        postedDate: data.postedDate,
      },
    };
    await this.sendMail(template);
  }

  // Invoice email trigger
  async sendInvoiceEmail(data: {
    recipientEmail: string;
    recipientName: string;
    issuerName: string;
    invoiceNumber: string;
    invoiceId: string;
    amount: number;
    dueDate: string;
    invoiceUrl: string;
  }) {
    const template = {
      to: data.recipientEmail,
      from: this.FROM_EMAIL,
      subject: `Invoice ${data.invoiceNumber} - $${data.amount.toFixed(2)}`,
      template: './invoice',
      context: {
        recipientName: data.recipientName,
        issuerName: data.issuerName,
        invoiceNumber: data.invoiceNumber,
        invoiceId: data.invoiceId,
        amount: data.amount.toFixed(2),
        dueDate: data.dueDate,
        invoiceUrl: data.invoiceUrl,
      },
    };
    await this.sendMail(template);
  }

  async sendEmailVerification(data: {
    email: string;
    name: string;
    verificationToken: string;
    verificationUrl: string;
  }) {
    const template = {
      to: data.email,
      from: this.FROM_EMAIL,
      subject: 'Verify Your Email Address',
      template: './email-verification',
      context: {
        name: data.name,
        verificationUrl: data.verificationUrl,
        verificationToken: data.verificationToken,
      },
    };
    await this.sendMail(template);
  }

  async sendVerificationSubmissionEmail(data: {
    supportEmail: string;
    userName: string;
    userEmail: string;
    userRole: string;
    documentType: string;
    submittedAt: string;
  }) {
    const template = {
      to: data.supportEmail,
      from: this.FROM_EMAIL,
      subject: `New Verification Submission - ${data.userName}`,
      template: './verification-submission',
      context: {
        userName: data.userName,
        userEmail: data.userEmail,
        userRole: data.userRole,
        documentType: data.documentType,
        submittedAt: data.submittedAt,
      },
    };
    await this.sendMail(template);
  }

  async sendNewSignupNotification(data: {
    supportEmail: string;
    userName: string;
    userEmail: string;
    userRole: string;
    signedUpAt: string;
  }) {
    const template = {
      to: data.supportEmail,
      from: this.FROM_EMAIL,
      subject: `New ${data.userRole} Sign-up - ${data.userName}`,
      template: './new-signup-notification',
      context: {
        userName: data.userName,
        userEmail: data.userEmail,
        userRole: data.userRole,
        signedUpAt: data.signedUpAt,
      },
    };
    await this.sendMail(template);
  }
}
