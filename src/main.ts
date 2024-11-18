import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = process.env.PORT || 3000;
  app
    .useGlobalPipes(
      new ValidationPipe({
        transform: true,
      }),
    )
    .enableCors({
      origin: '*',
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
      credentials: true,
    });
  // app.setGlobalPrefix('api/v1');

  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}
bootstrap();
