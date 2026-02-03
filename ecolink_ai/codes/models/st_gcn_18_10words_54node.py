import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np


class Graph:
    def __init__(self):
        self.num_node = 54
        self.A = self.create_graph()

    def create_graph(self):
        self_link = [(i, i) for i in range(self.num_node)]
        pose_links = [
            (0,2), (1,3),      # 어깨-팔꿈치
            (2,4), (3,5),      # 팔꿈치-손목
            (4,6), (4,8), (4,10), # 왼손목-왼손가락
            (5,7), (5,9), (5,11), # 오른손목-오른손가락
            (6,8), (8,10),     # 왼손가락 마디
            (7,9), (9,11)      # 오른손가락 마디
        ]
        lhand_start = 12
        rhand_start = 33
        hand_links = []
        finger_offsets = [0,4,8,12,16]
        for hand_start in [lhand_start, rhand_start]:
            for offset in finger_offsets:
                for i in range(3):
                    hand_links.append((hand_start + offset + i, hand_start + offset + i +1))
        body_hand_links = [(15,lhand_start),(16,rhand_start)]
        all_links = self_link + pose_links + hand_links + body_hand_links
        A = np.zeros((self.num_node, self.num_node))
        for i,j in all_links:
            A[i,j] = 1
            A[j,i] = 1
        return A


class ConvTemporalGraphical(nn.Module):
    def __init__(self, in_channels, out_channels, kernel_size):
        super().__init__()
        self.kernel_size = kernel_size
        self.conv = nn.Conv2d(in_channels, out_channels*kernel_size, kernel_size=1)
    def forward(self, x, A):
        x = self.conv(x)  # (N, out_channels*kernel_size, T, V)
        n, kc, t, v = x.size()
        x = x.view(n, self.kernel_size, kc//self.kernel_size, t, v)  # (N, K, C_out, T, V)
        x = torch.einsum('nkctv,kvw->nctw', (x, A))  # graph conv
        return x, A

class st_gcn(nn.Module):
    def __init__(self, in_channels, out_channels, kernel_size, stride=1, dropout=0, residual=True):
        super().__init__()
        padding = ((kernel_size[0]-1)//2, 0)
        self.gcn = ConvTemporalGraphical(in_channels, out_channels, kernel_size[1])
        self.tcn = nn.Sequential(
            nn.BatchNorm2d(out_channels),
            nn.ReLU(inplace=True),
            nn.Conv2d(out_channels, out_channels, (kernel_size[0],1), stride=(stride,1), padding=padding),
            nn.BatchNorm2d(out_channels),
            nn.Dropout(dropout, inplace=True)
        )

        if not residual:
            self.residual = lambda x: 0
        elif in_channels == out_channels and stride==1:
            self.residual = lambda x: x
        else:
            self.residual = nn.Sequential(
                nn.Conv2d(in_channels, out_channels, kernel_size=1, stride=(stride,1)),
                nn.BatchNorm2d(out_channels),
            )
        self.relu = nn.ReLU(inplace=True)

    def forward(self, x, A):
        res = self.residual(x)
        x, A = self.gcn(x, A)
        x = self.tcn(x) + res
        return self.relu(x), A


class STGCNModel(nn.Module):
    def __init__(self, in_channels=4, num_class=10):
        super().__init__()
        self.graph = Graph()
        A = torch.tensor(self.graph.A, dtype=torch.float32).unsqueeze(0).repeat(3,1,1)
        self.register_buffer('A', A)

        spatial_kernel_size = 3
        temporal_kernel_size = 9
        kernel_size = (temporal_kernel_size, spatial_kernel_size)

        self.data_bn = nn.BatchNorm1d(in_channels * self.graph.num_node)
        self.st_gcn_networks = nn.ModuleList([
            st_gcn(in_channels, 64, kernel_size, residual=False),
            st_gcn(64, 64, kernel_size),
            st_gcn(64, 64, kernel_size),
            st_gcn(64, 64, kernel_size),
            st_gcn(64, 128, kernel_size, stride=2),
            st_gcn(128, 128, kernel_size),
            st_gcn(128, 128, kernel_size),
            st_gcn(128, 256, kernel_size, stride=2),
            st_gcn(256, 256, kernel_size),
            st_gcn(256, 256, kernel_size),
        ])
        self.fcn = nn.Conv2d(256, num_class, kernel_size=1)

    def forward(self, x):
        N, C, T, V = x.size()
        x = x.view(N, C * V, T)
        x = self.data_bn(x)
        x = x.view(N, C, T, V)

        for gcn in self.st_gcn_networks:
            x, _ = gcn(x, self.A)

        x = F.avg_pool2d(x, x.size()[2:])
        x = x.view(N, -1)
        x = self.fcn(x.unsqueeze(-1).unsqueeze(-1))
        x = x.view(N, -1)
        return x
