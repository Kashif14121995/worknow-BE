import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CMSDocument = HydratedDocument<CMS>;

export enum CMSType {
  BLOG = 'blog',
  FAQ = 'faq',
  SUCCESS_STORY = 'success_story',
  CAREER = 'career',
}

export enum CMSStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

@Schema({ timestamps: true })
export class CMS {
  @Prop({ required: true, enum: CMSType })
  type: CMSType;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true, type: String })
  content: string;

  @Prop({ required: false })
  excerpt?: string;

  @Prop({ required: false })
  featuredImage?: string;

  @Prop({ required: false, type: [String] })
  tags?: string[];

  @Prop({ required: false })
  author?: string;

  @Prop({ default: CMSStatus.DRAFT, enum: CMSStatus })
  status: CMSStatus;

  @Prop({ required: false })
  slug?: string;

  @Prop({ required: false })
  metaTitle?: string;

  @Prop({ required: false })
  metaDescription?: string;

  // For FAQs specifically
  @Prop({ required: false })
  category?: string;

  @Prop({ required: false, type: Number })
  order?: number; // For ordering FAQs or other content

  // For success stories
  @Prop({ required: false })
  companyName?: string;

  @Prop({ required: false })
  testimonial?: string;

  @Prop({ required: false })
  publishedAt?: Date;
}

export const CMSSchema = SchemaFactory.createForClass(CMS);

// Create indexes for better query performance
CMSSchema.index({ type: 1, status: 1 });
CMSSchema.index({ slug: 1 }, { unique: true, sparse: true });
CMSSchema.index({ createdAt: -1 });

