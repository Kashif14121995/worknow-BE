import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Invoice,
  InvoiceDocument,
  User,
  Transaction,
  Shift,
  JobPosting,
  Payment,
  Counter,
  CounterDocument,
} from 'src/schemas';
import { InvoiceType, InvoiceStatus } from 'src/schemas/invoice.schema';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { MailService } from '../mail/mail.service';
import { InvoicePdfService } from './invoice-pdf.service';

@Injectable()
export class InvoiceService {
  constructor(
    @InjectModel(Invoice.name) private invoiceModel: Model<InvoiceDocument>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Transaction.name) private transactionModel: Model<Transaction>,
    @InjectModel(Shift.name) private shiftModel: Model<Shift>,
    @InjectModel(JobPosting.name) private jobPostingModel: Model<JobPosting>,
    @InjectModel(Payment.name) private paymentModel: Model<Payment>,
    @InjectModel(Counter.name) private counterModel: Model<CounterDocument>,
    private mailService: MailService,
    private invoicePdfService?: InvoicePdfService,
  ) {}

  // Generate invoice number (e.g., INV-2024-001)
  private async generateInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const counter = await this.counterModel.findOneAndUpdate(
      { id: `invoiceNumber_${year}` },
      { $inc: { seq: 1 } },
      { new: true, upsert: true },
    );

    return `INV-${year}-${String(counter.seq).padStart(4, '0')}`;
  }

  // Create invoice manually
  async createInvoice(issuedByUserId: string, dto: CreateInvoiceDto): Promise<Invoice> {
    const issuer = await this.userModel.findById(issuedByUserId);
    if (!issuer) {
      throw new NotFoundException('Issuer user not found');
    }

    const recipient = await this.userModel.findById(dto.issuedTo);
    if (!recipient) {
      throw new NotFoundException('Recipient user not found');
    }

    // Generate invoice IDs
    const counter = await this.counterModel.findOneAndUpdate(
      { id: 'invoiceId' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true },
    );

    const invoiceId = `INV_${String(counter.seq).padStart(6, '0')}`;
    const invoiceNumber = await this.generateInvoiceNumber();

    // Calculate due date (default 30 days from issue date)
    const issueDate = new Date();
    const dueDate = dto.dueDate ? new Date(dto.dueDate) : new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    const invoice = await this.invoiceModel.create({
      invoiceId,
      invoiceNumber,
      issuedTo: new Types.ObjectId(dto.issuedTo),
      issuedBy: new Types.ObjectId(issuedByUserId),
      invoiceType: dto.invoiceType,
      subtotal: dto.subtotal,
      tax: dto.tax || 0,
      discount: dto.discount || 0,
      total: dto.total,
      currency: dto.currency || 'USD',
      status: InvoiceStatus.DRAFT,
      issueDate,
      dueDate,
      lineItems: dto.lineItems,
      ...(dto.transactionId && { transactionId: new Types.ObjectId(dto.transactionId) }),
      ...(dto.shiftId && { shiftId: new Types.ObjectId(dto.shiftId) }),
      ...(dto.jobId && { jobId: new Types.ObjectId(dto.jobId) }),
      ...(dto.paymentId && { paymentId: new Types.ObjectId(dto.paymentId) }),
      billingAddress: dto.billingAddress,
      billingEmail: dto.billingEmail || recipient.email,
      billingPhone: dto.billingPhone,
      notes: dto.notes,
      terms: dto.terms || 'Payment due within 30 days of invoice date.',
    });

    const populatedInvoice = await invoice.populate([
      { path: 'issuedTo', select: 'first_name last_name email phone_number' },
      { path: 'issuedBy', select: 'first_name last_name email' },
    ]);

    // Generate PDF if service is available
    if (this.invoicePdfService) {
      try {
        const pdfUrl = await this.invoicePdfService.generateInvoicePdf(populatedInvoice);
        await this.invoiceModel.findByIdAndUpdate(invoice._id, { pdfUrl });
      } catch (error) {
        console.error('Error generating invoice PDF:', error);
        // Don't fail invoice creation if PDF generation fails
      }
    }

    return populatedInvoice;
  }

  // Auto-generate invoice from transaction
  async generateInvoiceFromTransaction(transactionId: string): Promise<Invoice> {
    const transaction = await this.transactionModel
      .findById(transactionId)
      .populate('fromUserId')
      .populate('toUserId')
      .populate('shiftId')
      .populate('jobId')
      .lean();

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    const fromUser = transaction.fromUserId as any;
    const toUser = transaction.toUserId as any;
    const shift = transaction.shiftId as any;
    const job = transaction.jobId as any;

    // Generate invoice IDs
    const counter = await this.counterModel.findOneAndUpdate(
      { id: 'invoiceId' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true },
    );

    const invoiceId = `INV_${String(counter.seq).padStart(6, '0')}`;
    const invoiceNumber = await this.generateInvoiceNumber();

    // Determine invoice type
    let invoiceType = InvoiceType.SHIFT_PAYMENT;
    if (transaction.type === 'job_posting_fee') {
      invoiceType = InvoiceType.JOB_POSTING_FEE;
    } else if (transaction.type === 'earnings_withdrawal') {
      invoiceType = InvoiceType.WITHDRAWAL;
    }

    // Create line items
    const lineItems = [
      {
        description: job
          ? `Shift work payment for Job: ${job.jobTitle || 'N/A'}`
          : 'Service payment',
        quantity: 1,
        unitPrice: transaction.amount,
        total: transaction.amount,
      },
    ];

    // Calculate dates
    const issueDate = new Date();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    const invoice = await this.invoiceModel.create({
      invoiceId,
      invoiceNumber,
      issuedTo: transaction.toUserId,
      issuedBy: transaction.fromUserId,
      invoiceType,
      subtotal: transaction.amount,
      tax: 0,
      discount: 0,
      total: transaction.amount,
      currency: transaction.currency || 'USD',
      status: transaction.status === 'completed' ? InvoiceStatus.PAID : InvoiceStatus.SENT,
      issueDate,
      dueDate,
      paidDate: transaction.status === 'completed' ? new Date() : undefined,
      transactionId: new Types.ObjectId(transactionId),
      ...(shift && { shiftId: shift._id }),
      ...(job && { jobId: job._id }),
      lineItems,
      billingEmail: toUser?.email,
    });

    const populatedInvoice = await invoice.populate([
      { path: 'issuedTo', select: 'first_name last_name email phone_number' },
      { path: 'issuedBy', select: 'first_name last_name email' },
    ]);

    // Generate PDF if service is available
    if (this.invoicePdfService) {
      try {
        const pdfUrl = await this.invoicePdfService.generateInvoicePdf(populatedInvoice);
        await this.invoiceModel.findByIdAndUpdate(invoice._id, { pdfUrl });
        populatedInvoice.pdfUrl = pdfUrl;
      } catch (error) {
        console.error('Error generating invoice PDF:', error);
        // Don't fail invoice creation if PDF generation fails
      }
    }

    // Send invoice email
    try {
      await this.mailService.sendInvoiceEmail({
        recipientEmail: toUser?.email,
        recipientName: `${toUser?.first_name} ${toUser?.last_name}`,
        issuerName: `${fromUser?.first_name} ${fromUser?.last_name}`,
        invoiceNumber: invoice.invoiceNumber,
        invoiceId: invoice.invoiceId,
        amount: invoice.total,
        dueDate: invoice.dueDate.toLocaleDateString(),
        invoiceUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/invoices/${invoice.invoiceId}`,
      });
    } catch (error) {
      console.error('Error sending invoice email:', error);
    }

    return populatedInvoice;
  }

  // Get invoice by ID
  async getInvoiceById(invoiceId: string, userId: string): Promise<Invoice> {
    const invoice = await this.invoiceModel
      .findOne({
        $or: [{ invoiceId }, { _id: invoiceId }],
        $and: [
          {
            $or: [
              { issuedTo: new Types.ObjectId(userId) },
              { issuedBy: new Types.ObjectId(userId) },
            ],
          },
        ],
      })
      .populate('issuedTo', 'first_name last_name email phone_number')
      .populate('issuedBy', 'first_name last_name email')
      .populate('transactionId', 'transactionId amount')
      .populate('shiftId', 'shiftId startDate endDate')
      .populate('jobId', 'jobTitle jobId');

    if (!invoice) {
      throw new NotFoundException('Invoice not found or access denied');
    }

    return invoice;
  }

  // Get invoices for a user
  async getUserInvoices(
    userId: string,
    role: 'recipient' | 'issuer' | 'all',
    page: number = 1,
    limit: number = 20,
    status?: InvoiceStatus,
  ) {
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (role === 'recipient') {
      filter.issuedTo = new Types.ObjectId(userId);
    } else if (role === 'issuer') {
      filter.issuedBy = new Types.ObjectId(userId);
    } else {
      filter.$or = [
        { issuedTo: new Types.ObjectId(userId) },
        { issuedBy: new Types.ObjectId(userId) },
      ];
    }

    if (status) {
      filter.status = status;
    }

    const [invoices, total] = await Promise.all([
      this.invoiceModel
        .find(filter)
        .populate('issuedTo', 'first_name last_name email')
        .populate('issuedBy', 'first_name last_name email')
        .sort({ issueDate: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.invoiceModel.countDocuments(filter),
    ]);

    return {
      invoices,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Update invoice status
  async updateInvoiceStatus(
    invoiceId: string,
    status: InvoiceStatus,
    userId: string,
  ): Promise<Invoice> {
    const invoice = await this.invoiceModel.findOne({
      $or: [{ invoiceId }, { _id: invoiceId }],
      $and: [
        {
          $or: [
            { issuedTo: new Types.ObjectId(userId) },
            { issuedBy: new Types.ObjectId(userId) },
          ],
        },
      ],
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found or access denied');
    }

    invoice.status = status;
    if (status === InvoiceStatus.PAID) {
      invoice.paidDate = new Date();
    }

    await invoice.save();

    return invoice.populate([
      { path: 'issuedTo', select: 'first_name last_name email' },
      { path: 'issuedBy', select: 'first_name last_name email' },
    ]);
  }

  // Mark invoice as paid
  async markInvoiceAsPaid(invoiceId: string, userId: string): Promise<Invoice> {
    return this.updateInvoiceStatus(invoiceId, InvoiceStatus.PAID, userId);
  }

  // Send invoice via email
  async sendInvoiceEmail(invoiceId: string, userId: string): Promise<void> {
    const invoice = await this.getInvoiceById(invoiceId, userId);

    const recipient = invoice.issuedTo as any;
    const issuer = invoice.issuedBy as any;
    const invoiceDoc = invoice as any;

    await this.mailService.sendInvoiceEmail({
      recipientEmail: recipient.email,
      recipientName: `${recipient.first_name} ${recipient.last_name}`,
      issuerName: `${issuer.first_name} ${issuer.last_name}`,
      invoiceNumber: invoice.invoiceNumber,
      invoiceId: invoice.invoiceId,
      amount: invoice.total,
      dueDate: invoice.dueDate.toLocaleDateString(),
      invoiceUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/invoices/${invoice.invoiceId}`,
    });

    // Update status to sent
    await this.invoiceModel.findByIdAndUpdate(
      invoiceDoc._id || invoiceId,
      { status: InvoiceStatus.SENT },
      { new: true },
    );
  }

  // Generate PDF for existing invoice
  async generatePdfForInvoice(invoiceId: string, userId: string): Promise<string> {
    const invoice = await this.getInvoiceById(invoiceId, userId);
    
    if (invoice.pdfUrl) {
      return invoice.pdfUrl;
    }

    const pdfUrl = await this.invoicePdfService.generateInvoicePdf(invoice);
    
    // Update invoice with PDF URL
    const invoiceDoc = invoice as any;
    await this.invoiceModel.findByIdAndUpdate(invoiceDoc._id || invoiceId, { pdfUrl });

    return pdfUrl;
  }
}

