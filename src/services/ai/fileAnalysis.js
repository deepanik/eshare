import { Configuration, OpenAIApi } from 'openai';

class FileAnalysis {
    constructor() {
        const configuration = new Configuration({
            apiKey: process.env.VITE_OPENAI_API_KEY,
        });
        this.openai = new OpenAIApi(configuration);
    }

    async analyzeFile(file) {
        try {
            const fileType = file.type;
            let analysis = {};

            if (fileType.startsWith('image/')) {
                analysis = await this.analyzeImage(file);
            } else if (fileType.startsWith('video/')) {
                analysis = await this.analyzeVideo(file);
            } else if (fileType === 'application/pdf') {
                analysis = await this.analyzePDF(file);
            } else {
                analysis = await this.analyzeGenericFile(file);
            }

            return {
                ...analysis,
                fileType,
                size: file.size,
                name: file.name,
            };
        } catch (error) {
            console.error('File analysis error:', error);
            throw error;
        }
    }

    async analyzeImage(file) {
        try {
            const response = await this.openai.createImageAnalysis({
                file: file,
                model: "gpt-4-vision-preview",
                max_tokens: 300,
            });

            return {
                tags: this.extractTags(response.data.choices[0].message.content),
                description: response.data.choices[0].message.content,
                category: this.determineCategory(response.data.choices[0].message.content),
            };
        } catch (error) {
            console.error('Image analysis error:', error);
            throw error;
        }
    }

    async analyzeVideo(file) {
        // For video analysis, we'll extract keyframes and analyze them
        try {
            const keyframes = await this.extractKeyframes(file);
            const analysis = await Promise.all(
                keyframes.map(frame => this.analyzeImage(frame))
            );

            return {
                tags: this.mergeTags(analysis.map(a => a.tags)),
                description: this.generateVideoDescription(analysis),
                category: this.determineCategory(analysis.map(a => a.description).join(' ')),
            };
        } catch (error) {
            console.error('Video analysis error:', error);
            throw error;
        }
    }

    async analyzePDF(file) {
        try {
            const text = await this.extractPDFText(file);
            const response = await this.openai.createCompletion({
                model: "gpt-4",
                prompt: `Analyze this document and provide tags and category: ${text}`,
                max_tokens: 300,
            });

            return {
                tags: this.extractTags(response.data.choices[0].text),
                description: response.data.choices[0].text,
                category: this.determineCategory(response.data.choices[0].text),
            };
        } catch (error) {
            console.error('PDF analysis error:', error);
            throw error;
        }
    }

    async analyzeGenericFile(file) {
        // For generic files, we'll analyze the filename and extension
        const extension = file.name.split('.').pop().toLowerCase();
        const name = file.name.replace(/\.[^/.]+$/, '');

        return {
            tags: [extension, ...this.extractTagsFromName(name)],
            description: `File: ${file.name}`,
            category: this.determineCategoryFromExtension(extension),
        };
    }

    extractTags(text) {
        // Extract relevant tags from AI analysis
        const words = text.toLowerCase().split(/\s+/);
        const commonWords = new Set(['the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i']);
        return [...new Set(words.filter(word => !commonWords.has(word) && word.length > 3))];
    }

    mergeTags(tagsArrays) {
        // Merge and deduplicate tags from multiple analyses
        return [...new Set(tagsArrays.flat())];
    }

    determineCategory(text) {
        // Determine the main category based on the analysis text
        const categories = {
            'document': ['document', 'text', 'pdf', 'word', 'excel'],
            'image': ['image', 'photo', 'picture', 'art'],
            'video': ['video', 'movie', 'clip', 'recording'],
            'audio': ['audio', 'music', 'sound', 'podcast'],
            'archive': ['zip', 'rar', 'tar', 'archive'],
        };

        const textLower = text.toLowerCase();
        for (const [category, keywords] of Object.entries(categories)) {
            if (keywords.some(keyword => textLower.includes(keyword))) {
                return category;
            }
        }
        return 'other';
    }

    determineCategoryFromExtension(extension) {
        const extensionMap = {
            'pdf': 'document',
            'doc': 'document',
            'docx': 'document',
            'jpg': 'image',
            'jpeg': 'image',
            'png': 'image',
            'gif': 'image',
            'mp4': 'video',
            'avi': 'video',
            'mov': 'video',
            'mp3': 'audio',
            'wav': 'audio',
            'zip': 'archive',
            'rar': 'archive',
            'tar': 'archive',
        };

        return extensionMap[extension] || 'other';
    }

    extractTagsFromName(name) {
        // Extract potential tags from filename
        return name
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .split(/\s+/)
            .filter(word => word.length > 3);
    }

    async extractKeyframes(videoFile) {
        // This is a placeholder for video keyframe extraction
        // In a real implementation, you would use a video processing library
        return [];
    }

    async extractPDFText(pdfFile) {
        // This is a placeholder for PDF text extraction
        // In a real implementation, you would use a PDF parsing library
        return '';
    }

    generateVideoDescription(analysis) {
        // Generate a description based on the analysis of keyframes
        return analysis.map(a => a.description).join(' ');
    }
}

export const fileAnalysis = new FileAnalysis(); 