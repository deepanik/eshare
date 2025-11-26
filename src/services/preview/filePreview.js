import { hybridStorage } from '../storage/hybridStorage';

class FilePreview {
    constructor() {
        this.supportedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        this.supportedVideoTypes = ['video/mp4', 'video/webm', 'video/ogg'];
        this.supportedDocumentTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    }

    async generatePreview(file, hash, storage) {
        const fileType = file.type;
        const fileUrl = hybridStorage.getFileUrl(hash, storage);

        if (this.supportedImageTypes.includes(fileType)) {
            return this.generateImagePreview(fileUrl);
        } else if (this.supportedVideoTypes.includes(fileType)) {
            return this.generateVideoPreview(fileUrl);
        } else if (this.supportedDocumentTypes.includes(fileType)) {
            return this.generateDocumentPreview(fileUrl);
        } else {
            return this.generateGenericPreview(file);
        }
    }

    generateImagePreview(url) {
        return {
            type: 'image',
            url,
            component: 'ImagePreview'
        };
    }

    generateVideoPreview(url) {
        return {
            type: 'video',
            url,
            component: 'VideoPreview'
        };
    }

    generateDocumentPreview(url) {
        return {
            type: 'document',
            url,
            component: 'DocumentPreview'
        };
    }

    generateGenericPreview(file) {
        return {
            type: 'generic',
            name: file.name,
            size: this.formatFileSize(file.size),
            component: 'GenericPreview'
        };
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    isPreviewSupported(fileType) {
        return [
            ...this.supportedImageTypes,
            ...this.supportedVideoTypes,
            ...this.supportedDocumentTypes
        ].includes(fileType);
    }
}

export const filePreview = new FilePreview(); 