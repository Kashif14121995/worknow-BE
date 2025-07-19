import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as swaggerUi from 'swagger-ui-express';
import * as swaggerDocument from './swagger.json';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = process.env.PORT || 3000;

  // 1. Global prefix must be set before swagger
  app.setGlobalPrefix('api/v1');

  // 2. Middlewares
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
    }),
  );

  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // 3. Swagger route adjusted to global prefix
  app.use('/api/v1/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

  await app.listen(port);
  console.log(`Application is running...`);
}
bootstrap();
