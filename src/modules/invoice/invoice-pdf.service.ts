import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import puppeteer from 'puppeteer';
import { Invoice } from 'src/schemas';
import { AwsService } from '../aws/aws.service';

@Injectable()
export class InvoicePdfService {
  private readonly logger = new Logger(InvoicePdfService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly awsService: AwsService,
  ) {}

  async generateInvoicePdf(invoice: any): Promise<string> {
    let browser;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      const page = await browser.newPage();

      // Generate HTML content for invoice
      const htmlContent = this.generateInvoiceHtml(invoice);

      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
      
      // Generate PDF
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20px',
          right: '20px',
          bottom: '20px',
          left: '20px',
        },
      });

      await browser.close();

      // Upload to S3
      const fileName = `invoices/${invoice.invoiceId}_${Date.now()}.pdf`;
      const pdfUrl = await this.awsService.uploadFile(
        fileName,
        pdfBuffer,
        'application/pdf',
      );

      this.logger.log(`Invoice PDF generated and uploaded: ${pdfUrl}`);
      return pdfUrl;
    } catch (error) {
      this.logger.error(`Error generating invoice PDF: ${error.message}`, error.stack);
      if (browser) {
        await browser.close();
      }
      throw error;
    }
  }

  /**
   * Generate PDF from HTML (utility method for other services)
   */
  async generatePdfFromHtml(html: string): Promise<Buffer> {
    let browser;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20px',
          right: '20px',
          bottom: '20px',
          left: '20px',
        },
      });

      await browser.close();
      return pdfBuffer;
    } catch (error) {
      this.logger.error(`Error generating PDF from HTML: ${error.message}`, error.stack);
      if (browser) {
        await browser.close();
      }
      throw error;
    }
  }

  private generateInvoiceHtml(invoice: any): string {
    const recipient = invoice.issuedTo || {};
    const issuer = invoice.issuedBy || {};
    
    const lineItemsHtml = invoice.lineItems?.map((item: any) => `
      <tr>
        <td>${item.description || ''}</td>
        <td style="text-align: center;">${item.quantity || 0}</td>
        <td style="text-align: right;">$${item.unitPrice?.toFixed(2) || '0.00'}</td>
        <td style="text-align: right;">$${item.total?.toFixed(2) || '0.00'}</td>
      </tr>
    `).join('') || '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Invoice ${invoice.invoiceNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
          .header { border-bottom: 3px solid #3498db; padding-bottom: 20px; margin-bottom: 30px; }
          .invoice-title { font-size: 32px; color: #2c3e50; margin: 0; }
          .invoice-number { color: #7f8c8d; font-size: 14px; }
          .info-section { margin-bottom: 30px; }
          .info-row { margin-bottom: 10px; }
          .label { font-weight: bold; color: #34495e; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th { background-color: #3498db; color: white; padding: 12px; text-align: left; }
          td { padding: 10px; border-bottom: 1px solid #ddd; }
          .total-row { background-color: #ecf0f1; font-weight: bold; }
          .total-section { text-align: right; margin-top: 20px; }
          .status-badge { display: inline-block; padding: 5px 10px; border-radius: 3px; font-size: 12px; }
          .status-paid { background-color: #2ecc71; color: white; }
          .status-pending { background-color: #f39c12; color: white; }
          .status-overdue { background-color: #e74c3c; color: white; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="invoice-title">INVOICE</h1>
          <p class="invoice-number">${invoice.invoiceNumber || invoice.invoiceId}</p>
        </div>

        <div style="display: flex; justify-content: space-between;">
          <div class="info-section">
            <h3>Bill To:</h3>
            <div class="info-row">
              <span class="label">Name:</span> ${recipient.first_name || ''} ${recipient.last_name || ''}
            </div>
            <div class="info-row">
              <span class="label">Email:</span> ${recipient.email || ''}
            </div>
            ${recipient.phone_number ? `<div class="info-row"><span class="label">Phone:</span> ${recipient.phone_number}</div>` : ''}
            ${invoice.billingAddress ? `<div class="info-row"><span class="label">Address:</span> ${invoice.billingAddress}</div>` : ''}
          </div>

          <div class="info-section">
            <h3>Issued By:</h3>
            <div class="info-row">
              <span class="label">Name:</span> ${issuer.first_name || ''} ${issuer.last_name || ''}
            </div>
            <div class="info-row">
              <span class="label">Email:</span> ${issuer.email || ''}
            </div>
            <div class="info-row">
              <span class="label">Invoice Date:</span> ${invoice.issueDate ? new Date(invoice.issueDate).toLocaleDateString() : 'N/A'}
            </div>
            <div class="info-row">
              <span class="label">Due Date:</span> ${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'N/A'}
            </div>
            <div class="info-row">
              <span class="label">Status:</span> 
              <span class="status-badge status-${invoice.status?.toLowerCase() || 'pending'}">${invoice.status || 'PENDING'}</span>
            </div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th style="text-align: center;">Quantity</th>
              <th style="text-align: right;">Unit Price</th>
              <th style="text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${lineItemsHtml}
          </tbody>
        </table>

        <div class="total-section">
          <div class="info-row">
            <span class="label">Subtotal:</span> $${invoice.subtotal?.toFixed(2) || '0.00'}
          </div>
          ${invoice.tax > 0 ? `<div class="info-row"><span class="label">Tax:</span> $${invoice.tax.toFixed(2)}</div>` : ''}
          ${invoice.discount > 0 ? `<div class="info-row"><span class="label">Discount:</span> -$${invoice.discount.toFixed(2)}</div>` : ''}
          <div class="info-row" style="font-size: 18px; margin-top: 10px;">
            <span class="label">Total:</span> $${invoice.total?.toFixed(2) || '0.00'}
          </div>
        </div>

        ${invoice.notes ? `<div style="margin-top: 30px;"><p><strong>Notes:</strong></p><p>${invoice.notes}</p></div>` : ''}
        ${invoice.terms ? `<div style="margin-top: 20px;"><p><strong>Payment Terms:</strong></p><p>${invoice.terms}</p></div>` : ''}

        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #7f8c8d; font-size: 12px;">
          <p>This is an automated invoice generated by WorkNow.</p>
          <p>Invoice ID: ${invoice.invoiceId}</p>
        </div>
      </body>
      </html>
    `;
  }
}

