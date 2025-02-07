import { Module } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';
// import { APP_GUARD } from '@nestjs/core';
// import { AuthGuard } from 'src/auth/auth.guard';
import { HttpStatusCodesService } from 'src/http_status_codes/http_status_codes.service';
import { MongooseModule } from '@nestjs/mongoose';
import { JobPosting, JobPostingSchema } from './entities/job.entity';
import { JwtService } from '@nestjs/jwt';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: JobPosting.name, schema: JobPostingSchema },
    ]),
  ],
  controllers: [JobsController],
  providers: [JobsService, JwtService, HttpStatusCodesService],
})
export class JobsModule {}
