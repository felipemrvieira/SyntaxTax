import 'reflect-metadata';

import { UnprocessableEntityException, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      exceptionFactory: () => new UnprocessableEntityException({ detail: 'Validation failed' }),
    }),
  );

  await app.listen(8000, '0.0.0.0');
}

void bootstrap();
