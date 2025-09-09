#!/usr/bin/env node

/**
 * Token Contract Address Helper
 * Run this script to get token contract addresses for your project
 */

import dotenv from 'dotenv';
import { ethers } from 'ethers';
import { TEST_TOKEN_ADDRESSES, verifyTokenContract } from '../utils/token-setup';

// Load environment variables
dotenv.config({ path: 'everware.env' });

async function main() {
  console.log('\n🔗 Credit SaaS - Token Contract Address Helper\n');
  console.log('================================================\n');

  // Display available test tokens
  console.log('📋 Ready-to-Use Test Token Addresses:\n');
  
  console.log('🔵 Sepolia Testnet:');
  console.log(`   USDC: ${TEST_TOKEN_ADDRESSES.sepolia.USDC}`);
  console.log(`   USDT: ${TEST_TOKEN_ADDRESSES.sepolia.USDT}`);
  console.log(`   WETH: ${TEST_TOKEN_ADDRESSES.sepolia.WETH}`);
  
  console.log('\n🟣 Polygon Mumbai:');
  console.log(`   USDC: ${TEST_TOKEN_ADDRESSES.mumbai.USDC}`);
  console.log(`   USDT: ${TEST_TOKEN_ADDRESSES.mumbai.USDT}`);

  console.log('\n📝 How to Use:\n');
  console.log('1. Choose a token address from above');
  console.log('2. Copy it to your .env file:');
  console.log('   TOKEN_CONTRACT_ADDRESS=0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238');
  console.log('3. Make sure your BLOCKCHAIN_RPC_URL matches the network');
  console.log('4. Restart your application\n');

  // Test a few contracts if RPC URL is available
  const rpcUrl = process.env.BLOCKCHAIN_RPC_URL;
  if (rpcUrl) {
    console.log('🔍 Verifying token contracts...\n');
    
    try {
      // Test Sepolia USDC
      const usdcInfo = await verifyTokenContract(rpcUrl, TEST_TOKEN_ADDRESSES.sepolia.USDC);
      if (usdcInfo.isValid) {
        console.log(`✅ Sepolia USDC: ${usdcInfo.name} (${usdcInfo.symbol})`);
        console.log(`   Decimals: ${usdcInfo.decimals}, Supply: ${usdcInfo.totalSupply}`);
      }
      
      // Test current configured token
      const configuredToken = process.env.TOKEN_CONTRACT_ADDRESS;
      if (configuredToken && configuredToken !== 'your-test-token-contract-address') {
        const tokenInfo = await verifyTokenContract(rpcUrl, configuredToken);
        console.log(`\n🎯 Your Current Token: ${configuredToken}`);
        if (tokenInfo.isValid) {
          console.log(`✅ Valid: ${tokenInfo.name} (${tokenInfo.symbol})`);
        } else {
          console.log(`❌ Invalid or unreachable contract`);
        }
      }
    } catch (error) {
      console.log('⚠️  Could not verify contracts (check your RPC URL)');
    }
  } else {
    console.log('⚠️  Set BLOCKCHAIN_RPC_URL in .env to verify contracts');
  }

  console.log('\n🚀 Quick Setup Commands:\n');
  console.log('# For Sepolia USDC:');
  console.log('echo "TOKEN_CONTRACT_ADDRESS=0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238" >> .env');
  
  console.log('\n# For Sepolia WETH:');
  console.log('echo "TOKEN_CONTRACT_ADDRESS=0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14" >> .env');

  console.log('\n📖 Need a custom token? Visit:');
  console.log('   • Remix IDE: https://remix.ethereum.org');
  console.log('   • OpenZeppelin Wizard: https://docs.openzeppelin.com/contracts/4.x/wizard');
  console.log('   • Hardhat: https://hardhat.org/tutorial/');

  console.log('\n✨ Your current .env configuration:');
  console.log(`   BLOCKCHAIN_NETWORK: ${process.env.BLOCKCHAIN_NETWORK || 'not set'}`);
  console.log(`   BLOCKCHAIN_RPC_URL: ${process.env.BLOCKCHAIN_RPC_URL ? 'configured' : 'not set'}`);
  console.log(`   TOKEN_CONTRACT_ADDRESS: ${process.env.TOKEN_CONTRACT_ADDRESS || 'not set'}`);
  console.log(`   MASTER_WALLET_ADDRESS: ${process.env.MASTER_WALLET_ADDRESS || 'not set'}`);
  
  console.log('\n');
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export default main;
