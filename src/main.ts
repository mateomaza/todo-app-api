import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { sanitizeObject, sanitizeString } from './common/sanitize.service';
import { Request, Response, NextFunction } from 'express';
import {
  registerLimiter,
  checkRefreshTokenLimiter,
  verifySessionLimiter,
  refreshTokenLimiter,
} from './common/rate-limits.config';
import { config } from 'dotenv';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: 'https://www.holi.website',
    credentials: true,
  });
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  const config = new DocumentBuilder()
    .setTitle('TaskTracker Docs')
    .setDescription(
      'This API serves as the backbone of a Task Management System, facilitating the creation, management, and deletion of tasks. It emphasizes security and user-centric features, including secure authentication with refresh tokens via HttpOnly cookies and comprehensive audit logging. While Redis plays a role in enhancing security by managing blocked refresh tokens, the API also implements XSS protection and CSP headers to safeguard against common vulnerabilities. Rate limiting and the proper use of DTOs ensure a robust and scalable user experience. This documentation outlines all necessary endpoints, supported operations, and security measures.',
    )
    .setVersion('1.0')
    .addTag('TaskTracker')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  document.components.schemas['User'] = {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'UUID for the user' },
      sub: { type: 'string', description: 'Subscription ID' },
      username: { type: 'string', description: 'Username' },
      password: { type: 'string', description: 'Password' },
      email: { type: 'string', description: 'Email' },
      createdAt: {
        type: 'string',
        format: 'date-time',
        description: 'User creation date',
      },
    },
    required: ['id', 'sub', 'username', 'email', 'createdAt'],
  };
  document.components.schemas['AuditLog'] = {
    type: 'object',
    properties: {
      timestamp: {
        type: 'string',
        format: 'date-time',
        description: 'Log creation date',
      },
      level: { type: 'string', description: 'Level of consideration' },
      userId: { type: 'string', description: 'Possible user id' },
      action: { type: 'string', description: 'Action taken place' },
      details: { type: 'string', description: 'Details from the log' },
      outcome: { type: 'string', description: 'Possible outcome from the log' },
    },
    required: ['timestamp', 'level', 'action', 'details'],
  };
  document.components.schemas['CreateAuditLogDto'] = {
    type: 'object',
    properties: {
      level: { type: 'string' },
      userId: { type: 'string' },
      action: { type: 'string' },
      details: { type: 'string' },
      outcome: { type: 'string' },
    },
    required: ['level', 'action', 'details'],
  };
  SwaggerModule.setup('api', app, document);
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
          styleSrc: ["'self'", 'https://cdnjs.cloudflare.com'],
          fontSrc: ["'self'", 'https://cdnjs.cloudflare.com'],
          reportUri: '/report-csp-violation',
        },
      },
    }),
  );
  if (process.env.NODE_ENV === 'production') {
    app.use('/api/auth/register', registerLimiter);
    app.use('/api/auth/check-refresh', checkRefreshTokenLimiter);
    app.use('/api/auth/verify-session ', verifySessionLimiter);
    app.use('/api/auth/refresh', refreshTokenLimiter);
  }
  if (process.env.NODE_ENV !== 'test') {
    const port = process.env.PORT || 3001;
    await app.listen(port);
  }
}

bootstrap();
