import { EventEmitter } from 'eventemitter3';

class FileTransfer extends EventEmitter {
    constructor() {
        super();
        this.peerConnections = new Map();
        this.dataChannels = new Map();
        this.configuration = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
            ],
        };
    }

    async createPeerConnection(peerId) {
        const peerConnection = new RTCPeerConnection(this.configuration);
        this.peerConnections.set(peerId, peerConnection);

        // Create data channel for file transfer
        const dataChannel = peerConnection.createDataChannel('fileTransfer', {
            ordered: true,
        });

        this.setupDataChannel(dataChannel, peerId);

        // Handle ICE candidates
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                this.emit('iceCandidate', {
                    peerId,
                    candidate: event.candidate,
                });
            }
        };

        return peerConnection;
    }

    setupDataChannel(dataChannel, peerId) {
        this.dataChannels.set(peerId, dataChannel);

        dataChannel.onopen = () => {
            this.emit('channelOpen', { peerId });
        };

        dataChannel.onclose = () => {
            this.emit('channelClose', { peerId });
        };

        dataChannel.onmessage = (event) => {
            this.handleDataChannelMessage(event, peerId);
        };
    }

    async handleDataChannelMessage(event, peerId) {
        const data = event.data;
        if (data instanceof Blob) {
            // Handle file data
            this.emit('fileData', {
                peerId,
                data,
            });
        } else {
            // Handle metadata
            const metadata = JSON.parse(data);
            this.emit('metadata', {
                peerId,
                metadata,
            });
        }
    }

    async sendFile(file, peerId) {
        const dataChannel = this.dataChannels.get(peerId);
        if (!dataChannel || dataChannel.readyState !== 'open') {
            throw new Error('Data channel not ready');
        }

        // Send file metadata first
        const metadata = {
            type: 'file',
            name: file.name,
            size: file.size,
            mimeType: file.type,
        };
        dataChannel.send(JSON.stringify(metadata));

        // Split file into chunks and send
        const chunkSize = 16384; // 16KB chunks
        const fileReader = new FileReader();
        let offset = 0;

        fileReader.onload = (e) => {
            dataChannel.send(e.target.result);
        };

        fileReader.onerror = (error) => {
            this.emit('error', {
                peerId,
                error: 'File reading error',
            });
        };

        const readNextChunk = () => {
            const slice = file.slice(offset, offset + chunkSize);
            fileReader.readAsArrayBuffer(slice);
            offset += chunkSize;

            if (offset < file.size) {
                setTimeout(readNextChunk, 0);
            }
        };

        readNextChunk();
    }

    async handleIncomingFile(peerId, onProgress) {
        let fileInfo = null;
        let receivedChunks = [];
        let totalSize = 0;

        return new Promise((resolve, reject) => {
            const dataChannel = this.dataChannels.get(peerId);
            if (!dataChannel) {
                reject(new Error('Data channel not found'));
                return;
            }

            dataChannel.onmessage = (event) => {
                if (event.data instanceof Blob) {
                    receivedChunks.push(event.data);
                    totalSize += event.data.size;

                    if (onProgress) {
                        onProgress({
                            loaded: totalSize,
                            total: fileInfo.size,
                        });
                    }

                    if (totalSize === fileInfo.size) {
                        const file = new File(receivedChunks, fileInfo.name, {
                            type: fileInfo.mimeType,
                        });
                        resolve(file);
                    }
                } else {
                    try {
                        const data = JSON.parse(event.data);
                        if (data.type === 'file') {
                            fileInfo = data;
                        }
                    } catch (error) {
                        reject(new Error('Invalid metadata'));
                    }
                }
            };
        });
    }

    async createOffer(peerId) {
        const peerConnection = await this.createPeerConnection(peerId);
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);

        return offer;
    }

    async handleAnswer(peerId, answer) {
        const peerConnection = this.peerConnections.get(peerId);
        if (!peerConnection) {
            throw new Error('Peer connection not found');
        }

        await peerConnection.setRemoteDescription(answer);
    }

    async handleIceCandidate(peerId, candidate) {
        const peerConnection = this.peerConnections.get(peerId);
        if (!peerConnection) {
            throw new Error('Peer connection not found');
        }

        await peerConnection.addIceCandidate(candidate);
    }

    closeConnection(peerId) {
        const peerConnection = this.peerConnections.get(peerId);
        if (peerConnection) {
            peerConnection.close();
            this.peerConnections.delete(peerId);
        }

        const dataChannel = this.dataChannels.get(peerId);
        if (dataChannel) {
            dataChannel.close();
            this.dataChannels.delete(peerId);
        }
    }
}

export const fileTransfer = new FileTransfer(); 