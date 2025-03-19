import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { hybridStorage } from '../../services/storage/hybridStorage';
import { filePreview } from '../../services/preview/filePreview';
import { Box, Typography, CircularProgress, Alert } from '@mui/material';
import { styled } from '@mui/material/styles';

const DropZone = styled(Box)(({ theme }) => ({
    border: `2px dashed ${theme.palette.primary.main}`,
    borderRadius: theme.shape.borderRadius,
    padding: theme.spacing(3),
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    '&:hover': {
        backgroundColor: theme.palette.action.hover,
    },
}));

const PreviewContainer = styled(Box)(({ theme }) => ({
    marginTop: theme.spacing(2),
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: theme.spacing(2),
}));

const PreviewItem = styled(Box)(({ theme }) => ({
    position: 'relative',
    padding: theme.spacing(1),
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: theme.shape.borderRadius,
    overflow: 'hidden',
}));

const DragDropUpload = ({ onUploadComplete, maxFiles = 10, maxSize = 100 * 1024 * 1024 }) => {
    const [files, setFiles] = useState([]);
    const [previews, setPreviews] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState(null);

    const onDrop = useCallback(async (acceptedFiles) => {
        setError(null);
        setFiles(acceptedFiles);
        
        // Generate previews
        const newPreviews = await Promise.all(
            acceptedFiles.map(async (file) => {
                try {
                    const preview = await filePreview.generatePreview(file);
                    return { file, preview };
                } catch (err) {
                    console.error('Preview generation error:', err);
                    return { file, preview: filePreview.generateGenericPreview(file) };
                }
            })
        );
        setPreviews(newPreviews);
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        maxFiles,
        maxSize,
        accept: {
            'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
            'video/*': ['.mp4', '.webm', '.ogg'],
            'application/pdf': ['.pdf'],
            'application/msword': ['.doc'],
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
        },
    });

    const handleUpload = async () => {
        if (files.length === 0) return;

        setUploading(true);
        setError(null);

        try {
            const uploadResults = await Promise.all(
                files.map(async (file) => {
                    const result = await hybridStorage.uploadFile(file, {
                        maxSize,
                    });
                    return {
                        file,
                        ...result,
                    };
                })
            );

            onUploadComplete(uploadResults);
        } catch (err) {
            setError(err.message || 'Upload failed');
        } finally {
            setUploading(false);
        }
    };

    return (
        <Box>
            <DropZone {...getRootProps()}>
                <input {...getInputProps()} />
                <Typography variant="h6" gutterBottom>
                    {isDragActive
                        ? 'Drop the files here...'
                        : 'Drag & drop files here, or click to select files'}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                    Maximum {maxFiles} files, up to {filePreview.formatFileSize(maxSize)} each
                </Typography>
            </DropZone>

            {error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                    {error}
                </Alert>
            )}

            {previews.length > 0 && (
                <PreviewContainer>
                    {previews.map(({ file, preview }, index) => (
                        <PreviewItem key={index}>
                            {preview.component === 'ImagePreview' && (
                                <img
                                    src={preview.url}
                                    alt={file.name}
                                    style={{ width: '100%', height: 'auto' }}
                                />
                            )}
                            {preview.component === 'VideoPreview' && (
                                <video
                                    src={preview.url}
                                    controls
                                    style={{ width: '100%', height: 'auto' }}
                                />
                            )}
                            {preview.component === 'DocumentPreview' && (
                                <iframe
                                    src={preview.url}
                                    style={{ width: '100%', height: '200px' }}
                                />
                            )}
                            {preview.component === 'GenericPreview' && (
                                <Typography variant="body2">
                                    {preview.name}
                                    <br />
                                    {preview.size}
                                </Typography>
                            )}
                        </PreviewItem>
                    ))}
                </PreviewContainer>
            )}

            {files.length > 0 && (
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
                    <Button
                        variant="contained"
                        onClick={handleUpload}
                        disabled={uploading}
                    >
                        {uploading ? (
                            <>
                                <CircularProgress size={24} sx={{ mr: 1 }} />
                                Uploading...
                            </>
                        ) : (
                            'Upload Files'
                        )}
                    </Button>
                </Box>
            )}
        </Box>
    );
};

export default DragDropUpload; 