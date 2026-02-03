import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform, Alert } from 'react-native';
import { createFrameData, sendAllFramesToServer, saveDataAsJSON, FPSLimiter } from '../services/keypointService';

let WebView;
if (Platform.OS !== 'web') {
    WebView = require('react-native-webview').WebView;
}


const mediaPipeHTML = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MediaPipe Holistic</title>
    <style>
        body { margin: 0; padding: 0; background: transparent; }
        .container { position: relative; width: 100vw; height: 100vh; }
        .input_video { 
            width: 100%; 
            height: 100%; 
            object-fit: cover; 
            position: absolute; 
            top: 0; 
            left: 0; 
            transform: scaleX(-1); /* 좌우 반전 */
        }
        .output_canvas { 
            position: absolute; 
            top: 0; 
            left: 0; 
            width: 100%; 
            height: 100%; 
            background: transparent; 
            pointer-events: none; 
            z-index: 10; 
            transform: scaleX(-1); /* 좌우 반전 */
        }
    </style>
    <script src="https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js" crossorigin="anonymous"></script>
    <script src="https://cdn.jsdelivr.net/npm/@mediapipe/control_utils/control_utils.js" crossorigin="anonymous"></script>
    <script src="https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js" crossorigin="anonymous"></script>
    <script src="https://cdn.jsdelivr.net/npm/@mediapipe/holistic/holistic.js" crossorigin="anonymous"></script>
