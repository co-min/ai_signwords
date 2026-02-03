import numpy as np
import cv2
import sys
import time
import mediapipe as mp
import json



# 카메라에 접근
# pose 전체 list -> return, json 저장





# 관절(pose, hand, face) 검출을 위한 모델 클래스 (를 포함한 모듈...)
mp_holistic = mp.solutions.holistic
# 검출한 관절을 그리기 위한 함수, 스타일 설정 (를 포함한 모듈22)
mp_drawing = mp.solutions.drawing_utils 
mp_drawing_styles = mp.solutions.drawing_styles




def landmarks_to_dict(landmarks, indices=None):
    if landmarks is None:
        return None
    if indices is not None:
        return [
            {'x': landmarks.landmark[i].x,
             'y': landmarks.landmark[i].y,
             'z': landmarks.landmark[i].z,
             'visibility': getattr(landmarks.landmark[i], 'visibility', None)}
            for i in indices
        ]
    else:
        return [
            {'x': lm.x, 'y': lm.y, 'z': lm.z, 'visibility': getattr(lm, 'visibility', None)}
            for lm in landmarks.landmark
        ]





def video_to_keypoints(cap, time_threshold=3):    
    ret, prev_frame=cap.read()		# 첫 프레임
    prev_gray=cv2.cvtColor(prev_frame,cv2.COLOR_BGR2GRAY)

    #state 준비
    moved=0
    motion_state = "Waiting"  
    stop_start_time_waiting = None
    stop_start_time_recognizing = None

    #list 준비
    prev_time=0
    all_frames = []
    frame_idx = 0


    with mp_holistic.Holistic(
        static_image_mode=True, min_detection_confidence=0.5, model_complexity=2) as holistic:

        while(1):
            ret,frame=cap.read()	# 비디오를 구성하는 프레임 획득
            if not ret:
                sys.exit('프레임 획득에 실패하여 루프를 나갑니다.')

            curr_gray=cv2.cvtColor(frame,cv2.COLOR_BGR2GRAY)
            flow=cv2.calcOpticalFlowFarneback(prev_gray,curr_gray,None,0.5,3,15,3,5,1.2,0)    # optical flow 계산

            moved=0
            for y in range(16//2,frame.shape[0],16):
                for x in range(16//2,frame.shape[1],16):
                    dx,dy = flow[y,x].astype(int)
                    if (dx*dx+dy*dy) > 200 :
                        cv2.line(frame,(x,y),(x+dx,y+dy),(0,0,255),2) # 큰 모션 있는 곳은 빨간색
                        moved+=1
                    else :
                        # cv2.line(frame,(x,y),(x+dx,y+dy),(0,255,0),2)
                        pass

            curr_time = time.time()

            if moved < 5:
                # 정지 상태
                if motion_state == "Waiting":
                    if stop_start_time_waiting is None:
                        stop_start_time_waiting = curr_time
                    stop_duration = curr_time - stop_start_time_waiting
                    if stop_duration >= time_threshold:
                        motion_state = "Recognizing"
                        stop_start_time_waiting = None
                        stop_start_time_recognizing = None
                elif motion_state == "Recognizing":
                    if stop_start_time_recognizing is None:
                        stop_start_time_recognizing = curr_time
                    stop_duration = curr_time - stop_start_time_recognizing
                    if stop_duration >= time_threshold:
                        motion_state = "Recognition Ended"
                        stop_start_time_recognizing = None
            else:
                # 움직임 있음
                stop_start_time_waiting = None
                stop_start_time_recognizing = None

            # 매 프레임 현재 상태 출력
            color_map = {
                "Waiting": (255, 255, 255),
                "Recognizing": (0, 255, 0),
                "Recognition Ended": (0, 0, 255)
            }
            cv2.putText(frame, motion_state, (20, 50), cv2.FONT_HERSHEY_SIMPLEX,
                        1, color_map[motion_state], 2)
            



        
            if motion_state=="Recognizing":

                # 예측 수행 (cvtColor는 전처리)
                results = holistic.process(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))

                # 프레임에 그리기
                # frame = frame.copy()
                mp_drawing.draw_landmarks(frame, results.left_hand_landmarks, mp_holistic.HAND_CONNECTIONS)
                mp_drawing.draw_landmarks(frame, results.right_hand_landmarks, mp_holistic.HAND_CONNECTIONS)
                mp_drawing.draw_landmarks(
                    frame,
                    results.face_landmarks,
                    mp_holistic.FACEMESH_TESSELATION,
                    landmark_drawing_spec=None,
                    connection_drawing_spec=mp_drawing_styles
                    .get_default_face_mesh_tesselation_style())
                mp_drawing.draw_landmarks(
                    frame,
                    results.pose_landmarks,
                    mp_holistic.POSE_CONNECTIONS,
                    landmark_drawing_spec=mp_drawing_styles.
                    get_default_pose_landmarks_style())

                # FPS 계산해서 프레임에 출력 
                sec = curr_time - prev_time
                prev_time = curr_time
                fps = 1/(sec)
                fps_str = "FPS : %0.1f" % fps
                cv2.putText(frame, fps_str, (0, 100), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0))

                # 결과 저장, 표시
                result_dict = {
                    'frame': frame_idx,
                    'pose_landmarks': landmarks_to_dict(results.pose_landmarks, list(range(11, 23))),
                    'left_hand_landmarks': landmarks_to_dict(results.left_hand_landmarks),
                    'right_hand_landmarks': landmarks_to_dict(results.right_hand_landmarks)
                }
                all_frames.append(result_dict)
                frame_idx += 1


            cv2.imshow('Optical flow',frame)

            prev_gray=curr_gray   # 현재 프레임을 이전 프레임으로

            key=cv2.waitKey(30)	# 30밀리초 동안 키보드 입력 기다림
            if key==ord('q'):	
                break

            
        cap.release()			# 카메라와 연결을 끊음
        cv2.destroyAllWindows()
    
    return all_frames


