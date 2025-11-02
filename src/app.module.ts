import { MiddlewareConsumer, Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BcryptService } from './modules/bcrypt/bcrypt.service';
import { HttpStatusCodesService } from './modules/http_status_codes/http_status_codes.service';
import { MailModule } from './modules/mail/mail.module';
import * as Joi from 'joi';
import envConfig from './env.config';
import * as autoPopulate from 'mongoose-autopopulate';
import { LoggerMiddleware } from './common/utils/logger';
import { StripeModule } from './modules/stripe/stripe.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { AwsModule } from './modules/aws/aws.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { ContactUsModule } from './modules/contact-us/contact-us.module';
import { ShiftModule } from './modules/shift/shift.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { MessageModule } from './modules/message/message.module';
import { PaymentModule } from './modules/payment/payment.module';
import { RatingModule } from './modules/rating/rating.module';
import { InvoiceModule } from './modules/invoice/invoice.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { NotificationModule } from './modules/notification/notification.module';
import { UserModule } from './modules/user/user.module';
import { AdminModule } from './modules/admin/admin.module';
import { VerificationModule } from './modules/verification/verification.module';
import { ResumeModule } from './modules/resume/resume.module';
import { BlockingModule } from './modules/blocking/blocking.module';
import { MatchingModule } from './modules/matching/matching.module';
import { ShiftAnalyticsModule } from './modules/shift-analytics/shift-analytics.module';
import { SavedSearchModule } from './modules/saved-search/saved-search.module';
import { JobAlertsModule } from './modules/job-alerts/job-alerts.module';
import { OnboardingModule } from './modules/onboarding/onboarding.module';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { RolesGuard } from './common/guards/roles.guard';
import { ScheduleModule } from '@nestjs/schedule';
import { SubscriptionModule } from './modules/subscription/subscription.module';
import { FeaturedListingModule } from './modules/featured-listing/featured-listing.module';
import { TaxDocumentModule } from './modules/tax-document/tax-document.module';
import { CMSModule } from './modules/cms/cms.module';
import { AuthGuard } from './common/guards/auth.guard';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{
      ttl: 60000, // 1 minute
      limit: 100, // 100 requests per minute
    }]),
    AuthModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [() => envConfig],
      validationSchema: Joi.object({
        DATABASE_URL: Joi.string().uri().required(),
        JWT_SECRET: Joi.string().required(),
        STRIPE_API_KEY: Joi.string().required(),
      }),
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return {
          uri: configService.get<string>('DATABASE_URL'),
          connectionFactory: (connection) => {
            connection.plugin(autoPopulate);
            return connection;
          },
        };
      },
    }),
    MailModule,
    StripeModule.forRootAsync(),
    WebhooksModule,
    AwsModule,
    JobsModule,
    ContactUsModule,
    ShiftModule,
    DashboardModule,
    MessageModule,
    PaymentModule,
    RatingModule,
    InvoiceModule,
    TasksModule,
    NotificationModule,
    UserModule,
    AdminModule,
    VerificationModule,
    ResumeModule,
    BlockingModule,
    MatchingModule,
    ShiftAnalyticsModule,
    SavedSearchModule,
    JobAlertsModule,
    OnboardingModule,
    SubscriptionModule,
    FeaturedListingModule,
    TaxDocumentModule,
    CMSModule,  
  ],
  controllers: [AppController],
  providers: [
    AppService,
    BcryptService,
    HttpStatusCodesService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: AuthGuard, // AuthGuard must run before RolesGuard
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard, // RolesGuard runs after AuthGuard sets request.user
    },
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
