import json
import os
import numpy as np


# 캠으로 얻은 json 정규화 -> return, json 저장


# 1. 잡음 - 앞뒤로 움직이지 않는 프레임 제거

# 2. 신체조건에대해..
    # 2.1. 프레임을 잘라서 직사각형을 만든다. 조건: 직사각형 안에는 모든 프레임의 모든 키포인트가 들어가야함
    # 2.2. 직사각형의 우측상단을 (1,0) 좌측상단을 (0,0) 좌측하단을 (1,1) 우측하단을 (0,1)로 두고 나머지 keypoint들의 좌표값을 바꾼다

# 3. 속도 - 보류
    # 3.방법1. 보간or삭제 해서 프레임수 맞추기
    # 3.방법2. z score
    # 3.방법3. DTW



def has_hand(frame):
    left_hand = frame.get('left_hand_landmarks')
    right_hand = frame.get('right_hand_landmarks')
    has_left_hand = False
    has_right_hand = False

    if left_hand is None:
        has_left_hand = False
    else:
        y_over_left = sum(kp.get('y', 0) >= 1 for kp in left_hand)
        has_left_hand = y_over_left ==0

    if right_hand is None:
        has_right_hand = False
    else:
        y_over_right = sum(kp.get('y', 0) >= 1 for kp in right_hand)
        has_right_hand = y_over_right ==0

    # print(has_left_hand,has_right_hand,has_left_hand or has_right_hand)
    return has_left_hand or has_right_hand




def is_moving(prev_points, curr_points):
    flow = curr_points - prev_points  # shape: (N, 2)
    magnitude = np.linalg.norm(flow, axis=1)  # shape: (N,)
    threshold=0.05
    moved=0
    for i, (dx, dy) in enumerate(flow):
        # print(dx*dx+dy*dy)
        if (dx*dx+dy*dy) > threshold :
            moved+=1
    
    if moved>5:
        state="moving"
    else:
        state="stop"

    return state


def get_points(frame):
    points = []

    pose = frame.get('pose_landmarks') or []
    for i in range(33):
        if i < len(pose):
            kp = pose[i]
            points.append([kp['x'], kp['y']])
        else:
            points.append([0, 0])
    # 왼손 21개
    lhand = frame.get('left_hand_landmarks') or []
    for i in range(21):
        if i < len(lhand):
            kp = lhand[i]
            points.append([kp['x'], kp['y']])
        else:
            points.append([0, 0])
    # 오른손 21개
    rhand = frame.get('right_hand_landmarks') or []
    for i in range(21):
        if i < len(rhand):
            kp = rhand[i]
            points.append([kp['x'], kp['y']])
        else:
            points.append([0, 0])
    return np.array(points)  # shape: (54, 2)





def normalization(data):
    # 1. 파일 오픈
    # with open(input_file, 'r') as f:
    #     data = json.load(f)



    # 2. 정규화


    # 2.1. 잡음 - 앞뒤로 프레임 제거
    # 시작
    if not has_hand(data[0]):
        # print("has hand로 찾기")
        start_idx = None
        for i in range(len(data)):
            if has_hand(data[i]):
                start_idx = i
                break
    else:
        # print("is_moving로 찾기")
        start_idx = None
        for i in range(len(data) - 1):
            prev_points = get_points(data[i])
            curr_points = get_points(data[i+1])
            state = is_moving(prev_points, curr_points)
            if state == "moving":
                start_idx = i
                break
    if start_idx is None:
        # print("못찾음,디폴트")
        start_idx = 0

    # 끝
    if not has_hand(data[-1]):
        # print("has hand로 찾기")
        end_idx = None
        for i in range(len(data)-1, -1, -1):
            if has_hand(data[i]):
                end_idx = i
                break
    else:
        # print("is_moving로 찾기")
        end_idx = None
        for i in range(len(data)-1, -1, -1):
            prev_points = get_points(data[i-1])
            curr_points = get_points(data[i])
            state = is_moving(prev_points, curr_points)
            if state == "moving":
                end_idx = i
                break
    if end_idx is None:
        # print("못찾음,디폴트")
        end_idx = len(data) - 1




    # 필터링
    data = data[start_idx:end_idx + 1]

    for new_idx, frame in enumerate(data):
        frame['frame'] = new_idx






    # 2.2. 신체조건에대해 - 직사각형 잘라서 landmark들 이동
    keypoints = []
    for frame in data:
        for part in ['pose_landmarks', 'left_hand_landmarks', 'right_hand_landmarks']:
            landmarks = frame.get(part)
            if isinstance(landmarks, list) and len(landmarks) > 0:
                for landmark in landmarks:
                    keypoints.append([landmark['x'], landmark['y'], landmark['z']])
    keypoints = np.array(keypoints) #minmax 처리를위해 numpy 배열로 바꿈

    min_x, min_y = np.min(keypoints[:, 0]), np.min(keypoints[:, 1])
    max_x, max_y = np.max(keypoints[:, 0]), np.max(keypoints[:, 1])
    norm_x = (keypoints[:, 0] - min_x) / (max_x - min_x)
    norm_y = (keypoints[:, 1] - min_y) / (max_y - min_y)
    norm_z = keypoints[:, 2]

    keypoints = np.stack([norm_x, norm_y, norm_z], axis=1) 

    # 처리한 결과 다시 data에 넣음
    idx = 0
    for frame in data:
        for part in ['pose_landmarks', 'left_hand_landmarks', 'right_hand_landmarks']:
            if part in frame and frame[part] is not None:
                for landmark in frame[part]:
                    landmark['x'] = keypoints[idx, 0]
                    landmark['y'] = keypoints[idx, 1]
                    landmark['z'] = keypoints[idx, 2]
                    idx += 1


    
    # 2.3. 동작 수행 속도에 대해 - 60프레임으로 늘리기

    original_frame_count = len(data)
    target_frame_count = 60  # 원하는 프레임 개수

    indices = np.linspace(0, original_frame_count-1, target_frame_count).astype(int)
    new_data = [data[i] for i in indices]




    # 3. 결과 저장
    # with open(output_file, 'w') as f:
    #     json.dump(new_data, f, indent=2)
                


    return new_data



# if __name__ == "__main__":
#     # 폴더 내 모든 파일 처리
#     input_dir = 'C:/Users/DS/Downloads/aug1_me'
#     output_dir = 'C:/Users/DS/Downloads/aug2_nor'

#     for root, dirs, files in os.walk(input_dir):
#         for file in files:
#             if not file.endswith('.json'):
#                 continue
#             input_file = os.path.join(root, file).replace('\\', '/')
#             rel_path = os.path.relpath(input_file, input_dir).replace('\\', '/')
#             base_name, ext = os.path.splitext(os.path.basename(rel_path))  # 파일명만 분리
#             output_folder = os.path.join(output_dir, os.path.dirname(rel_path)).replace('\\', '/')
#             output_file = os.path.join(output_folder, f"{base_name}{ext}").replace('\\', '/')

#             # 상위 디렉터리 생성 (output_file의 상위 폴더)
#             os.makedirs(os.path.dirname(output_file), exist_ok=True)

#             # 정규화 및 저장
#             try:
#                 new_data=normalization(input_file, output_file)
#             except Exception as e:
#                 print(f"Error processing {input_file}: {e}")
