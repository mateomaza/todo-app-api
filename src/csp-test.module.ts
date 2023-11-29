import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import helmet from 'helmet';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  controllers: [AppController],
  providers: [AppService],
})
export class CspTestModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(
        helmet({
          contentSecurityPolicy: {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'"],
              reportUri: '/report-csp-violation',
            },
          },
        }),
      )
      .forRoutes('*');
  }
}
