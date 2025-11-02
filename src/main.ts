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

  // CORS Configuration - restrict to specific origins
  const allowedOrigins = process.env.FRONTEND_URL 
    ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
    : ['http://localhost:3000', 'http://localhost:3001'];

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, Postman)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Authorization'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
    }),
  );

  const isProduction = process.env.NODE_ENV === 'production';
  const backendBaseUrl = process.env.BASE_URL || 'https://theworknow.com';
  
  const config = new DocumentBuilder()
    .setTitle('WorkNow API')
    .setDescription('API documentation')
    .setVersion('1.0')
    .addBearerAuth();
  
  // Add server URL for production to handle reverse proxy
  if (isProduction) {
    config.addServer(`${backendBaseUrl}/backend`, 'Production Server');
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
