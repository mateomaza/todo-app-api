import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import helmet from 'helmet';

@Module({})
export class CspTestModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(
        helmet({
          contentSecurityPolicy: {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'"],
            },
          },
        }),
      )
      .forRoutes('*');
  }
}
