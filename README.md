# Credit-Based SaaS Platform with Blockchain Layer

A secure, scalable credit-based SaaS platform that seamlessly integrates blockchain technology for transparent credit operations. Users interact with a traditional Web2 interface while blockchain transactions handle credit transfers in the background.

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web2 Client   │────│  Express API    │────│   PostgreSQL    │
│   (React/Vue)   │    │  (Node.js/TS)   │    │   Database      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                │
                       ┌─────────────────┐    ┌─────────────────┐
                       │  Blockchain     │────│   AWS S3/R2     │
                       │  (Ethereum)     │    │  File Storage   │
                       └─────────────────┘    └─────────────────┘
```

## 🚀 Features

### Authentication & Authorization
- **Email/Password**: Secure registration and login with Argon2 password hashing
- **OAuth Integration**: Google and GitHub sign-in support
- **JWT Tokens**: Short-lived access tokens (15m) with refresh token rotation (7d)
- **API Keys**: Scoped API keys for machine clients (read-only, write-only, admin)
- **Role-Based Access**: Admin, User, and Service roles with granular permissions

### Credit System
- **Initial Credits**: 50 free credits for new users
- **Credit Actions**: File upload (10), report generation (5), export (2), API calls (3)
- **Purchase Credits**: Stripe and Razorpay integration for credit top-ups
- **Admin Management**: Manual credit adjustments with audit trails

### Blockchain Integration (Hidden Layer)
- **Transparent Operations**: All credit deductions mirrored as blockchain transactions
- **Ethereum Testnet**: Sepolia network with ERC20 test tokens
- **Master Wallet**: Backend-managed wallet for credit token transfers
- **Transaction Logging**: Complete audit trail with transaction hashes
- **Status Tracking**: Real-time transaction confirmation monitoring

### File & Report Management
- **Secure Upload**: File uploads to AWS S3/Cloudflare R2 with validation
- **Report Generation**: Dynamic report creation with metadata support
- **Download URLs**: Presigned URLs for secure file access
- **Credit Enforcement**: All operations require sufficient credits

### Security Features
- **Password Security**: Argon2 hashing with configurable parameters
- **Input Validation**: Comprehensive validation with Joi schemas
- **Rate Limiting**: Protection against brute force attacks
- **HTTPS Enforcement**: Secure transport with security headers
- **SQL Injection Protection**: Prisma ORM with parameterized queries
- **XSS Prevention**: Content Security Policy and sanitization

## 📋 API Endpoints

### Authentication
```http
POST /api/auth/signup          # Register new user
POST /api/auth/login           # Email/password login
POST /api/auth/refresh         # Refresh access token
POST /api/auth/logout          # Logout (revoke tokens)
GET  /api/auth/google          # Google OAuth login
GET  /api/auth/github          # GitHub OAuth login
```

### User Operations
```http
GET  /api/user/profile         # Get user profile
GET  /api/user/credits         # Check credit balance
GET  /api/user/credits/history # Credit usage history
POST /api/user/upload          # Upload file (10 credits)
POST /api/user/reports/generate # Generate report (5 credits)
GET  /api/user/reports/:id/download # Download report (2 credits)
GET  /api/user/files           # List files (free)
GET  /api/user/reports         # List reports (free)
```

### Admin Operations
```http
GET  /api/admin/users          # List all users
PUT  /api/admin/users/:id      # Update user
POST /api/admin/users/credits/add # Add credits to user
POST /api/admin/api-keys       # Create API key
GET  /api/admin/api-keys       # List API keys
DELETE /api/admin/api-keys/:id # Revoke API key
GET  /api/admin/audit-logs     # View audit logs
GET  /api/admin/stats          # System statistics
```

### Service API (API Key Required)
```http
GET  /api/service/metadata/:id # Fetch metadata (3 credits)
GET  /api/service/resources    # List resources (free)
GET  /api/service/credits      # Check balance (free)
GET  /api/service/api-key/info # API key information
```

### Payment Integration
```http
POST /api/payment/create-intent # Create payment intent
POST /api/payment/confirm       # Confirm payment
GET  /api/payment/history       # Payment history
GET  /api/payment/pricing       # Pricing tiers
POST /api/payment/webhook/stripe # Stripe webhook
```

## 🛠️ Installation & Setup

### Prerequisites
- Node.js 18+ and npm/yarn
- PostgreSQL 14+
- Redis (for session management)
- AWS S3 bucket or Cloudflare R2
- Ethereum testnet access (Infura/Alchemy)

### Environment Configuration

```bash
# Copy environment template
cp .env.example .env

# Configure required variables
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/credit_saas"

# JWT Secrets (generate strong random keys)
JWT_ACCESS_SECRET=your-super-secret-jwt-access-key
JWT_REFRESH_SECRET=your-super-secret-jwt-refresh-key

# OAuth Credentials
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# Blockchain Configuration
BLOCKCHAIN_NETWORK=sepolia
BLOCKCHAIN_RPC_URL=https://sepolia.infura.io/v3/your-infura-key
MASTER_WALLET_PRIVATE_KEY=your-master-wallet-private-key
TOKEN_CONTRACT_ADDRESS=your-test-token-contract-address

# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-s3-bucket-name

# Payment Integration
STRIPE_SECRET_KEY=sk_test_your-stripe-secret-key
RAZORPAY_KEY_ID=rzp_test_your-razorpay-key-id
```

### Installation Steps

```bash
# 1. Clone and install dependencies
git clone <repository-url>
cd credit-saas-backend
npm install

# 2. Setup database
npx prisma migrate deploy
npx prisma generate

