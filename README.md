# eShare - Decentralized File Sharing System

A decentralized file sharing platform built with React, Ethereum, and IPFS.

## Features

- 🔐 Secure file upload with encryption
- 🌐 Decentralized storage using IPFS
- 💰 Blockchain-based access control
- 📊 Download limits and expiry dates
- 🎨 Modern UI with dark mode support

## Tech Stack

- Frontend: ReactJS, Tailwind CSS
- Blockchain: Ethereum (ethers.js)
- Storage: Pinata (IPFS)
- Smart Contracts: Solidity

## Prerequisites

- Node.js (v14 or higher)
- MetaMask or another Web3 wallet
- Pinata API credentials

## Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/eshare.git
cd eshare
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory and add your Pinata API credentials:
```
VITE_PINATA_API_KEY=your_pinata_api_key_here
VITE_PINATA_SECRET_KEY=your_pinata_secret_key_here
```

4. Start the development server:
```bash
npm run dev
```

5. Open your browser and navigate to `http://localhost:5173`

## Smart Contract Development

The smart contracts are located in the `contracts` directory. To deploy them:

1. Install Hardhat:
```bash
npm install --save-dev hardhat
```

2. Compile contracts:
```bash
npx hardhat compile
```

3. Deploy contracts:
```bash
npx hardhat run scripts/deploy.js --network <network>
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
