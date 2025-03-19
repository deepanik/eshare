import { ethers } from 'ethers';
import { ESHAREToken } from '../../contracts/ESHARE.sol';

class ReferralService {
    constructor(contract) {
        this.contract = contract;
        this.referralReward = ethers.utils.parseEther('10'); // 10 tokens per referral
    }

    async generateReferralCode(address) {
        // Generate a unique referral code using the user's address and timestamp
        const timestamp = Math.floor(Date.now() / 1000);
        const data = ethers.utils.solidityPack(
            ['address', 'uint256'],
            [address, timestamp]
        );
        return ethers.utils.keccak256(data).slice(0, 8);
    }

    async getReferralStats(address) {
        try {
            const stats = await this.contract.getReferralStats(address);
            return {
                totalReferrals: stats.totalReferrals.toNumber(),
                totalRewards: ethers.utils.formatEther(stats.totalRewards),
                activeReferrals: stats.activeReferrals.toNumber(),
            };
        } catch (error) {
            console.error('Error fetching referral stats:', error);
            throw error;
        }
    }

    async claimReferralRewards() {
        try {
            const tx = await this.contract.claimReferralRewards();
            await tx.wait();
            return tx.hash;
        } catch (error) {
            console.error('Error claiming referral rewards:', error);
            throw error;
        }
    }

    async getReferralLink(address) {
        const code = await this.generateReferralCode(address);
        return `${window.location.origin}/signup?ref=${code}`;
    }

    async validateReferralCode(code) {
        try {
            const isValid = await this.contract.isValidReferralCode(code);
            return isValid;
        } catch (error) {
            console.error('Error validating referral code:', error);
            return false;
        }
    }

    async getReferralRewards(address) {
        try {
            const rewards = await this.contract.getReferralRewards(address);
            return ethers.utils.formatEther(rewards);
        } catch (error) {
            console.error('Error fetching referral rewards:', error);
            throw error;
        }
    }

    async getReferralLeaderboard() {
        try {
            const leaderboard = await this.contract.getReferralLeaderboard();
            return leaderboard.map(entry => ({
                address: entry.user,
                referrals: entry.referrals.toNumber(),
                rewards: ethers.utils.formatEther(entry.rewards),
            }));
        } catch (error) {
            console.error('Error fetching referral leaderboard:', error);
            throw error;
        }
    }
}

export const createReferralService = (contract) => new ReferralService(contract); 