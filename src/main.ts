// Ensure crypto is available globally for @nestjs/schedule
import { webcrypto } from 'crypto';
if (typeof globalThis.crypto === 'undefined') {
  globalThis.crypto = webcrypto as any;
}

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');

  // Trust proxy for correct request URLs behind nginx reverse proxy
  if (process.env.NODE_ENV === 'production') {
    const expressApp = app.getHttpAdapter().getInstance();
    expressApp.set('trust proxy', true);
  }

  // Security headers
  app.use(helmet());

  // Global exception filter
  app.useGlobalFilters(new AllExceptionsFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
    }),
  );
  
  const config = new DocumentBuilder()
    .setTitle('WorkNow API')
    .setDescription('API documentation')
    .setVersion('1.0')
    .addBearerAuth();
  
  // Add server URL for production to handle reverse proxy
  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction) {
    // Set server URL with /backend path for API calls
    config.addServer('/backend', 'Production Server (Same Domain)');
  } else {
    // Development server
    config.addServer('http://localhost:3000', 'Development Server');
  }
  
  const swaggerConfig = config.build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  
  // Configure Swagger path based on environment
  const swaggerPath = isProduction ? 'backend/api/v1/api-docs' : 'api/v1/api-docs';
  
  const swaggerOptions = {
    swaggerOptions: {
      persistAuthorization: true,
      // Configure default models expansion
      defaultModelsExpandDepth: 2,
      defaultModelExpandDepth: 2,
    },
    customSiteTitle: 'WorkNow API Documentation',
    customCss: `
      .swagger-ui .topbar { display: none }
    `,
  };

  SwaggerModule.setup(swaggerPath, app, document, swaggerOptions);

  await app.listen(process.env.PORT || 3000);
}
bootstrap();
