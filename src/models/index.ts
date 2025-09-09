import mongoose, { Schema, Document, Model } from 'mongoose';

// User Interface and Schema
export interface IUser extends Document {
  id: string;
  email: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  credits: number;
  role: 'USER' | 'ADMIN';
  isEmailVerified: boolean;
  emailVerificationToken?: string;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  googleId?: string;
  githubId?: string;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String },
  firstName: { type: String },
  lastName: { type: String },
  credits: { type: Number, default: 0 },
  role: { type: String, enum: ['USER', 'ADMIN'], default: 'USER' },
  isEmailVerified: { type: Boolean, default: false },
  emailVerificationToken: { type: String },
  passwordResetToken: { type: String },
  passwordResetExpires: { type: Date },
  googleId: { type: String },
  githubId: { type: String },
  isActive: { type: Boolean, default: true },
  lastLoginAt: { type: Date },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
UserSchema.index({ email: 1 });
UserSchema.index({ googleId: 1 });
UserSchema.index({ githubId: 1 });
UserSchema.index({ emailVerificationToken: 1 });
UserSchema.index({ passwordResetToken: 1 });

export const User: Model<IUser> = mongoose.model<IUser>('User', UserSchema);

// RefreshToken Interface and Schema
export interface IRefreshToken extends Document {
  token: string;
  userId: string;
  expiresAt: Date;
  createdAt: Date;
}

const RefreshTokenSchema = new Schema<IRefreshToken>({
  token: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  expiresAt: { type: Date, required: true },
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

RefreshTokenSchema.index({ token: 1 });
RefreshTokenSchema.index({ userId: 1 });
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RefreshToken: Model<IRefreshToken> = mongoose.model<IRefreshToken>('RefreshToken', RefreshTokenSchema);

// ApiKey Interface and Schema
export interface IApiKey extends Document {
  id: string;
  name: string;
  keyHash: string;
  keyPrefix: string;
  userId: string;
  lastUsedAt?: Date;
  isActive: boolean;
  expiresAt?: Date;
  permissions: string[];
  createdAt: Date;
  updatedAt: Date;
}

const ApiKeySchema = new Schema<IApiKey>({
  name: { type: String, required: true },
  keyHash: { type: String, required: true },
  keyPrefix: { type: String, required: true },
  userId: { type: String, required: true },
  lastUsedAt: { type: Date },
  isActive: { type: Boolean, default: true },
  expiresAt: { type: Date },
  permissions: [{ type: String }],
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

ApiKeySchema.index({ keyHash: 1 });
ApiKeySchema.index({ userId: 1 });
ApiKeySchema.index({ keyPrefix: 1 });

export const ApiKey: Model<IApiKey> = mongoose.model<IApiKey>('ApiKey', ApiKeySchema);

// AuditLog Interface and Schema
export interface IAuditLog extends Document {
  userId: string;
  action: string;
  cost: number;
  creditsAfter: number;
  txHash?: string;
  metadata?: any;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>({
  userId: { type: String, required: true },
  action: { type: String, required: true },
  cost: { type: Number, required: true },
  creditsAfter: { type: Number, required: true },
  txHash: { type: String },
  metadata: { type: Schema.Types.Mixed },
  ipAddress: { type: String },
  userAgent: { type: String },
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

AuditLogSchema.index({ userId: 1, createdAt: -1 });
AuditLogSchema.index({ action: 1 });
AuditLogSchema.index({ txHash: 1 });

export const AuditLog: Model<IAuditLog> = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);

// File Interface and Schema
export interface IFile extends Document {
  id: string;
  originalName: string;
  fileName: string;
  mimeType: string;
  size: number;
  s3Key: string;
  s3Bucket: string;
  userId: string;
  isProcessed: boolean;
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

const FileSchema = new Schema<IFile>({
  originalName: { type: String, required: true },
  fileName: { type: String, required: true },
  mimeType: { type: String, required: true },
  size: { type: Number, required: true },
  s3Key: { type: String, required: true },
  s3Bucket: { type: String, required: true },
  userId: { type: String, required: true },
  isProcessed: { type: Boolean, default: false },
  metadata: { type: Schema.Types.Mixed },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

FileSchema.index({ userId: 1, createdAt: -1 });
FileSchema.index({ s3Key: 1 });
FileSchema.index({ fileName: 1 });

export const File: Model<IFile> = mongoose.model<IFile>('File', FileSchema);

// Report Interface and Schema
export interface IReport extends Document {
  id: string;
  title: string;
  type: 'USAGE' | 'FINANCIAL' | 'AUDIT';
  format: 'PDF' | 'CSV' | 'JSON';
  userId: string;
  generatedAt: Date;
  s3Key?: string;
  data?: any;
  createdAt: Date;
}

const ReportSchema = new Schema<IReport>({
  title: { type: String, required: true },
  type: { type: String, enum: ['USAGE', 'FINANCIAL', 'AUDIT'], required: true },
  format: { type: String, enum: ['PDF', 'CSV', 'JSON'], required: true },
  userId: { type: String, required: true },
  generatedAt: { type: Date, default: Date.now },
  s3Key: { type: String },
  data: { type: Schema.Types.Mixed },
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

ReportSchema.index({ userId: 1, createdAt: -1 });
ReportSchema.index({ type: 1 });

export const Report: Model<IReport> = mongoose.model<IReport>('Report', ReportSchema);

// Payment Interface and Schema
export interface IPayment extends Document {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  credits: number;
  provider: string;
  transactionId: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  metadata?: any;
  createdAt: Date;
  completedAt?: Date;
}

const PaymentSchema = new Schema<IPayment>({
  userId: { type: String, required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'USD' },
  credits: { type: Number, required: true },
  provider: { type: String, required: true },
  transactionId: { type: String, required: true },
  status: { type: String, enum: ['pending', 'completed', 'failed', 'refunded'], default: 'pending' },
  metadata: { type: Schema.Types.Mixed },
  completedAt: { type: Date },
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

PaymentSchema.index({ userId: 1, createdAt: -1 });
PaymentSchema.index({ transactionId: 1 });
PaymentSchema.index({ status: 1 });

export const Payment: Model<IPayment> = mongoose.model<IPayment>('Payment', PaymentSchema);

// BlockchainTransaction Interface and Schema
export interface IBlockchainTransaction extends Document {
  txHash: string;
  fromAddr: string;
  toAddr: string;
  amount: string;
  credits: number;
  userId: string;
  status: 'pending' | 'confirmed' | 'failed';
  blockNumber?: number;
  gasUsed?: string;
  metadata?: any;
  createdAt: Date;
  confirmedAt?: Date;
}

const BlockchainTransactionSchema = new Schema<IBlockchainTransaction>({
  txHash: { type: String, required: true, unique: true },
  fromAddr: { type: String, required: true },
  toAddr: { type: String, required: true },
  amount: { type: String, required: true },
  credits: { type: Number, required: true },
  userId: { type: String, required: true },
  status: { type: String, enum: ['pending', 'confirmed', 'failed'], default: 'pending' },
  blockNumber: { type: Number },
  gasUsed: { type: String },
  metadata: { type: Schema.Types.Mixed },
  confirmedAt: { type: Date },
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

BlockchainTransactionSchema.index({ txHash: 1 });
BlockchainTransactionSchema.index({ userId: 1, createdAt: -1 });
BlockchainTransactionSchema.index({ status: 1 });

export const BlockchainTransaction: Model<IBlockchainTransaction> = mongoose.model<IBlockchainTransaction>('BlockchainTransaction', BlockchainTransactionSchema);
