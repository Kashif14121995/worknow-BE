import { DynamicModule, Module, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { StripeService } from './stripe.service';
import { StripeController } from './stripe.controller';

@Module({
  controllers: [StripeController],
})
export class StripeModule {
  static forRootAsync(): DynamicModule {
    return {
      module: StripeModule,
      imports: [ConfigModule],
      providers: [
        StripeService,
        {
          provide: 'STRIPE_API_KEY',
          useFactory: async (configService: ConfigService) => {
            const apiKey = configService.get<string>('STRIPE_API_KEY');
            Logger.log(`STRIPE_API_KEY is ${apiKey ? 'defined' : 'undefined'}`);
            return apiKey;
          },
          inject: [ConfigService],
        },
      ],
      exports: [StripeService],
    };
  }
}
