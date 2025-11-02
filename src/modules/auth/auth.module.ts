import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema, RefreshToken, RefreshTokenSchema } from 'src/schemas';
import { HttpStatusCodesService } from 'src/modules/http_status_codes/http_status_codes.service';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MailModule } from 'src/modules/mail/mail.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: RefreshToken.name, schema: RefreshTokenSchema },
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      global: true, // Make JwtModule available globally for AuthGuard in AppModule
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: parseInt(
            configService.getOrThrow<string>(
              'ACCESS_TOKEN_VALIDITY_DURATION_IN_SEC',
            ),
          ),
        },
      }),
      inject: [ConfigService],
    }),
    MailModule,
  ],
  providers: [
    AuthService,
    HttpStatusCodesService,
    // AuthGuard is now registered globally in AppModule to ensure it runs before RolesGuard
  ],
  controllers: [AuthController],
})
export class AuthModule {}
