import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';

@Controller()
@ApiTags('Health Check') // This groups the controller in Swagger UI
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('/ping')
  @ApiOperation({ summary: 'Ping the server', description: 'Returns a basic success message.' })
  @ApiResponse({ status: 200, description: 'Service is running.' })
  getHello(): string {
    return this.appService.start();
  }
}
