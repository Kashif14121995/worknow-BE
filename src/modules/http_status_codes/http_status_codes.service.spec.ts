import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatusCodesService } from './http_status_codes.service';

describe('HttpStatusCodesService', () => {
  let service: HttpStatusCodesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HttpStatusCodesService],
    }).compile();

    service = module.get<HttpStatusCodesService>(HttpStatusCodesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
