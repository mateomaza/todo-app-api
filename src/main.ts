import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { sanitizeInput } from './sanitize.service';
import { Request, Response, NextFunction } from 'express';
import { config } from 'dotenv';
config();

async function bootstrap(): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.body) req.body = sanitizeInput(req.body);
    if (req.query) req.query = sanitizeInput(req.query);
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
  if (process.env.NODE_ENV !== 'test') {
    await app.listen(3001);
  }
  return app;
}

const appPromise = bootstrap();

export { appPromise };
