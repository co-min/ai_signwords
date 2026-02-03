class SocketService {
    constructor() {
        this.socket = null;
        this.listeners = [];
        this.lastUpdateTime = 0; // 마지막 업데이트 시간
        this.updateInterval = 200; // 1초에 5번 업데이트 (200ms 간격)
    }

    connect(serverUrl) {
        this.socket = new WebSocket(serverUrl);

        this.socket.onopen = () => {
            console.log('WebSocket connected');
        };

        this.socket.onmessage = (event) => {
            const currentTime = Date.now();
            if (currentTime - this.lastUpdateTime > this.updateInterval) {
                const data = JSON.parse(event.data);
                this.notifyListeners(data);
                this.lastUpdateTime = currentTime;
            }
        };

        this.socket.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        this.socket.onclose = () => {
            console.log('WebSocket closed');
        };
    }

    disconnect() {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
    }

    //
    addListener(callback) {
        this.listeners.push(callback);
    }

    removeListener(callback) {
        this.listeners = this.listeners.filter((listener) => listener !== callback);
    }

    notifyListeners(data) {
        this.listeners.forEach((listener) => listener(data));
    }

    // 프레임 전송 메서드 추가
    sendFrame(frameData) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({ frame: frameData }));
        } else {
            console.error('WebSocket is not open. Cannot send frame.');
        }
    }

    // 키포인트 전송 전용 메서드
    sendKeypoints(keypointsData) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({ 
                type: 'keypoints',
                data: keypointsData 
            }));
        } else {
            console.error('WebSocket is not open. Cannot send keypoints.');
        }
    }
}

const socketService = new SocketService();
export default socketService;