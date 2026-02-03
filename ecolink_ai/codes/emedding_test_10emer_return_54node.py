import torch
import json
from codes.models.st_gcn_18_10words_54node import STGCNModel 
import numpy as np

label_list=['교통사고','구해주세요','깔리다','배고프다','병원','불나다','숨을안쉬다','쓰러지다','아빠','연락해주세요']



def process_keypoints(frames_json, fixed_length=60):
    # 관절개수계산
    num_pose = 12
    num_hand = 21
    num_nodes = num_pose + 2 * num_hand

    # 54관절 * 4차원, 불러와서 리스트에
    keypoints_all = []
    for frame in frames_json:
        pose = frame.get('pose_landmarks') or []
        lhand = frame.get('left_hand_landmarks') or []
        rhand = frame.get('right_hand_landmarks') or []

        frame_kps = []
        for i in range(num_pose):
            if i < len(pose):
                kp = pose[i]
                frame_kps.append([kp['x'], kp['y'], kp['z'], kp['visibility']])
            else:
                frame_kps.append([0, 0, 0, 0])
        for i in range(num_hand):
            if i < len(lhand):
                kp = lhand[i]
                frame_kps.append([kp['x'], kp['y'], kp['z'], kp['visibility']])
            else:
                frame_kps.append([0, 0, 0, 0])
        for i in range(num_hand):
            if i < len(rhand):
                kp = rhand[i]
                frame_kps.append([kp['x'], kp['y'], kp['z'], kp['visibility']])
            else:
                frame_kps.append([0, 0, 0, 0])
        keypoints_all.append(frame_kps)

    # 프레임 개수 맞추기
    T = len(keypoints_all)
    if T < fixed_length:
        padding = [[0, 0, 0, 0]] * num_nodes
        for _ in range(fixed_length - T):
            keypoints_all.append(padding)
    elif T > fixed_length:
        keypoints_all = keypoints_all[:fixed_length]

    # numpy 배열로 바꾸기 (프레임수, 54관절, 4차원) -> (4, 프레임수, 54)
    arr = np.array(keypoints_all).transpose(2, 0, 1)

    # PyTorch 텐서로 변환 (배치사이즈=1, 4, 프레임수, 54)
    return torch.tensor(arr, dtype=torch.float32).unsqueeze(0)

def classify(model_path, json_data):
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

    # 모델 준비
    model = STGCNModel(in_channels=4, num_class=10) #########확인#########
    checkpoint = torch.load(model_path, map_location=device) #체크포인트 불러와서
    model.load_state_dict(checkpoint['model_state_dict']) #가중치 부분 적용
    model.to(device)
    model.eval()

    # 입력 데이터 준비
    x = process_keypoints(json_data)
    x = x.to(device).contiguous() #텐서 재배치

    # 추론
    with torch.no_grad():
        output = model(x)
        pred = torch.argmax(output, dim=1).item()
        probs = torch.softmax(output, dim=1)
        # max_prob, pred = torch.max(torch.softmax(output, dim=1), dim=1)
        # max_prob = max_prob.item()
        # pred = pred.item()

    return label_list[pred]

    # threshold = 0.5  # 임계값 설정 (예시)

    # if max_prob <= threshold:
    #     return "검출실패"
    # else:
    #     return label_list[pred]






# if __name__ == "__main__":
#     model_path = "C:/Users/DS/Desktop/kimsihyun/Communication_Bridge/ecolink_ai/datas/best_model_checkpoint_10.pth"
#     json_path = "C:/Users/DS/Desktop/kimsihyun/Communication_Bridge/ecolink_ai/datas/KETI_SL_0000010899.json"

#     classify(model_path, json_path) 
