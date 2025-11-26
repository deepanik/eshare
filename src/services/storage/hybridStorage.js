import { create } from 'ipfs-http-client';
import Arweave from 'arweave';

class HybridStorage {
    constructor() {
        // Initialize IPFS client
        this.ipfs = create({
            host: 'ipfs.infura.io',
            port: 5001,
            protocol: 'https',
            headers: {
                authorization: `Basic ${Buffer.from(
                    `${import.meta.env.VITE_INFURA_PROJECT_ID}:${import.meta.env.VITE_INFURA_PROJECT_SECRET}`
                ).toString('base64')}`,
            },
        });

        // Initialize Arweave client
        this.arweave = new Arweave({
            host: 'arweave.net',
            port: 443,
            protocol: 'https',
        });
    }

    async uploadToIPFS(file) {
        try {
            const result = await this.ipfs.add(file);
            return {
                hash: result.path,
                size: result.size,
                storage: 'ipfs'
            };
        } catch (error) {
            console.error('IPFS upload error:', error);
            throw error;
        }
    }

    async uploadToArweave(file) {
        try {
            const transaction = await this.arweave.createTransaction({
                data: file,
            });

            await this.arweave.transactions.sign(transaction);
            const response = await this.arweave.transactions.post(transaction);

            return {
                hash: transaction.id,
                size: file.size,
                storage: 'arweave'
            };
        } catch (error) {
            console.error('Arweave upload error:', error);
            throw error;
        }
    }

    async uploadFile(file, options = {}) {
        const {
            permanent = false,
            maxSize = 100 * 1024 * 1024 // 100MB default
        } = options;

        if (file.size > maxSize) {
            throw new Error('File size exceeds maximum allowed size');
        }

        try {
            if (permanent) {
                return await this.uploadToArweave(file);
            } else {
                return await this.uploadToIPFS(file);
            }
        } catch (error) {
            console.error('Upload error:', error);
            throw error;
        }
    }

    async getFile(hash, storage) {
        try {
            if (storage === 'arweave') {
                const data = await this.arweave.transactions.getData(hash, {
                    decode: true,
                });
                return data;
            } else {
                const stream = await this.ipfs.cat(hash);
                return stream;
            }
        } catch (error) {
            console.error('File retrieval error:', error);
            throw error;
        }
    }

    getFileUrl(hash, storage) {
        if (storage === 'arweave') {
            return `https://arweave.net/${hash}`;
        } else {
            return `https://ipfs.io/ipfs/${hash}`;
        }
    }
}

export const hybridStorage = new HybridStorage(); 