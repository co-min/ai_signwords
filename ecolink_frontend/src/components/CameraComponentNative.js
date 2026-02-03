//앱 전용을 위한 코드

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';
import { Camera } from 'expo-camera';
import Svg, { Circle, Line } from 'react-native-svg';
import socketService from '../services/socket';

const CameraComponent = () => {
  const [hasPermission, setHasPermission] = useState(null);
  const [keypoints, setKeypoints] = useState([]);
  const cameraRef = useRef(null);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();

    socketService.connect('ws://<SERVER_IP>:8765');
    const handleData = (data) => setKeypoints(data.keypoints || []);
    socketService.addListener(handleData);

    return () => {
      socketService.removeListener(handleData);
      socketService.disconnect();
    };
  }, []);

  const captureAndSendFrame = async () => {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync({ base64: true });
      socketService.sendFrame(photo.base64);
    }
  };

  // (renderKeypoints 함수는 생략. 위와 동일하게 유지)

  if (hasPermission === null) return <Text>카메라 권한 요청 중...</Text>;
  if (hasPermission === false) return <Text>카메라 권한이 없습니다.</Text>;

  return (
    <View style={styles.container}>
      <Camera style={styles.camera} ref={cameraRef} type={Camera.Constants.Type.front} />
      <Button title="프레임 전송" onPress={captureAndSendFrame} />
      <Text>OpenPose 실시간 데이터</Text>
      <Svg style={StyleSheet.absoluteFill}>{renderKeypoints()}</Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  camera: { width: '100%', height: '70%' },
});

export default CameraComponent;
