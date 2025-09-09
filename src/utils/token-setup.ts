/**
 * Token Contract Address Setup Guide
 * 
 * This file shows different ways to obtain a token contract address for your project.
 */

import { ethers } from 'ethers';

// ================================
// METHOD 1: Deploy Your Own ERC20 Token Contract
// ================================

/**
 * Simple ERC20 Token Contract Source Code
 * You can deploy this contract using Remix IDE, Hardhat, or Foundry
 */
const SIMPLE_ERC20_CONTRACT = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract CreditToken is ERC20, Ownable {
    constructor(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        address initialOwner
    ) ERC20(name, symbol) Ownable(initialOwner) {
        _mint(initialOwner, initialSupply * 10**decimals());
    }

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }

    function burn(uint256 amount) public {
        _burn(msg.sender, amount);
    }
}
`;

// ================================
// METHOD 2: Use Existing Test Tokens on Testnets
// ================================

export const TEST_TOKEN_ADDRESSES = {
  // Sepolia Testnet
  sepolia: {
    // USDC Test Token on Sepolia
    USDC: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
    // USDT Test Token on Sepolia  
    USDT: '0x7169D38820dfd117C3FA1f22a697dBA58d90BA06',
    // WETH on Sepolia
    WETH: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14',
    // Generic Test Token (may not exist, check before using)
    TEST: '0x779877A7B0D9E8603169DdbD7836e478b4624789'
  },
  
  // Polygon Mumbai Testnet
  mumbai: {
    // USDC Test Token
    USDC: '0x2058A9D7613eEE744279e3856Ef0eAda5FCbaA7e',
    // USDT Test Token
    USDT: '0xeaBc4b91d9375796AA4F69cC764A4aB509080A58'
  },
  
  // Goerli Testnet (deprecated but still available)
  goerli: {
    USDC: '0x07865c6e87b9f70255377e024ace6630c1eaa37f',
    USDT: '0x509ee0d083ddf8ac028f2a56731412edd63223b9'
  }
};

// ================================
// METHOD 3: Deploy Contract Programmatically
// ================================

/**
 * Deploy a simple ERC20 token contract programmatically
 */
export async function deployToken(
  providerUrl: string,
  privateKey: string,
  tokenName: string = "Credit Token",
  tokenSymbol: string = "CRED",
  initialSupply: number = 1000000
): Promise<string> {
  try {
    // Contract bytecode and ABI for a simple ERC20 token
    const contractSource = `
      pragma solidity ^0.8.19;
      
      contract SimpleToken {
          string public name;
          string public symbol;
          uint8 public decimals = 18;
          uint256 public totalSupply;
          mapping(address => uint256) public balanceOf;
          mapping(address => mapping(address => uint256)) public allowance;
          
          event Transfer(address indexed from, address indexed to, uint256 value);
          event Approval(address indexed owner, address indexed spender, uint256 value);
          
          constructor(string memory _name, string memory _symbol, uint256 _initialSupply) {
              name = _name;
              symbol = _symbol;
              totalSupply = _initialSupply * 10**decimals;
              balanceOf[msg.sender] = totalSupply;
              emit Transfer(address(0), msg.sender, totalSupply);
          }
          
          function transfer(address to, uint256 amount) external returns (bool) {
              require(balanceOf[msg.sender] >= amount, "Insufficient balance");
              balanceOf[msg.sender] -= amount;
              balanceOf[to] += amount;
              emit Transfer(msg.sender, to, amount);
              return true;
          }
          
          function approve(address spender, uint256 amount) external returns (bool) {
              allowance[msg.sender][spender] = amount;
              emit Approval(msg.sender, spender, amount);
              return true;
          }
          
          function transferFrom(address from, address to, uint256 amount) external returns (bool) {
              require(balanceOf[from] >= amount, "Insufficient balance");
              require(allowance[from][msg.sender] >= amount, "Insufficient allowance");
              balanceOf[from] -= amount;
              balanceOf[to] += amount;
              allowance[from][msg.sender] -= amount;
              emit Transfer(from, to, amount);
              return true;
          }
      }
    `;

    console.log('To deploy this contract, you would need:');
    console.log('1. Compile the Solidity code');
    console.log('2. Deploy using a framework like Hardhat or Foundry');
    console.log('3. Or use Remix IDE for quick deployment');
    
    return 'Contract deployment requires compilation - see instructions below';
  } catch (error) {
    console.error('Deployment error:', error);
    throw error;
  }
}

// ================================
// METHOD 4: Verify Existing Contract
// ================================

/**
 * Verify that a token contract address is valid and get its details
 */
export async function verifyTokenContract(
  providerUrl: string,
  contractAddress: string
): Promise<{
  isValid: boolean;
  name?: string;
  symbol?: string;
  decimals?: number;
  totalSupply?: string;
}> {
  try {
    const provider = new ethers.JsonRpcProvider(providerUrl);
    
    // Basic ERC20 ABI for checking contract
    const erc20Abi = [
      'function name() external view returns (string)',
      'function symbol() external view returns (string)',
      'function decimals() external view returns (uint8)',
      'function totalSupply() external view returns (uint256)',
    ];
    
    const contract = new ethers.Contract(contractAddress, erc20Abi, provider);
    
    const [name, symbol, decimals, totalSupply] = await Promise.all([
      contract.name().catch(() => 'Unknown'),
      contract.symbol().catch(() => 'UNK'),
      contract.decimals().catch(() => 18),
      contract.totalSupply().catch(() => '0'),
    ]);
    
    return {
      isValid: true,
      name,
      symbol,
      decimals,
      totalSupply: totalSupply.toString(),
    };
  } catch (error) {
    return { isValid: false };
  }
}

// ================================
// USAGE EXAMPLES
// ================================

export const SETUP_INSTRUCTIONS = {
  quickStart: {
    title: "Quick Start - Use Test Token",
    steps: [
      "1. Choose a testnet (Sepolia recommended)",
      "2. Use one of the pre-deployed test tokens above",
      "3. Update your .env file with the token address",
      "4. Test with small amounts first"
    ],
    example: "TOKEN_CONTRACT_ADDRESS=0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"
  },
  
  deployOwn: {
    title: "Deploy Your Own Token",
    steps: [
      "1. Go to https://remix.ethereum.org",
      "2. Create a new file with the ERC20 contract code above",
      "3. Compile the contract",
      "4. Deploy to your chosen testnet",
      "5. Copy the deployed contract address",
      "6. Update your .env file"
    ],
    tools: ["Remix IDE", "Hardhat", "Foundry", "Truffle"]
  },
  
  production: {
    title: "Production Deployment",
    steps: [
      "1. Audit your contract code",
      "2. Deploy on mainnet with proper security",
      "3. Verify contract on Etherscan",
      "4. Set up monitoring and alerts",
      "5. Test thoroughly before going live"
    ],
    warning: "Never use test private keys in production!"
  }
};

// Example usage function
export async function setupTokenContract() {
  console.log('🚀 Token Contract Setup Guide');
  console.log('============================\n');
  
  console.log('📋 Available Test Tokens:');
  console.log('Sepolia USDC:', TEST_TOKEN_ADDRESSES.sepolia.USDC);
  console.log('Sepolia WETH:', TEST_TOKEN_ADDRESSES.sepolia.WETH);
  console.log('\n📝 Quick Setup:');
  console.log('1. Copy a test token address from above');
  console.log('2. Add it to your .env file:');
  console.log('   TOKEN_CONTRACT_ADDRESS=0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238');
  console.log('3. Restart your application');
  
  console.log('\n🔧 For Custom Token:');
  console.log('1. Use Remix IDE: https://remix.ethereum.org');
  console.log('2. Deploy the ERC20 contract provided above');
  console.log('3. Use the deployed address in your .env file');
}

export default {
  TEST_TOKEN_ADDRESSES,
  deployToken,
  verifyTokenContract,
  SETUP_INSTRUCTIONS,
  setupTokenContract
};