</head>
<body>
    <div class="container">
        <video class="input_video" autoplay muted playsinline></video>
        <canvas class="output_canvas"></canvas>
    </div>

    <script>
        // HTML 내부에서 오류 발생 시 React Native로 알림
        window.onerror = function(message, source, lineno) {
            const errorMessage = JSON.stringify({ type: 'html_error', message: message, line: lineno });
            postMessageToParent(errorMessage);
        };

        const videoElement = document.querySelector('.input_video');
        const canvasElement = document.querySelector('.output_canvas');
        const canvasCtx = canvasElement.getContext('2d');

        let holistic;
        let camera;
        let isInitialized = false;
        let isRecording = false;

        // MediaPipe 결과 처리 함수
        function onResults(results) {
            if (!videoElement.videoWidth) return;

            canvasElement.width = videoElement.videoWidth;
            canvasElement.height = videoElement.videoHeight;

            canvasCtx.save();
            canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

        
            drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, { color: '#00FF00', lineWidth: 2 });
            drawLandmarks(canvasCtx, results.poseLandmarks, { color: '#FF0000', lineWidth: 1 });
            drawConnectors(canvasCtx, results.leftHandLandmarks, HAND_CONNECTIONS, { color: '#CC0000', lineWidth: 3 });
            drawLandmarks(canvasCtx, results.leftHandLandmarks, { color: '#00FF00', lineWidth: 1 });
            drawConnectors(canvasCtx, results.rightHandLandmarks, HAND_CONNECTIONS, { color: '#00CC00', lineWidth: 3 });
            drawLandmarks(canvasCtx, results.rightHandLandmarks, { color: '#0000FF', lineWidth: 1 });
            drawConnectors(canvasCtx, results.faceLandmarks, FACEMESH_CONTOURS, { color: '#C0C0C070', lineWidth: 1 });

            canvasCtx.restore();

            // 녹화 중일 때만 React Native로 데이터 전송
            if (isRecording) {
                // Python의 range(11, 23)와 동일하게 11번부터 22번까지의 랜드마크만 잘라냅니다.
                const upperBodyPose = results.poseLandmarks ? results.poseLandmarks.slice(11, 23) : null;

                postMessageToParent({
                    type: 'mediapipe_results',
                    results: {
                        pose_landmarks: upperBodyPose, // 12개만 잘라서 보냄
                        left_hand_landmarks: results.leftHandLandmarks,
                        right_hand_landmarks: results.rightHandLandmarks,
                    }
                });
            }
        }

        // MediaPipe 초기화 함수
        async function initializeMediaPipe() {
            try {
                holistic = new Holistic({
                    locateFile: (file) => \`https://cdn.jsdelivr.net/npm/@mediapipe/holistic/\${file}\`
                });
                holistic.setOptions({
                    modelComplexity: 1,
                    smoothLandmarks: true,
                    minDetectionConfidence: 0.5,
                    minTrackingConfidence: 0.5
                });
                holistic.onResults(onResults);

                camera = new Camera(videoElement, {
                    onFrame: async () => {
                        await holistic.send({ image: videoElement });
                    },
                    width: 1280,
                    height: 720
                });
                isInitialized = true;
            } catch (error) {
                postMessageToParent({ type: 'camera_error', message: 'Init Error: ' + error.message });
            }
        }

        // 카메라 시작 함수
        async function startCamera() {
            if (!isInitialized || !camera) return;
            try {
                await camera.start();
                postMessageToParent({ type: 'camera_started' });
            } catch (error) {
                postMessageToParent({ type: 'camera_error', message: 'Start Error: ' + error.message });
            }
        }

        // React Native로 메시지 보내는 헬퍼 함수
        function postMessageToParent(data) {
            const messageString = JSON.stringify(data);
            if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(messageString);
            } else if (window.parent !== window) {
                window.parent.postMessage(messageString, '*');
            }
        }

        // React Native로부터 메시지를 받는 리스너
        window.addEventListener('message', async (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'start_camera') {
                    if (!isInitialized) {
                        await initializeMediaPipe();
                    }
                    if (isInitialized) {
                        await startCamera();
                    }
                } else if (data.type === 'start_recording') {
                    isRecording = true;
                } else if (data.type === 'stop_recording') {
                    isRecording = false;
                }
            } catch (error) {
                // 메시지 파싱 오류는 무시
            }
        });
    </script>
</body>
</html>`;

const MemoizedMobileComponent = React.memo(({ webViewRef, onMessage }) => {
    if (!WebView) return null;
    return (
        <WebView
            ref={webViewRef}
            source={{ html: mediaPipeHTML }}
            style={styles.webView}
            onMessage={onMessage}
            javaScriptEnabled={true}
            mediaPlaybackRequiresUserAction={false}
            allowsInlineMediaPlayback={true}
            // Android/iOS 권한 관련 props
            mediaCapturePermissionGrantType="grant"
            allowsFullscreenVideo={true}
        />
    );
});

const MemoizedWebComponent = React.memo(({ iframeRef }) => (
    <iframe
        ref={iframeRef}
        srcDoc={mediaPipeHTML}
        style={{ width: '100%', height: '100%', border: 'none' }}
        allow="camera *;"
    />
));

/**
 * AI 결과값에 따라 표시할 메시지를 결정하는 헬퍼 함수
 * @param {string} aiResult - 서버에서 받은 AI 분석 결과 텍스트
 * @returns {string} - 채팅창에 표시할 최종 메시지
 */
const getCustomResponseMessage = (aiResult) => {
    // aiResult가 null이거나 undefined일 경우를 대비해 기본값 처리
    const result = aiResult || '분석 오류';
  
    switch (result) {
        case '숨을안쉬다': 
          return '수어 응답 결과는🤔\n' + '"' + result + '"' + '입니다.\n \n1. 숨을 안 쉬어요!!! 심폐소생술을 실행해주세요.\n2. 의식확인후 119에 신고해주세요. \n3. 기도확보를 해주세요.\n4. 호흡확인을 해주세요.\n5. 흉부압박 실시해주세요.\n6. 인공호흡 2회 실시해주세요.\n7. 흉부압박 30회 인공호흡 2회 반복!!\n\n다른 단어도 동작해 보시겠어요?😊';
        
        case '경찰':
          return '수어 응답 결과는🤔\n' + '"' + result + '"' + '입니다.\n \n경찰의 도움이 필요합니다!\n1. 즉시 112에 신고하세요.\n2. 현재 위치와 상황을 침착하게 설명하세요.\n3. 경찰의 지시를 따라주세요.\n\n다른 단어도 동작해 보시겠어요?😊';
  
        case '교통사고':
          return '수어 응답 결과는🤔\n' + '"' + result + '"' + '입니다.\n \n교통사고가 발생했습니다!\n1. 2차 사고 방지를 위해 안전한 곳으로 대피하세요.\n2. 부상자가 있다면 즉시 119에 신고하세요.\n3. 112에 전화해 사고를 접수하세요.\n\n다른 단어도 동작해 보시겠어요?😊';
  
        case '깔리다':
          return '수어 응답 결과는🤔\n' + '"' + result + '"' + '입니다.\n \n사람이 깔렸습니다! 매우 위급한 상황입니다.\n1. 즉시 119에 구조를 요청하세요!\n2. 무리하게 구조하려 하지 말고, 환자를 안심시키세요.\n3. 구급대원의 지시를 따르세요.\n\n다른 단어도 동작해 보시겠어요?😊';
  
        case '병원':
          return '수어 응답 결과는🤔\n' + '"' + result + '"' + '입니다.\n \n병원 진료가 필요합니다.\n1. 상황이 위급하다면 119에 전화하세요.\n2. 이동이 가능하다면 가까운 병원이나 응급실을 방문하세요.\n3. 증상을 명확하게 설명하세요.\n\n다른 단어도 동작해 보시겠어요?😊';
  
        case '불나다':
          return '수어 응답 결과는🤔\n' + '"' + result + '"' + '입니다.\n \n불이 났습니다! "불이야!"라고 외치세요.\n1. 즉시 119에 신고하세요.\n2. 젖은 수건으로 코와 입을 막고 낮은 자세로 대피하세요.\n3. 엘리베이터 대신 비상 계단을 이용하세요.\n\n다른 단어도 동작해 보시겠어요?😊';
  
        case '쓰러지다':
          return '수어 응답 결과는🤔\n' + '"' + result + '"' + '입니다.\n \n사람이 쓰러졌습니다!\n1. 환자의 어깨를 가볍게 두드리며 의식을 확인하세요.\n2. 즉시 119에 신고하세요.\n3. 숨을 쉬는지 확인하고, 숨을 쉬지 않는다면 심폐소생술을 준비하세요.\n\n다른 단어도 동작해 보시겠어요?😊';
  
        case '연락해주세요':
          return '수어 응답 결과는🤔\n' + '"' + result + '"' + '입니다.\n \n상대방이 연락을 요청하고 있습니다.\n1. 연락 가능한 번호나 방법을 물어보세요.\n2. 또는 당신의 연락처를 전달하세요.\n\n다른 단어도 동작해 보시겠어요?😊';
  
        default:
          // 일치하는 케이스가 없을 때 보낼 기본 메시지
          return '수어 응답 결과는🤔\n' + '"' + result + '"' + '입니다. 다른 단어도 검색해 보시겠어요?';
      }
    };


// --- 메인 컴포넌트 시작 ---
const CameraComponent = ({ onVideoEnd }) => {
    const [status, setStatus] = useState('idle');
    const [serverResponse, setServerResponse] = useState(null);
    const webViewRef = useRef(null);
    const iframeRef = useRef(null);
    const collectedKeypoints = useRef([]);
    const frameIndex = useRef(0);

    const fpsLimiter = useRef(new FPSLimiter(15)); // 1초에 15프레임으로 제한

    const handleMessage = useCallback((data) => {

        if (!fpsLimiter.current.canProcess()) {
            return;
        }

        if (data.type === 'mediapipe_results' && status === 'recording') {
            const frameData = { frame: frameIndex.current, ...data.results };
            collectedKeypoints.current.push(frameData);
            frameIndex.current++;
        } else if (data.type === 'camera_error') {
            console.error('카메라 오류:', data.message);
            Alert.alert('오류', '카메라 시작에 실패했습니다: ' + data.message);
            setStatus('idle');
        }
    }, [status]);

    useEffect(() => {
        const timer = setTimeout(() => startMediaPipeAnalysis(), 1000);
        return () => clearTimeout(timer);
    }, []);

    const handleStartRecording = useCallback(() => {
        setServerResponse(null);

        console.log("녹화 시작 버튼 클릭. 3초 후 데이터 수집을 시작합니다.");
    
        // 1. 먼저 기존 데이터와 프레임 번호를 초기화
        collectedKeypoints.current = [];
        frameIndex.current = 0;
        
        // 2. 사용자에게 준비하라는 안내를 보여줌줌
        Alert.alert("준비", "3초 후에 녹화가 시작됩니다.");
    
        // 3. 3초 타이머를 설정
        setTimeout(() => {
            // --- 아래 코드는 3초 후에 실행
            console.log("3초 경과. 실제 데이터 수집을 시작합니다!");
    
            // 4. status를 'recording'으로 변경하여 데이터 수집을 활성화
            setStatus('recording');
    
            // 5. 웹뷰에도 '녹화 시작' 메시지를 보내 상태를 동기화
            const message = JSON.stringify({ type: 'start_recording' });
            if (Platform.OS === 'web') {
                iframeRef.current?.contentWindow?.postMessage(message, '*');
            } else {
                webViewRef.current?.postMessage(message);
            }
    
        }, 3000); // 3000ms = 3초
    }, []);
    
    const handleStopRecording = useCallback(() => {
        console.log(`녹화 중지. 총 ${collectedKeypoints.current.length} 프레임 수집.`);
        setStatus('reviewing');
        const message = JSON.stringify({ type: 'stop_recording' });
        if (Platform.OS === 'web') {
            iframeRef.current?.contentWindow?.postMessage(message, '*');
        } else {
            webViewRef.current?.postMessage(message);
        }
    }, []);

    const handleRetake = useCallback(() => {
        console.log("다시 찍기");
        collectedKeypoints.current = [];
        frameIndex.current = 0;
        setServerResponse(null);
        setStatus('idle');
    }, []);

    const handleSendToServer = useCallback(async () => {
        console.log("서버로 데이터 전송 시도...");
        
        console.log(`현재 수집된 프레임 수: ${collectedKeypoints.current.length}`);

        if (collectedKeypoints.current.length === 0) {
            Alert.alert("알림", "전송할 영상 데이터가 없습니다.");
            return;
        }
    
        // saveDataAsJSON(collectedKeypoints.current, `sign-data-${Date.now()}.json`);
    
        try {
            // 기존 서버 전송 로직
            const result = await sendAllFramesToServer(collectedKeypoints.current);

            setServerResponse(result);

            Alert.alert("성공", "데이터를 서버로 성공적으로 전송했습니다.");
            const chatData = {
                user_message: getCustomResponseMessage(result.result)
            }
          
            setTimeout(() => {
                if (onVideoEnd) onVideoEnd(chatData);
                
                setStatus('idle');
                setServerResponse(null);
                collectedKeypoints.current = [];

            }, 500); 
        } catch (error) {
            Alert.alert("오류", "데이터 전송에 실패했습니다.");
            setStatus('reviewing');
        } 
    }, [onVideoEnd]);

    const startMediaPipeAnalysis = () => {
        const startMessage = JSON.stringify({ type: 'start_camera' });
        if (Platform.OS === 'web' && iframeRef.current) {
            iframeRef.current.contentWindow.postMessage(startMessage, '*');
        } else if (webViewRef.current) {
            webViewRef.current.postMessage(startMessage);
        }
    };

    useEffect(() => {
        if (Platform.OS !== 'web') return;
        const messageHandler = (event) => {
            try { handleMessage(JSON.parse(event.data)); } catch (e) {}
        };
        window.addEventListener('message', messageHandler);
        return () => window.removeEventListener('message', messageHandler);
    }, [handleMessage]);

    const handleWebViewMessage = useCallback((event) => {
        try { handleMessage(JSON.parse(event.nativeEvent.data)); } catch (e) {}
    }, [handleMessage]);

    return (
        <View style={styles.container}>
            {Platform.OS === 'web' ?
                <MemoizedWebComponent iframeRef={iframeRef} /> :
                <MemoizedMobileComponent
                    webViewRef={webViewRef}
                    onMessage={handleWebViewMessage}
                />
            }
            <View style={styles.overlay}>
                {(status === 'recording' || status === 'reviewing') && (
                    <View style={styles.recordingIndicator}>
                        <View style={[styles.recordingDot, status === 'reviewing' && { backgroundColor: 'grey' }]} />
                        <Text style={styles.recordingText}>{status === 'recording' ? 'REC' : 'PAUSED'}</Text>
                    </View>
                )}
                <View style={styles.controls}>
                    {status === 'idle' && (
                        <TouchableOpacity style={[styles.controlButton, styles.startButton]} onPress={handleStartRecording}>
                            <Text style={styles.buttonText}>녹화 시작</Text>
                        </TouchableOpacity>
                    )}
                    {status === 'recording' && (
                        <TouchableOpacity style={[styles.controlButton, styles.stopButton]} onPress={handleStopRecording}>
                            <Text style={styles.buttonText}>녹화 중지</Text>
                        </TouchableOpacity>
                    )}
                    {status === 'reviewing' && (
                        <View style={styles.recordingButtons}>
                            <TouchableOpacity style={[styles.controlButton, styles.retakeButton]} onPress={handleRetake}>
                                <Text style={styles.buttonText}>다시 찍기</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.controlButton, styles.sendButton]} onPress={handleSendToServer}>
                                <Text style={styles.buttonText}>서버로 전송</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'black' },
    webView: { flex: 1, backgroundColor: 'transparent' },
    overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'flex-end', alignItems: 'center' },
    controls: { marginBottom: 50, alignItems: 'center' },
    recordingButtons: { flexDirection: 'row', justifyContent: 'space-around', width: '80%' },
    controlButton: { paddingHorizontal: 30, paddingVertical: 15, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
    startButton: { backgroundColor: '#007AFF' },
    stopButton: { backgroundColor: '#FF4444' },
    retakeButton: { backgroundColor: '#FF9500' },
    sendButton: { backgroundColor: '#34C759' },
    buttonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
    recordingIndicator: { position: 'absolute', top: 60, left: 20, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 0, 0, 0.8)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15 },
    recordingDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: 'white', marginRight: 8 },
    recordingText: { color: 'white', fontSize: 14, fontWeight: 'bold' },
    // resultContainer: {
    //     position: 'absolute',
    //     top: 100, // REC 표시등(60) 바로 아래
    //     right: 20,
    //     backgroundColor: 'rgba(0, 0, 0, 0.7)',
    //     paddingHorizontal: 12,
    //     paddingVertical: 8,
    //     borderRadius: 10,
    //     maxWidth: '50%', // 화면의 절반 너비만 차지
    // },
    // resultText: {
    //     color: 'white',
    //     fontSize: 16,
    //     fontWeight: 'bold',
    // },
});

export default CameraComponent;