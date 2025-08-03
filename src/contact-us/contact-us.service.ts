import { Injectable, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ContactUs, ContactUsDocument } from '../schemas/contact-us.schema';
import { ContactUsDto } from 'src/dto';

@Injectable()
export class ContactUsService {
  constructor(
    @InjectModel(ContactUs.name)
    private contactUsModel: Model<ContactUsDocument>,
  ) {}

  async submit(payload: ContactUsDto): Promise<ContactUs> {
    const exists = await this.contactUsModel.findOne({ email: payload.email });
    if (exists) {
      throw new ConflictException('You have already submitted a message');
    }
    return this.contactUsModel.create(payload);
  }

  async findAll(): Promise<ContactUs[]> {
    return this.contactUsModel.find().sort({ createdAt: -1 });
  }
}
