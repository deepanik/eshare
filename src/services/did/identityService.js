import { ethers } from 'ethers';
import { LensClient, development } from '@lens-protocol/client';

class IdentityService {
    constructor() {
        this.lensClient = new LensClient({
            environment: development,
        });
        this.ensProvider = new ethers.providers.JsonRpcProvider(
            import.meta.env.VITE_ETHEREUM_RPC_URL
        );
    }

    async resolveENS(address) {
        try {
            const ensName = await this.ensProvider.lookupAddress(address);
            if (!ensName) return null;

            const resolver = await this.ensProvider.getResolver(ensName);
            const avatar = await resolver.getText('avatar');
            const twitter = await resolver.getText('com.twitter');
            const github = await resolver.getText('com.github');

            return {
                ensName,
                avatar,
                twitter,
                github,
            };
        } catch (error) {
            console.error('ENS resolution error:', error);
            return null;
        }
    }

    async getLensProfile(address) {
        try {
            const profiles = await this.lensClient.profile.fetchAll({
                where: {
                    ownedBy: [address],
                },
            });

            if (!profiles || profiles.length === 0) return null;

            const profile = profiles[0];
            return {
                handle: profile.handle,
                bio: profile.bio,
                avatar: profile.metadata?.picture?.optimized?.uri,
                cover: profile.metadata?.coverPicture?.optimized?.uri,
                stats: profile.stats,
            };
        } catch (error) {
            console.error('Lens profile fetch error:', error);
            return null;
        }
    }

    async getCombinedIdentity(address) {
        const [ensData, lensData] = await Promise.all([
            this.resolveENS(address),
            this.getLensProfile(address),
        ]);

        return {
            address,
            ens: ensData,
            lens: lensData,
        };
    }

    async createLensProfile(address, handle, bio) {
        try {
            // This is a placeholder for profile creation
            // In a real implementation, you would need to:
            // 1. Create a profile using Lens Protocol's API
            // 2. Set up profile metadata
            // 3. Configure profile settings
            throw new Error('Profile creation not implemented');
        } catch (error) {
            console.error('Lens profile creation error:', error);
            throw error;
        }
    }

    async updateLensProfile(address, updates) {
        try {
            // This is a placeholder for profile updates
            // In a real implementation, you would need to:
            // 1. Update profile metadata
            // 2. Update profile settings
            // 3. Handle profile picture and cover updates
            throw new Error('Profile update not implemented');
        } catch (error) {
            console.error('Lens profile update error:', error);
            throw error;
        }
    }

    async getLensPublications(address) {
        try {
            const publications = await this.lensClient.publication.fetchAll({
                where: {
                    from: [address],
                },
            });

            return publications.map(pub => ({
                id: pub.id,
                content: pub.metadata?.content,
                media: pub.metadata?.media,
                createdAt: pub.createdAt,
                stats: pub.stats,
            }));
        } catch (error) {
            console.error('Lens publications fetch error:', error);
            return [];
        }
    }

    async getLensFollowers(address) {
        try {
            const followers = await this.lensClient.profile.followers({
                of: address,
            });

            return followers.map(follower => ({
                address: follower.wallet.address,
                handle: follower.handle,
                avatar: follower.metadata?.picture?.optimized?.uri,
            }));
        } catch (error) {
            console.error('Lens followers fetch error:', error);
            return [];
        }
    }

    async getLensFollowing(address) {
        try {
            const following = await this.lensClient.profile.following({
                of: address,
            });

            return following.map(follow => ({
                address: follow.profile.wallet.address,
                handle: follow.profile.handle,
                avatar: follow.profile.metadata?.picture?.optimized?.uri,
            }));
        } catch (error) {
            console.error('Lens following fetch error:', error);
            return [];
        }
    }
}

export const identityService = new IdentityService(); 