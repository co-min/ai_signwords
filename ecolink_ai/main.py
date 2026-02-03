import cv2
import sys

from codes.videoTest_mediapipe_cam_json import video_to_keypoints
from codes.normalization_cam import normalization
from codes.emedding_test_10emer_return_54node import classify


checkpoint_path='datas/54node10emer_tryNor_gaussimirrorcamAugmen2.pth'


cap=cv2.VideoCapture(0)
if not cap.isOpened():
    sys.exit('카메라 연결 실패')
    
all_frames=video_to_keypoints(cap, 2)
normalized_data=normalization(all_frames)
result=classify(checkpoint_path,normalized_data)
print(f'결과: {result}')