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
@Module({
  imports: [
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
  ],
  controllers: [AppController],
  providers: [AppService, BcryptService, HttpStatusCodesService],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
