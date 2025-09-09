import { ethers } from 'ethers';
import { config } from '../config/environment';
import { logger } from '../utils/logger';
import { BlockchainTransaction } from '../models';

// ERC20 Token ABI (minimal)
const ERC20_ABI = [
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)',
];

export class BlockchainService {
  private provider: ethers.JsonRpcProvider;
  private masterWallet: ethers.Wallet;
  private tokenContract: ethers.Contract;

  constructor() {
    // Initialize provider
    this.provider = new ethers.JsonRpcProvider(config.BLOCKCHAIN_RPC_URL);
    
    // Initialize master wallet
    this.masterWallet = new ethers.Wallet(config.MASTER_WALLET_PRIVATE_KEY, this.provider);
    
    // Initialize token contract
    this.tokenContract = new ethers.Contract(
      config.TOKEN_CONTRACT_ADDRESS,
      ERC20_ABI,
      this.masterWallet
    );
  }

  /**
   * Transfer tokens representing credits
   */
  async transferCredits(userId: string, credits: number): Promise<string> {
    try {
      // Convert credits to token amount (assuming 1 credit = 1 token with 18 decimals)
      const decimals = await this.tokenContract.decimals();
      const amount = ethers.parseUnits(credits.toString(), decimals);

      // Create a unique address for this transaction (or use a burn address)
      const burnAddress = '0x000000000000000000000000000000000000dEaD';

      // Execute the transfer
      const tx = await this.tokenContract.transfer(burnAddress, amount);
      
      logger.info('Blockchain transaction initiated', {
        userId,
        credits,
        txHash: tx.hash,
        amount: amount.toString(),
      });

      // Store transaction in database
      const blockchainTx = new BlockchainTransaction({
        txHash: tx.hash,
        fromAddr: this.masterWallet.address,
        toAddr: burnAddress,
        amount: amount.toString(),
        credits,
        userId,
        status: 'pending',
      });

      await blockchainTx.save();

      // Wait for confirmation (optional, can be done async)
      this.confirmTransaction(tx.hash).catch((error) => {
        logger.error('Failed to confirm transaction', { txHash: tx.hash, error });
      });

      return tx.hash;
    } catch (error) {
      logger.error('Blockchain transaction failed', { userId, credits, error });
      throw new Error('Failed to process blockchain transaction');
    }
  }

  /**
   * Confirm transaction and update database
   */
  private async confirmTransaction(txHash: string): Promise<void> {
    try {
      const receipt = await this.provider.waitForTransaction(txHash, 1, 300000); // 5 min timeout
      
      if (receipt) {
        await BlockchainTransaction.findOneAndUpdate(
          { txHash },
          {
            status: receipt.status === 1 ? 'confirmed' : 'failed',
            blockNumber: receipt.blockNumber,
            gasUsed: receipt.gasUsed.toString(),
            confirmedAt: new Date(),
          }
        );

        logger.info('Transaction confirmed', {
          txHash,
          blockNumber: receipt.blockNumber,
          status: receipt.status === 1 ? 'confirmed' : 'failed',
        });
      }
    } catch (error) {
      logger.error('Failed to confirm transaction', { txHash, error });
      
      await BlockchainTransaction.findOneAndUpdate(
        { txHash },
        { status: 'failed' }
      );
    }
  }

  /**
   * Get master wallet balance
   */
  async getMasterWalletBalance(): Promise<string> {
    try {
      const balance = await this.tokenContract.balanceOf(this.masterWallet.address);
      const decimals = await this.tokenContract.decimals();
      return ethers.formatUnits(balance, decimals);
    } catch (error) {
      logger.error('Failed to get master wallet balance', { error });
      throw new Error('Failed to get wallet balance');
    }
  }

  /**
   * Get transaction status
   */
  async getTransactionStatus(txHash: string): Promise<{
    status: string;
    confirmations: number;
    blockNumber?: number;
  }> {
    try {
      const tx = await this.provider.getTransaction(txHash);
      const receipt = await this.provider.getTransactionReceipt(txHash);
      
      if (!tx) {
        return { status: 'not_found', confirmations: 0 };
      }

      if (!receipt) {
        return { status: 'pending', confirmations: 0 };
      }

      const currentBlock = await this.provider.getBlockNumber();
      const confirmations = currentBlock - receipt.blockNumber + 1;

      return {
        status: receipt.status === 1 ? 'confirmed' : 'failed',
        confirmations,
        blockNumber: receipt.blockNumber,
      };
    } catch (error) {
      logger.error('Failed to get transaction status', { txHash, error });
      return { status: 'error', confirmations: 0 };
    }
  }

  /**
   * Validate blockchain configuration
   */
  async validateConfiguration(): Promise<boolean> {
    try {
      // Check if provider is connected
      await this.provider.getNetwork();
      
      // Check if master wallet has funds
      const ethBalance = await this.provider.getBalance(this.masterWallet.address);
      if (ethBalance === 0n) {
        logger.warn('Master wallet has no ETH for gas fees');
      }

      // Check if token contract is valid
      await this.tokenContract.decimals();
      
      logger.info('Blockchain configuration validated successfully');
      return true;
    } catch (error) {
      logger.error('Blockchain configuration validation failed', { error });
      return false;
    }
  }
}
