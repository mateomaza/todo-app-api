import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { sanitizeObject, sanitizeString } from './sanitize.service';
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
    if (typeof req.body === 'string') {
      req.body = sanitizeString(req.body);
    } else if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body);
    }
    Object.keys(req.query).forEach((key) => {
      const value = req.query[key];
      if (typeof value === 'string') {
        req.query[key] = sanitizeString(value);
      } else if (Array.isArray(value)) {
        req.query[key] = value.map((item: any) =>
          typeof item === 'string' ? sanitizeString(item) : item,
        );
      }
    });
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
