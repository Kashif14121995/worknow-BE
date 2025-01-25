import { MiddlewareConsumer, Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BcryptService } from './bcrypt/bcrypt.service';
import { HttpStatusCodesService } from './http_status_codes/http_status_codes.service';
import { MailModule } from './mail/mail.module';
import * as Joi from 'joi';
import envConfig from '../env.config';
import * as autoPopulate from 'mongoose-autopopulate';
import { LoggerMiddleware } from './common/utils/logger';
import { StripeModule } from './stripe/stripe.module';
import { WebhooksModule } from './webhooks/webhooks.module';
export const SMTP_SERVICE_PROVIDERS = {
  gmail: 'GMAIL',
  mailGun: 'MAIL_GUN',
};

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
        SMTP_CLIENT: Joi.string()
          .default(SMTP_SERVICE_PROVIDERS.gmail)
          .custom((value, helpers) => {
            if (!Object.values(SMTP_SERVICE_PROVIDERS).includes(value)) {
              return helpers.error('any.invalid', { value });
            }

            // Additional validation for MAIL_GUN
            if (value === SMTP_SERVICE_PROVIDERS.mailGun) {
              const requiredVars = [
                { key: 'MAILGUN_API_KEY', value: process.env.MAILGUN_API_KEY },
                { key: 'MAILGUN_DOMAIN', value: process.env.MAILGUN_DOMAIN },
                { key: 'MAILGUN_HOST', value: process.env.MAILGUN_HOST },
              ];

              const missingVars = requiredVars.filter((env) => !env.value);

              if (missingVars.length > 0) {
                return helpers.error('mailgun.missingVars', {
                  value: missingVars.map((env) => env.key).join(', '),
                });
              }
            }

            return value; // Validation passed
          }, 'Custom validation')
          .messages({
            'any.invalid': 'The value must be either GMAIL or MAIL_GUN.',
            'mailgun.missingVars':
              'Missing required environment variables for MAIL_GUN: {{#value}}',
            'string.base': 'The value must be a string.',
          }),
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
  ],
  controllers: [AppController],
  providers: [AppService, BcryptService, HttpStatusCodesService],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
