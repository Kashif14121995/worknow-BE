import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  TaxDocument,
  TaxDocumentDocument,
  TaxDocumentType,
  TaxDocumentStatus,
  User,
  UserDocument,
  Transaction,
  TransactionDocument,
} from 'src/schemas';
import { InvoicePdfService } from '../invoice/invoice-pdf.service';
import { MailService } from '../mail/mail.service';
import { AwsService } from '../aws/aws.service';

@Injectable()
export class TaxDocumentService {
  constructor(
    @InjectModel(TaxDocument.name) private taxDocumentModel: Model<TaxDocumentDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Transaction.name) private transactionModel: Model<TransactionDocument>,
    private invoicePdfService: InvoicePdfService,
    private mailService: MailService,
    private awsService: AwsService,
  ) {}

  /**
   * Generate year-end tax document for a user
   */
  async generateYearEndTaxDocument(
    userId: string,
    taxYear: number,
    documentType: TaxDocumentType = TaxDocumentType.FORM_1099_NEC,
  ): Promise<TaxDocument> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if document already exists
    const existing = await this.taxDocumentModel.findOne({
      userId: new Types.ObjectId(userId),
      taxYear,
      documentType,
    });

    if (existing && existing.status === TaxDocumentStatus.GENERATED) {
      return existing;
    }

    // Calculate earnings for the tax year
    const yearStart = new Date(`${taxYear}-01-01`);
    const yearEnd = new Date(`${taxYear}-12-31T23:59:59`);

    const transactions = await this.transactionModel
      .find({
        userId: new Types.ObjectId(userId),
        createdAt: { $gte: yearStart, $lte: yearEnd },
        status: 'completed',
        type: { $in: ['shift_payment', 'payment_received'] },
      })
      .lean();

    const totalEarnings = transactions.reduce((sum, t: any) => sum + (t.amount || 0), 0);
    const totalFees = transactions.reduce((sum, t: any) => sum + ((t as any).platformFee || 0), 0);
    const grossEarnings = totalEarnings + totalFees;
    const netEarnings = totalEarnings;

    // Generate PDF
    const pdfBuffer = await this.generateTaxDocumentPDF({
      user,
      taxYear,
      documentType,
      totalEarnings,
      totalFees,
      grossEarnings,
      netEarnings,
      transactionCount: transactions.length,
      transactions: transactions.slice(0, 100), // Limit for PDF size
    });

    // Upload PDF to S3 (using invoice service's upload method)
    const pdfUrl = await this.uploadTaxDocumentPDF(userId, taxYear, documentType, pdfBuffer);

    // Create tax document record
    const taxDocument = await this.taxDocumentModel.create({
      userId: new Types.ObjectId(userId),
      documentType,
      taxYear,
      totalEarnings,
      totalFees,
      grossEarnings,
      netEarnings,
      transactionCount: transactions.length,
      pdfUrl,
      status: TaxDocumentStatus.GENERATED,
      generatedAt: new Date(),
      metadata: {
        transactionsSummary: transactions.map((t: any) => ({
          date: t.createdAt,
          amount: t.amount,
          fee: (t as any).platformFee || 0,
          description: t.description,
        })),
      },
    });

    return taxDocument;
  }

  /**
   * Generate tax document PDF
   */
  private async generateTaxDocumentPDF(data: {
    user: UserDocument;
    taxYear: number;
    documentType: TaxDocumentType;
    totalEarnings: number;
    totalFees: number;
    grossEarnings: number;
    netEarnings: number;
    transactionCount: number;
    transactions: any[];
  }): Promise<Buffer> {
    // Use puppeteer to generate PDF (similar to invoice PDF generation)
    const html = this.generateTaxDocumentHTML(data);
    return await this.invoicePdfService.generatePdfFromHtml(html);
  }

  /**
   * Generate HTML for tax document
   */
  private generateTaxDocumentHTML(data: {
    user: UserDocument;
    taxYear: number;
    documentType: TaxDocumentType;
    totalEarnings: number;
    totalFees: number;
    grossEarnings: number;
    netEarnings: number;
    transactionCount: number;
    transactions: any[];
  }): string {
    const docTitle = data.documentType === TaxDocumentType.FORM_1099_NEC
      ? 'Form 1099-NEC'
      : data.documentType === TaxDocumentType.FORM_W2
      ? 'Form W-2'
      : 'Year-End Tax Summary';

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
    .header { text-align: center; margin-bottom: 30px; }
    .header h1 { margin: 0; font-size: 24px; }
    .info-section { margin: 20px 0; }
    .info-row { display: flex; margin: 10px 0; }
    .info-label { font-weight: bold; width: 200px; }
    .summary-box { border: 2px solid #333; padding: 20px; margin: 20px 0; }
    .summary-item { margin: 10px 0; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f2f2f2; font-weight: bold; }
    .footer { margin-top: 40px; font-size: 12px; color: #666; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${docTitle}</h1>
    <p>Tax Year: ${data.taxYear}</p>
  </div>

  <div class="info-section">
    <h2>Taxpayer Information</h2>
    <div class="info-row">
      <div class="info-label">Name:</div>
      <div>${data.user.first_name} ${data.user.last_name}</div>
    </div>
    <div class="info-row">
      <div class="info-label">Email:</div>
      <div>${data.user.email}</div>
    </div>
    <div class="info-row">
      <div class="info-label">Tax ID / SSN:</div>
      <div>***-**-****</div>
    </div>
  </div>

  <div class="summary-box">
    <h2>Earnings Summary</h2>
    <div class="summary-item">
      <strong>Gross Earnings:</strong> $${data.grossEarnings.toFixed(2)}
    </div>
    <div class="summary-item">
      <strong>Platform Fees:</strong> $${data.totalFees.toFixed(2)}
    </div>
    <div class="summary-item">
      <strong>Net Earnings (Reported):</strong> $${data.netEarnings.toFixed(2)}
    </div>
    <div class="summary-item">
      <strong>Total Transactions:</strong> ${data.transactionCount}
    </div>
  </div>

  <div class="info-section">
    <h2>Transaction Breakdown</h2>
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Description</th>
          <th>Amount</th>
          <th>Platform Fee</th>
          <th>Net Amount</th>
        </tr>
      </thead>
      <tbody>
        ${data.transactions
          .map(
            (t) => `
        <tr>
          <td>${new Date(t.createdAt).toLocaleDateString()}</td>
          <td>${t.description || 'Payment'}</td>
          <td>$${(t.amount + (t.platformFee || 0)).toFixed(2)}</td>
          <td>$${(t.platformFee || 0).toFixed(2)}</td>
          <td>$${(t.amount || 0).toFixed(2)}</td>
        </tr>
        `,
          )
          .join('')}
      </tbody>
    </table>
  </div>

  <div class="footer">
    <p>This document is for tax reporting purposes only.</p>
    <p>Generated by WorkNow Platform on ${new Date().toLocaleDateString()}</p>
  </div>
</body>
</html>
    `;
  }

  /**
   * Upload tax document PDF to S3
   */
  private async uploadTaxDocumentPDF(
    userId: string,
    taxYear: number,
    documentType: TaxDocumentType,
    pdfBuffer: Buffer,
  ): Promise<string> {
    const fileName = `tax-documents/${userId}/${taxYear}/${documentType}-${Date.now()}.pdf`;
    return await this.awsService.uploadFile(fileName, pdfBuffer, 'application/pdf');
  }

  /**
   * Get user's tax documents
   */
  async getUserTaxDocuments(userId: string, taxYear?: number): Promise<TaxDocument[]> {
    const query: any = { userId: new Types.ObjectId(userId) };
    if (taxYear) {
      query.taxYear = taxYear;
    }

    return this.taxDocumentModel.find(query).sort({ taxYear: -1, createdAt: -1 }).lean();
  }

  /**
   * Get tax document by ID
   */
  async getTaxDocument(documentId: string, userId: string): Promise<TaxDocument> {
    const document = await this.taxDocumentModel.findOne({
      _id: new Types.ObjectId(documentId),
      userId: new Types.ObjectId(userId),
    });

    if (!document) {
      throw new NotFoundException('Tax document not found');
    }

    return document;
  }

  /**
   * Generate tax documents for all users (cron job - end of year)
   */
  async generateYearEndTaxDocumentsForAllUsers(taxYear: number): Promise<void> {
    const users = await this.userModel.find({ role: 'job_seeker' }).lean();

    for (const user of users) {
      try {
        // Check if user has earnings above threshold ($600 for 1099)
        const yearStart = new Date(`${taxYear}-01-01`);
        const yearEnd = new Date(`${taxYear}-12-31T23:59:59`);

        const transactions = await this.transactionModel
          .find({
            userId: new Types.ObjectId(user._id),
            createdAt: { $gte: yearStart, $lte: yearEnd },
            status: 'completed',
          })
          .lean();

        const totalEarnings = transactions.reduce((sum, t: any) => sum + (t.amount || 0), 0);

        // Only generate if earnings >= $600 (IRS threshold for 1099)
        if (totalEarnings >= 600) {
          await this.generateYearEndTaxDocument(user._id.toString(), taxYear);
          
          // Send email notification
          try {
            await this.mailService.sendTaxDocumentReady({
              userEmail: user.email,
              userName: `${user.first_name} ${user.last_name}`,
              taxYear,
            });
          } catch (error) {
            console.error('Error sending tax document email:', error);
          }
        }
      } catch (error) {
        console.error(`Error generating tax document for user ${user._id}:`, error);
      }
    }
  }

  /**
   * Download tax document PDF
   */
  async downloadTaxDocumentPDF(documentId: string, userId: string): Promise<Buffer> {
    const document = await this.getTaxDocument(documentId, userId);

    if (!document.pdfUrl) {
      throw new BadRequestException('PDF not yet generated');
    }

    // Download from S3 - Extract key from URL
    const urlParts = document.pdfUrl.split('.com/');
    const key = urlParts.length > 1 ? urlParts[1] : document.pdfUrl.split('/').slice(-1)[0];
    
    return await this.awsService.getFile(key);
  }
}

