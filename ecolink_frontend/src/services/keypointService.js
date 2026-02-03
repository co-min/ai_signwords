/**
 * MediaPipe 랜드마크 배열을 Python 코드의 JSON 형식과 동일하게 변환합니다.
 * @param {Array} landmarks - MediaPipe 랜드마크 배열
 * @returns {Array|null} - [{x, y, z, visibility}, ...] 형식의 배열 또는 null
 */
const formatLandmarks = (landmarks) => {
    if (!landmarks || landmarks.length === 0) {
        return null;
    }
    return landmarks.map(lm => ({
        x: lm.x,
        y: lm.y,
        z: lm.z,
        visibility: lm.visibility === undefined ? null : lm.visibility,
    }));
};

/**
 * MediaPipe 결과를 Python 코드의 프레임 단위 JSON 객체와 동일한 형식으로 생성합니다.
 * @param {Object} results - 웹뷰에서 받은 MediaPipe 결과 객체
 * @param {number} frameIndex - 현재 프레임 번호
 * @returns {Object}
 */
export const createFrameData = (results, frameIndex) => {
    // pose 랜드마크가 존재할 경우, slice(11, 23)를 이용해 11번부터 22번까지의 요소만 잘라냅니다.
    // 이는 Python의 range(11, 23)과 동일한 역할을 합니다.
    const upperBodyPose = results.pose ? results.pose.slice(11, 23) : null;

    return {
        frame: frameIndex,
        pose_landmarks: formatLandmarks(upperBodyPose), // 잘라낸 상체 데이터만 사용
        left_hand_landmarks: formatLandmarks(results.leftHand),
        right_hand_landmarks: formatLandmarks(results.rightHand),
    };
};

/**
 * 수집된 모든 벡터 데이터를 서버로 한번에 전송
 * @param {Array} allVectors - VectorDataManager에서 수집한 벡터 객체 배열
 * @param {string} apiUrl - API 엔드포인트 URL (선택적)
 * @returns {Promise<Object>} 서버 응답
 */
export const sendAllFramesToServer = async (allVectors, apiUrl = null) => {
    const defaultUrl = 'http://localhost:8000/api/signwords/upload-keypoints/'; // Django 서버 주소
    const url = apiUrl || defaultUrl;
    
   
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                sign_language_data: allVectors,
                total_frames: allVectors.length,
            })
            
        });
        
        if (!response.ok) {
            throw new Error(`서버 응답 오류: ${response.status}`);
        }

        const result = await response.json(); // 응답 받기
        console.log(result); // 결과값 확인
        return result; // 결과 반환
        
    
    } catch (error) {
        console.error('서버 전송 실패:', error);
        throw error;
    }
    
    
};
/**
 * 데이터를 JSON 파일로 저장하여 다운로드하게 합니다. (웹 전용)
 * @param {Array} data - 저장할 데이터 배열
 * @param {string} filename - 저장될 파일 이름
 */
export const saveDataAsJSON = (data, filename = 'keypoints.json') => {
    if (typeof window === 'undefined' || !data) {
        console.error('저장할 데이터가 없거나 웹 환경이 아닙니다.');
        return;
    }
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    console.log(`${filename} 파일이 저장되었습니다.`);
};

/**
 * FPS(Frames Per Second)를 제한하기 위한 클래스
 */
export class FPSLimiter {
    constructor(targetFPS = 15) { // 1초에 15 프레임으로 기본 설정
        this.targetFPS = targetFPS;
        this.minInterval = 1000 / targetFPS; // 프레임 간 최소 시간 간격 (ms)
        this.lastProcessedTime = 0;
    }

    /**
     * 현재 시점에서 프레임을 처리할 수 있는지 확인합니다.
     * @returns {boolean} 처리 가능하면 true, 아니면 false
     */
    canProcess() {
        const now = Date.now();
        if (now - this.lastProcessedTime >= this.minInterval) {
            this.lastProcessedTime = now;
            return true;
        }
        return false;
    }
}

