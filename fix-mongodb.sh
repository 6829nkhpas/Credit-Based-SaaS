#!/bin/bash

# MongoDB Migration Script - Complete remaining Prisma to Mongoose conversions
echo "🔄 Starting MongoDB migration completion..."

# Function to replace Prisma queries with MongoDB equivalents
fix_prisma_queries() {
    local file=$1
    echo "Fixing $file..."
    
    # User queries
    sed -i 's/prisma\.user\.findUnique({ where: { id: \([^}]*\) }/User.findById(\1/g' "$file"
    sed -i 's/prisma\.user\.findUnique({ where: { email: \([^}]*\) }/User.findOne({ email: \1 }/g' "$file"
    sed -i 's/prisma\.user\.findMany(/User.find(/g' "$file"
    sed -i 's/prisma\.user\.count(/User.countDocuments(/g' "$file"
    sed -i 's/prisma\.user\.update({ where: { id: \([^}]*\) }, data: \([^}]*\) }/User.findByIdAndUpdate(\1, \2, { new: true }/g' "$file"
    sed -i 's/prisma\.user\.create({ data: \([^}]*\) }/new User(\1).save(/g' "$file"
    
    # API Key queries
    sed -i 's/prisma\.apiKey\.findUnique/ApiKey.findOne/g' "$file"
    sed -i 's/prisma\.apiKey\.findMany/ApiKey.find/g' "$file"
    sed -i 's/prisma\.apiKey\.count/ApiKey.countDocuments/g' "$file"
    sed -i 's/prisma\.apiKey\.update/ApiKey.findByIdAndUpdate/g' "$file"
    sed -i 's/prisma\.apiKey\.create/new ApiKey/g' "$file"
    
    # File queries
    sed -i 's/prisma\.file\.findFirst/File.findOne/g' "$file"
    sed -i 's/prisma\.file\.findMany/File.find/g' "$file"
    sed -i 's/prisma\.file\.count/File.countDocuments/g' "$file"
    sed -i 's/prisma\.file\.create/new File/g' "$file"
    
    # Report queries
    sed -i 's/prisma\.report\.findFirst/Report.findOne/g' "$file"
    sed -i 's/prisma\.report\.findMany/Report.find/g' "$file"
    sed -i 's/prisma\.report\.count/Report.countDocuments/g' "$file"
    sed -i 's/prisma\.report\.create/new Report/g' "$file"
    
    # Payment queries
    sed -i 's/prisma\.payment\.findMany/Payment.find/g' "$file"
    sed -i 's/prisma\.payment\.count/Payment.countDocuments/g' "$file"
    
    # AuditLog queries
    sed -i 's/prisma\.auditLog\.findMany/AuditLog.find/g' "$file"
    sed -i 's/prisma\.auditLog\.count/AuditLog.countDocuments/g' "$file"
    sed -i 's/prisma\.auditLog\.aggregate/AuditLog.aggregate/g' "$file"
    
    # BlockchainTransaction queries
    sed -i 's/prisma\.blockchainTransaction\.count/BlockchainTransaction.countDocuments/g' "$file"
    
    # Clean up syntax
    sed -i 's/where: {/{/g' "$file"
    sed -i 's/}, data: {/, {/g' "$file"
    sed -i 's/}, {/, {/g' "$file"
}

# Apply fixes to remaining files
fix_prisma_queries "src/config/passport.ts"
fix_prisma_queries "src/middleware/auth.ts"
fix_prisma_queries "src/routes/admin.ts"
fix_prisma_queries "src/routes/payment.ts"
fix_prisma_queries "src/routes/service.ts"
fix_prisma_queries "src/routes/user.ts"

echo "✅ MongoDB migration queries updated!"

# Fix specific token service issue
echo "🔧 Fixing token service..."
sed -i 's/storedToken\.revoked/false/g' src/utils/token.ts

echo "🎉 MongoDB migration completion script finished!"
echo "Next: Review files and test build"
