import { Controller, Get, Post, HttpCode, Body } from '@nestjs/common';
import { AppService } from './app.service';
import { writeFileSync, appendFileSync, existsSync } from 'fs';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
  @Post('report-csp-violation')
  @HttpCode(204)
  reportCspViolation(@Body() body: any) {
    const logFile = 'csp-violations.log';
    const logEntry = `${new Date().toISOString()} - ${JSON.stringify(body)}\n`;

    if (!existsSync(logFile)) {
      writeFileSync(logFile, logEntry);
    } else {
      appendFileSync(logFile, logEntry);
    }
  }
}