# 3. Seed initial data
npm run seed

# 4. Start development server
npm run dev

# 5. Run tests
npm test
```

### Docker Setup (Optional)

```bash
# Build and run with Docker Compose
docker-compose up -d

# Run migrations in container
docker-compose exec app npx prisma migrate deploy
docker-compose exec app npm run seed
```

## 🔧 Configuration Guide

### Blockchain Setup

1. **Create Ethereum Wallet**: Generate a new wallet for the master account
2. **Fund Wallet**: Add test ETH to the wallet for gas fees
3. **Deploy Test Token**: Deploy an ERC20 token contract for credit operations
4. **Configure RPC**: Set up Infura/Alchemy endpoint for reliable blockchain access

### AWS S3 Setup

1. **Create S3 Bucket**: Set up a new S3 bucket with appropriate permissions
2. **Configure CORS**: Allow cross-origin requests from your client domains
3. **IAM Permissions**: Create IAM user with S3 read/write permissions
4. **Bucket Policy**: Restrict access to your application's IP ranges

### Payment Integration

1. **Stripe Setup**: Create Stripe account and obtain test API keys
2. **Razorpay Setup**: Create Razorpay account for Indian market support
3. **Webhook Configuration**: Set up webhook endpoints for payment confirmations
4. **Test Payments**: Use test cards to verify payment flow

## 📊 Credit System

### Action Costs
| Action | Cost (Credits) | Description |
|--------|----------------|-------------|
| Upload File | 10 | Upload and store file in S3 |
| Generate Report | 5 | Create report from data |
| Export Report | 2 | Download generated report |
| API Key Action | 3 | Service API metadata fetch |
| List Files/Reports | 0 | Read-only operations |

### Pricing Tiers
| Tier | Credits | Price (USD) | Price per Credit |
|------|---------|-------------|------------------|
| Starter | 100 | $9.99 | $0.0999 |
| Professional | 500 | $39.99 | $0.0799 |
| Enterprise | 1000 | $69.99 | $0.0699 |
| Premium | 2500 | $149.99 | $0.0599 |

## 🔒 Security Implementation

### Password Security
- **Argon2**: Memory-hard hashing algorithm resistant to GPU attacks
- **Salt**: Unique salt per password for rainbow table protection
- **Work Factor**: Configurable time/memory cost parameters
- **Strength Validation**: Enforced complexity requirements

### Authentication Security
- **Short-lived Tokens**: 15-minute access token expiry
- **Refresh Rotation**: New refresh token issued on each refresh
- **Token Revocation**: Blacklist for compromised tokens
- **API Key Scoping**: Limited permissions per key type

### Transport Security
- **HTTPS Only**: All communications encrypted in transit
- **HSTS**: HTTP Strict Transport Security headers
- **CSP**: Content Security Policy for XSS prevention
- **CORS**: Controlled cross-origin resource sharing

### Data Protection
- **Input Validation**: Comprehensive schema validation
- **SQL Injection**: Parameterized queries via Prisma ORM
- **File Upload Security**: MIME type validation and size limits
- **Rate Limiting**: Protection against brute force attacks

## 📈 Monitoring & Logging

### Audit Trail
- **User Actions**: Complete log of all credit-consuming operations
- **Blockchain Transactions**: Transaction hash and status tracking
- **Admin Actions**: Full audit of administrative operations
- **Security Events**: Authentication failures and suspicious activity

### Performance Monitoring
- **Response Times**: API endpoint performance tracking
- **Error Rates**: Real-time error monitoring and alerting
- **Credit Usage**: Analytics on credit consumption patterns
- **Blockchain Status**: Transaction confirmation monitoring

## 🧪 Testing

### Test Coverage
- **Unit Tests**: Service layer and utility function tests
- **Integration Tests**: API endpoint and database tests
- **Security Tests**: Authentication and authorization tests
- **Blockchain Tests**: Mock blockchain integration tests

### Running Tests
```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- password.test.ts

# Watch mode for development
npm run test:watch
```

## 🚀 Deployment

### Production Checklist
- [ ] Strong JWT secrets configured
- [ ] Database connection pooling enabled
- [ ] Redis session store configured
- [ ] HTTPS certificates installed
- [ ] Environment variables secured
- [ ] Rate limiting configured
- [ ] Monitoring and alerting set up
- [ ] Backup strategy implemented
- [ ] Blockchain wallet secured

### Environment Variables (Production)
```bash
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@prod-db:5432/credit_saas
REDIS_URL=redis://prod-redis:6379
# ... other production configurations
```

## 🔧 API Testing

### Postman Collection

The repository includes a comprehensive Postman collection with:
- Pre-configured environments (development, staging, production)
- Authentication flow examples
- All API endpoints with sample requests
- Automated tests for response validation

### Example Requests

```bash
# Register new user
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!","name":"Test User"}'

# Upload file (requires authentication)
curl -X POST http://localhost:3000/api/user/upload \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -F "file=@example.pdf"

# Check credit balance
curl -X GET http://localhost:3000/api/user/credits \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Write comprehensive tests for new features
- Update documentation for API changes
- Follow security-first development principles

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support, email support@example.com or create an issue in the repository.

## 🙏 Acknowledgments

- [Prisma](https://prisma.io) for excellent ORM and database management
- [Ethers.js](https://ethers.org) for blockchain integration
- [Express.js](https://expressjs.com) for robust API framework
- [Argon2](https://github.com/ranisalt/node-argon2) for secure password hashing

---

**⚠️ Security Notice**: This is a demonstration project. Ensure proper security auditing before production deployment.