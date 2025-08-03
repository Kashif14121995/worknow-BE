import { Injectable, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Newsletter, NewsletterDocument } from '../schemas/newsletter.schema';

@Injectable()
export class NewsletterService {
  constructor(
    @InjectModel(Newsletter.name)
    private newsletterModel: Model<NewsletterDocument>,
  ) {}

  async subscribe(email: string): Promise<Newsletter> {
    const exists = await this.newsletterModel.findOne({ email });
    if (exists) {
      throw new ConflictException('Email already subscribed');
    }
    return this.newsletterModel.create({ email });
  }

  async findAll(): Promise<Newsletter[]> {
    return this.newsletterModel.find().sort({ createdAt: -1 });
  }
}
