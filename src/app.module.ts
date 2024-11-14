import { Module } from '@nestjs/common';
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
  ],
  controllers: [AppController],
  providers: [AppService, BcryptService, HttpStatusCodesService],
})
export class AppModule {}
