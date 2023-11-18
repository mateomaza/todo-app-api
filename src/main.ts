import xss from 'xss';
import helmet from 'helmet';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { config } from 'dotenv';
import { Request, Response, NextFunction } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.body) req.body = JSON.parse(xss(JSON.stringify(req.body)));
    if (req.query) req.query = JSON.parse(xss(JSON.stringify(req.query)));
    next();
  });
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
        },
      },
    }),
  );
  await app.listen(3001);
}

config();
bootstrap();
