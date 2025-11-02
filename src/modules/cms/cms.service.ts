import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CMS, CMSDocument, CMSType, CMSStatus } from 'src/schemas/cms.schema';

@Injectable()
export class CMSService {
  constructor(
    @InjectModel(CMS.name) private cmsModel: Model<CMSDocument>,
  ) {}

  // Get all CMS content (admin only)
  async getAllContent(
    type?: CMSType,
    status?: CMSStatus,
    page: number = 1,
    limit: number = 20,
    searchText?: string,
  ) {
    const skip = (page - 1) * limit;
    const filter: any = {};

    if (type) {
      filter.type = type;
    }

    if (status) {
      filter.status = status;
    }

    if (searchText) {
      filter.$or = [
        { title: { $regex: searchText, $options: 'i' } },
        { content: { $regex: searchText, $options: 'i' } },
        { excerpt: { $regex: searchText, $options: 'i' } },
      ];
    }

    const [content, total] = await Promise.all([
      this.cmsModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.cmsModel.countDocuments(filter),
    ]);

    return {
      content,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Get published content (public)
  async getPublishedContent(
    type: CMSType,
    page: number = 1,
    limit: number = 20,
    searchText?: string,
  ) {
    const skip = (page - 1) * limit;
    const filter: any = {
      type,
      status: CMSStatus.PUBLISHED,
    };

    if (searchText) {
      filter.$or = [
        { title: { $regex: searchText, $options: 'i' } },
        { content: { $regex: searchText, $options: 'i' } },
        { excerpt: { $regex: searchText, $options: 'i' } },
      ];
    }

    const [content, total] = await Promise.all([
      this.cmsModel
        .find(filter)
        .sort({ order: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-metaTitle -metaDescription')
        .lean(),
      this.cmsModel.countDocuments(filter),
    ]);

    return {
      content,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Get single content by ID (admin)
  async getContentById(contentId: string) {
    const content = await this.cmsModel.findById(contentId).lean();
    if (!content) {
      throw new NotFoundException('Content not found');
    }
    return content;
  }

  // Get single published content by slug (public)
  async getPublishedContentBySlug(type: CMSType, slug: string) {
    const content = await this.cmsModel
      .findOne({
        type,
        slug,
        status: CMSStatus.PUBLISHED,
      })
      .lean();

    if (!content) {
      throw new NotFoundException('Content not found');
    }

    return content;
  }

  // Create content (admin only)
  async createContent(contentData: Partial<CMS>) {
    // Generate slug if not provided
    if (!contentData.slug && contentData.title) {
      contentData.slug = this.generateSlug(contentData.title);
    }

    // Ensure slug is unique
    if (contentData.slug) {
      const existing = await this.cmsModel.findOne({ slug: contentData.slug });
      if (existing) {
        contentData.slug = `${contentData.slug}-${Date.now()}`;
      }
    }

    const content = new this.cmsModel(contentData);
    return content.save();
  }

  // Update content (admin only)
  async updateContent(contentId: string, updateData: Partial<CMS>) {
    // Generate slug if title changed and slug not provided
    if (updateData.title && !updateData.slug) {
      updateData.slug = this.generateSlug(updateData.title);
    }

    // Check slug uniqueness if updating
    if (updateData.slug) {
      const existing = await this.cmsModel.findOne({
        slug: updateData.slug,
        _id: { $ne: contentId },
      });
      if (existing) {
        updateData.slug = `${updateData.slug}-${Date.now()}`;
      }
    }

    // Set publishedAt if status is being changed to published
    if (updateData.status === CMSStatus.PUBLISHED) {
      const existing = await this.cmsModel.findById(contentId);
      if (existing && existing.status !== CMSStatus.PUBLISHED) {
        updateData.publishedAt = new Date();
      }
    }

    const content = await this.cmsModel.findByIdAndUpdate(
      contentId,
      updateData,
      { new: true },
    ).lean();

    if (!content) {
      throw new NotFoundException('Content not found');
    }

    return content;
  }

  // Delete content (admin only)
  async deleteContent(contentId: string) {
    const content = await this.cmsModel.findByIdAndDelete(contentId);
    if (!content) {
      throw new NotFoundException('Content not found');
    }
    return { message: 'Content deleted successfully' };
  }

  // Helper: Generate slug from title
  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
}

