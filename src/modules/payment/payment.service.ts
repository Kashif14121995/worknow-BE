import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Payment, Transaction, Wallet, PaymentDocument, TransactionDocument, WalletDocument, User, Counter, CounterDocument, JobPosting, Shift, ShiftDocument } from 'src/schemas';
import { WalletDocument as WalletDocType } from 'src/schemas/payment.schema';
import { StripeService } from '../stripe/stripe.service';
import { PaymentTypeEnum, TransactionStatus } from 'src/schemas/payment.schema';
import { MailService } from '../mail/mail.service';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from 'src/schemas/notification.schema';

@Injectable()
export class PaymentService {
  constructor(
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
    @InjectModel(Transaction.name) private transactionModel: Model<TransactionDocument>,
    @InjectModel(Wallet.name) private walletModel: Model<WalletDocType>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Counter.name) private counterModel: Model<CounterDocument>,
    @InjectModel(JobPosting.name) private jobPostingModel: Model<JobPosting>,
    @InjectModel(Shift.name) private shiftModel: Model<ShiftDocument>,
    private stripeService: StripeService,
    private mailService: MailService,
  ) {}

  // Initialize wallet for a user
  async initializeWallet(userId: string): Promise<WalletDocType> {
    const existingWallet = await this.walletModel.findOne({ userId });
    if (existingWallet) {
      return existingWallet;
    }

    // Create Stripe customer if not exists
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const stripeCustomer = await this.stripeService.createCustomer(
      user.email,
      `${user.first_name} ${user.last_name}`,
    );

    const wallet = await this.walletModel.create({
      userId: new Types.ObjectId(userId),
      balance: 0,
      pendingBalance: 0,
      totalEarnings: 0,
      totalSpent: 0,
      stripeCustomerId: stripeCustomer.id,
    });

    return wallet;
  }

  // Get wallet balance
  async getWalletBalance(userId: string): Promise<WalletDocType> {
    let wallet: WalletDocType | null = await this.walletModel.findOne({ userId });
    if (!wallet) {
      wallet = await this.initializeWallet(userId);
    }
    return wallet;
  }

  // Provider: Pay for job posting
  async payForJobPosting(userId: string, jobId: string, amount: number): Promise<Payment> {
    const user = await this.userModel.findById(userId);
    if (!user || user.role !== 'job_provider') {
      throw new ForbiddenException('Only job providers can pay for job postings');
    }

    const wallet = await this.getWalletBalance(userId);

    // Create payment intent with Stripe
    const paymentIntent = await this.stripeService.createPaymentIntent(
      amount * 100, // Convert to cents
      'USD',
      wallet.stripeCustomerId,
    );

    // Generate payment ID using counter
    const counter = await this.counterModel.findOneAndUpdate(
      { id: 'paymentId' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true },
    );

    const paymentId = `PAY_${String(counter.seq).padStart(6, '0')}`;

    // Create payment record
    const payment = await this.paymentModel.create({
      paymentId,
      userId: new Types.ObjectId(userId),
      userRole: 'job_provider',
      paymentType: PaymentTypeEnum.JOB_POSTING_FEE,
      amount,
      currency: 'USD',
      status: TransactionStatus.PENDING,
      jobId: new Types.ObjectId(jobId),
      stripePaymentIntentId: paymentIntent.id,
      stripeCustomerId: wallet.stripeCustomerId,
      description: 'Job posting fee',
    });

    return payment;
  }

  // Provider: Process payment to seeker for completed shift
  async paySeekerForShift(providerId: string, seekerId: string, shiftId: string, amount: number): Promise<Transaction> {
    // Verify provider owns the job/shift
    const provider = await this.userModel.findById(providerId);
    if (!provider || provider.role !== 'job_provider') {
      throw new ForbiddenException('Only job providers can process payments');
    }

    const seeker = await this.userModel.findById(seekerId);
    if (!seeker || seeker.role !== 'job_seeker') {
      throw new NotFoundException('Job seeker not found');
    }

    // Get or create wallets
    const providerWallet = await this.getWalletBalance(providerId);
    const seekerWallet = await this.getWalletBalance(seekerId);

    // Generate transaction ID using counter
    const counter = await this.counterModel.findOneAndUpdate(
      { id: 'transactionId' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true },
    );

    const transactionId = `TXN_${String(counter.seq).padStart(6, '0')}`;

    // Create transaction
    const transaction = await this.transactionModel.create({
      transactionId,
      fromUserId: new Types.ObjectId(providerId),
      toUserId: new Types.ObjectId(seekerId),
      amount,
      currency: 'USD',
      status: TransactionStatus.PROCESSING,
      type: PaymentTypeEnum.SHIFT_PAYMENT,
      shiftId: new Types.ObjectId(shiftId),
      description: `Payment for completed shift`,
    });

    // Update wallets (using Stripe Transfer)
    try {
      // In a real scenario, you'd use Stripe Connect for payouts
      // For now, we'll simulate the transaction
      
      // Deduct from provider wallet
      const providerWalletDoc = providerWallet as any;
      providerWalletDoc.totalSpent += amount;
      if (providerWalletDoc.balance >= amount) {
        providerWalletDoc.balance -= amount;
      }
      await this.walletModel.findByIdAndUpdate(providerWalletDoc._id || providerWalletDoc.id, {
        totalSpent: providerWalletDoc.totalSpent,
        balance: providerWalletDoc.balance,
      });

      // Add to seeker wallet (initially as pending, then move to balance after confirmation)
      const seekerWalletDoc = seekerWallet as any;
      seekerWalletDoc.totalEarnings += amount;
      seekerWalletDoc.pendingBalance += amount;
      await this.walletModel.findByIdAndUpdate(seekerWalletDoc._id || seekerWalletDoc.id, {
        totalEarnings: seekerWalletDoc.totalEarnings,
        pendingBalance: seekerWalletDoc.pendingBalance,
      });

      // Update transaction status
      const transactionDoc = transaction as any;
      await this.transactionModel.findByIdAndUpdate(transactionDoc._id, {
        status: TransactionStatus.COMPLETED,
      });

      // Move from pending to balance (could be done via webhook after Stripe confirms)
      seekerWalletDoc.pendingBalance -= amount;
      seekerWalletDoc.balance += amount;
      await this.walletModel.findByIdAndUpdate(seekerWalletDoc._id || seekerWalletDoc.id, {
        pendingBalance: seekerWalletDoc.pendingBalance,
        balance: seekerWalletDoc.balance,
      });

      // Send email notification to seeker
      try {
        let jobTitle = 'Shift Payment';
        if (shiftId) {
          const shift = await this.shiftModel.findById(shiftId).populate('jobId').lean();
          if (shift && (shift as any).jobId) {
            const jobData = (shift as any).jobId;
            jobTitle = jobData.jobTitle || 'Shift Payment';
          }
        }
        
        if (seeker && provider) {
          await this.mailService.sendPaymentReceivedEmail({
            seekerEmail: seeker.email,
            seekerName: `${seeker.first_name} ${seeker.last_name}`,
            providerName: `${provider.first_name} ${provider.last_name}`,
            jobTitle,
            amount,
            transactionId: transaction.transactionId,
            paymentDate: new Date().toLocaleDateString(),
          });
        }
      } catch (error) {
        console.error('Error sending payment received email:', error);
      }

    } catch (error) {
      transaction.status = TransactionStatus.FAILED;
      await transaction.save();
      throw new Error(`Payment processing failed: ${error.message}`);
    }

    return transaction;
  }

  // Seeker: Withdraw earnings
  async withdrawEarnings(userId: string, amount: number, accountDetails: any): Promise<Transaction> {
    const user = await this.userModel.findById(userId);
    if (!user || user.role !== 'job_seeker') {
      throw new ForbiddenException('Only job seekers can withdraw earnings');
    }

    const wallet = await this.getWalletBalance(userId);

    if (wallet.balance < amount) {
      throw new BadRequestException('Insufficient balance');
    }

    // Generate transaction ID using counter
    const counter = await this.counterModel.findOneAndUpdate(
      { id: 'transactionId' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true },
    );

    const transactionId = `TXN_${String(counter.seq).padStart(6, '0')}`;

    // Create withdrawal transaction
    const transaction = await this.transactionModel.create({
      transactionId,
      fromUserId: new Types.ObjectId(userId),
      amount,
      currency: 'USD',
      status: TransactionStatus.PROCESSING,
      type: PaymentTypeEnum.EARNINGS_WITHDRAWAL,
      description: `Withdrawal to ${accountDetails.accountType || 'bank account'}`,
    });

    // In real scenario, use Stripe Connect to transfer to bank account
    // For now, we'll update the wallet
    const walletDoc = wallet as any;
    walletDoc.balance -= amount;
    await this.walletModel.findByIdAndUpdate(walletDoc._id || walletDoc.id, {
      balance: walletDoc.balance,
    });

    transaction.status = TransactionStatus.COMPLETED;
    await transaction.save();

    return transaction;
  }

  // Get transaction history
  async getTransactionHistory(
    userId: string,
    page: number = 1,
    limit: number = 20,
    type?: PaymentTypeEnum,
    status?: TransactionStatus,
  ) {
    const skip = (page - 1) * limit;
    const userIdObj = new Types.ObjectId(userId);

    const filter: any = {
      $or: [
        { fromUserId: userIdObj },
        { toUserId: userIdObj },
      ],
    };

    if (type) {
      filter.type = type;
    }

    if (status) {
      filter.status = status;
    }

    const [transactions, total] = await Promise.all([
      this.transactionModel
        .find(filter)
        .populate('fromUserId', 'first_name last_name email')
        .populate('toUserId', 'first_name last_name email')
        .populate('jobId', 'jobTitle jobId')
        .populate('shiftId', 'shiftId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.transactionModel.countDocuments(filter),
    ]);

    return {
      transactions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Get payment history (for payments made/received)
  async getPaymentHistory(
    userId: string,
    page: number = 1,
    limit: number = 20,
    paymentType?: PaymentTypeEnum,
    status?: TransactionStatus,
  ) {
    const skip = (page - 1) * limit;
    const userIdObj = new Types.ObjectId(userId);

    const filter: any = { userId: userIdObj };

    if (paymentType) {
      filter.paymentType = paymentType;
    }

    if (status) {
      filter.status = status;
    }

    const [payments, total] = await Promise.all([
      this.paymentModel
        .find(filter)
        .populate('jobId', 'jobTitle jobId')
        .populate('shiftId', 'shiftId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.paymentModel.countDocuments(filter),
    ]);

    return {
      payments,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Provider: Get payment summary (expenditure tracking)
  async getProviderPaymentSummary(providerId: string) {
    const providerObjectId = new Types.ObjectId(providerId);

    // Get all payments made by provider
    const payments = await this.paymentModel.find({
      userId: providerObjectId,
      userRole: 'job_provider',
    }).lean();

    // Get all transactions where provider is sender
    const transactions = await this.transactionModel.find({
      fromUserId: providerObjectId,
    }).lean();

    const wallet = await this.getWalletBalance(providerId);

    // Calculate totals
    const totalExpenditure = payments.reduce((sum, p) => sum + p.amount, 0) +
      transactions.reduce((sum, t) => sum + t.amount, 0);

    const jobPostingFees = payments
      .filter(p => p.paymentType === PaymentTypeEnum.JOB_POSTING_FEE)
      .reduce((sum, p) => sum + p.amount, 0);

    const shiftPayments = transactions
      .filter(t => t.type === PaymentTypeEnum.SHIFT_PAYMENT)
      .reduce((sum, t) => sum + t.amount, 0);

    const processedPayments = payments
      .filter(p => p.status === TransactionStatus.COMPLETED)
      .reduce((sum, p) => sum + p.amount, 0) +
      transactions
        .filter(t => t.status === TransactionStatus.COMPLETED && t.type === PaymentTypeEnum.SHIFT_PAYMENT)
        .reduce((sum, t) => sum + t.amount, 0);

    const pendingPayments = payments
      .filter(p => p.status === TransactionStatus.PENDING || p.status === TransactionStatus.PROCESSING)
      .reduce((sum, p) => sum + p.amount, 0) +
      transactions
        .filter(t => (t.status === TransactionStatus.PENDING || t.status === TransactionStatus.PROCESSING) && t.type === PaymentTypeEnum.SHIFT_PAYMENT)
        .reduce((sum, t) => sum + t.amount, 0);

    return {
      totalExpenditure,
      jobPostingFees,
      shiftPayments,
      processed: processedPayments,
      pending: pendingPayments,
      walletBalance: wallet.balance,
      totalSpent: wallet.totalSpent,
    };
  }

  // Seeker: Get earnings summary (for dashboard)
  async getSeekerPaymentSummary(seekerId: string) {
    const seekerObjectId = new Types.ObjectId(seekerId);

    // Get all transactions where seeker is recipient
    const transactions = await this.transactionModel.find({
      toUserId: seekerObjectId,
      type: PaymentTypeEnum.SHIFT_PAYMENT,
    }).lean();

    const wallet = await this.getWalletBalance(seekerId);

    // Calculate totals
    const totalEarnings = transactions.reduce((sum, t) => sum + t.amount, 0);

    const processed = transactions
      .filter(t => t.status === TransactionStatus.COMPLETED)
      .reduce((sum, t) => sum + t.amount, 0);

    const pending = transactions
      .filter(t => t.status === TransactionStatus.PENDING || t.status === TransactionStatus.PROCESSING)
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      totalExpenditure: totalEarnings, // Total earnings
      processed,
      pending,
      walletBalance: wallet.balance,
      totalEarnings: wallet.totalEarnings,
      pendingBalance: wallet.pendingBalance,
    };
  }
}

