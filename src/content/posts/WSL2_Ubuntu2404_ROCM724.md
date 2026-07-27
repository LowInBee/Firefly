---
title: AMD 7900xt + WSL2 + ROCm7.2.4 配置AI开发环境
published: 2026-07-26
description: wsl2与ROCM7.2

tags: [ubuntu, ROCM, manual, wsl]
category: ubuntu
draft: false
---

# AMD 7800xt + WSL2 + ROCm 7.2.4 配置AI开发环境

## WSL2 + Ubuntu 24.04 + ROCm 7.2.4 + Conda AI 开发环境配置

> **环境**：Windows 11 + WSL2 + AMD Radeon RX 7800 XT（Adrenalin 26.2.2）+ ROCm 7.2.4 + PyTorch 2.9.1

---

### 前置条件

| 项目         | 要求                       |
| ---------- | ------------------------ |
| Windows 版本 | Windows 11（WSL2 必需）      |
| AMD 显卡驱动   | Adrenalin Edition 26.2.2 |
| WSL2       | 已启用                      |
| 发行版        | Ubuntu 24.04 LTS         |

---

### 与 Ubuntu 22.04 版本的关键差异

如果之前用过 22.04 + ROCm 7.2.1 的方案，迁移到 24.04 + ROCm 7.2.4 时请注意以下变化：

| 变化点              | 22.04 + 7.2.1                     | 24.04 + 7.2.4                  |
| ---------------- | --------------------------------- | ------------------------------ |
| apt 源代号          | jammy                             | noble                          |
| apt 源格式          | 传统 `sources.list`                 | DEB822 `ubuntu.sources`        |
| GPG 密钥方式         | `apt-key add`（已弃用）                | `signed-by` keyring（强制要求）      |
| Python 版本        | 3.10（cp310）                       | 3.12（cp312）                    |
| PyTorch wheel 目录 | `rocm-rel-7.2` / `rocm-rel-7.2.1` | `rocm-rel-7.2.4`               |
| librocdxg 版本     | v1.1.2（仅 roct 包）                  | v1.2.1（roct + amd-smi-lib 两个包） |

---

### 第1步：安装 Ubuntu 24.04 WSL

在 **Windows PowerShell / Terminal** 中执行：

```powershell
wsl --install -d Ubuntu-24.04
```

安装完成后设置用户名和密码，然后进入 WSL：

```powershell
wsl -d Ubuntu-24.04
```

或
```shell
wsl --import <发行版名称> <安装目录> <镜像文件完整路径> --version 2
wsl --import ROS2 V:\ROS V:\ros_backup.wsl --version 2
```



---

### 第2步：配置 apt 清华镜像源

Ubuntu 24.04 默认采用 DEB822 格式的 `ubuntu.sources`，不再使用传统的 `sources.list`。

```bash
# 备份原配置
sudo cp /etc/apt/sources.list.d/ubuntu.sources /etc/apt/sources.list.d/ubuntu.sources.bak.$(date +%Y%m%d)

# 写入清华镜像源（DEB822 格式，noble）
sudo tee /etc/apt/sources.list.d/ubuntu.sources << 'EOF'
Types: deb
URIs: https://mirrors.tuna.tsinghua.edu.cn/ubuntu
Suites: noble noble-updates noble-backports
Components: main restricted universe multiverse
Signed-By: /usr/share/keyrings/ubuntu-archive-keyring.gpg

Types: deb
URIs: https://mirrors.tuna.tsinghua.edu.cn/ubuntu
Suites: noble-security
Components: main restricted universe multiverse
Signed-By: /usr/share/keyrings/ubuntu-archive-keyring.gpg
EOF

# 清理可能残留的旧格式文件，避免重复源
sudo rm -f /etc/apt/sources.list

sudo apt update
```

---

### 第3步：安装基础依赖

```bash
sudo apt install -y \
    build-essential \
    cmake \
    git \
    wget \
    curl \
    gnupg2 \
    software-properties-common \
    libjpeg-dev \
    python3-dev \
    python3-pip \
    pkg-config \
    libnuma-dev \
    libdrm-dev \
    aria2
```

---

### 第4步：添加 ROCm 7.2.4 仓库

> **重要**：Ubuntu 24.04 已移除 `apt-key`，必须使用 `signed-by` keyring 方式注册 GPG 密钥，否则仓库会被忽略并报签名警告。

```bash
# 创建 keyring 目录（发行版推荐位置）
sudo mkdir --parents --mode=0755 /etc/apt/keyrings

# 下载 AMD GPG 密钥并转换为 apt 所需的 keyring 格式
wget https://repo.radeon.com/rocm/rocm.gpg.key -O - | \
    gpg --dearmor | sudo tee /etc/apt/keyrings/rocm.gpg > /dev/null

# 添加 ROCm 7.2.4 仓库（Ubuntu 24.04 = noble）
sudo tee /etc/apt/sources.list.d/rocm.list << 'EOF'
deb [arch=amd64 signed-by=/etc/apt/keyrings/rocm.gpg] https://repo.radeon.com/rocm/apt/7.2.4 noble main
EOF

# 设置 apt 优先级，强制使用 AMD 官方仓库（解决与系统仓库的版本冲突）
sudo tee /etc/apt/preferences.d/rocm-pin-600 << 'EOF'
Package: *
Pin: release o=repo.radeon.com
Pin-Priority: 600
EOF

sudo apt update
```

---

### 第5步：安装 ROCm 7.2.4

WSL2 下不需要也无法安装 Linux 内核 amdgpu 驱动，因此只安装开发与运行时组件：

```bash
sudo apt install -y rocm-dev rocm-libs
```

如果提示依赖冲突，先查询可用版本，再按需显式指定：

```bash
# 查询各组件在 AMD 仓库中的可用版本
apt-cache madison rocm-cmake rocm-device-libs rocm-core

# 示例：显式指定 7.2.4 版本安装（版本号以 madison 输出为准）
sudo apt install -y rocm-dev rocm-libs rocm-core
```

---

### 第6步：安装 librocdxg（WSL GPU 支持核心组件）

`librocdxg` 是 ROCm 在 WSL2 下识别 GPU 的用户态桥接库（通过微软 DXCore 接口与 Windows 显卡驱动通信）。从 ROCm 7.2.1 起官方提供生产支持，本教程使用最新 **v1.2.1**（新增 WSL 专用 amdsmi 打包）。

```bash
cd /tmp

# 下载 v1.2.1 的两个预编译 deb 包
wget https://github.com/ROCm/librocdxg/releases/download/v1.2.1/rocdxg-roct_1.2.1_amd64.deb
wget https://github.com/ROCm/librocdxg/releases/download/v1.2.1/rocdxg-amd-smi-lib_1.2.1_amd64.deb

# 安装（先装 roct 主包，再装 amd-smi-lib）
sudo dpkg -i rocdxg-roct_1.2.1_amd64.deb
sudo dpkg -i rocdxg-amd-smi-lib_1.2.1_amd64.deb

# 修复可能的依赖
sudo apt --fix-broken install -y
```

---

### 第7步：配置环境变量

将以下内容追加到 `~/.bashrc`：

```bash
cat >> ~/.bashrc << 'EOF'

# ROCm
export PATH=/opt/rocm/bin:/opt/rocm/hip/bin:$PATH
export HSA_ENABLE_DXG_DETECTION=1
EOF

source ~/.bashrc
```

> `HSA_ENABLE_DXG_DETECTION=1` 是 WSL2 下 ROCm 通过 DXG 识别 GPU 的必需变量。

---

### 第8步：验证 ROCm 安装

```bash
rocminfo | grep "Marketing Name"
```

**预期输出**：能看到你的 AMD GPU 型号（如 `Radeon RX 7800 XT`）。

> **注意**：`rocm-smi` 在 WSL2 下会报错 `Driver not initialized (amdgpu not found)`，这是**正常现象**，因为 WSL2 没有 Linux 内核 amdgpu 模块。GPU 状态请在 **Windows 主机** 上通过 Adrenalin 软件或任务管理器查看。

---

### 第9步：安装 Miniconda + 配置国内镜像

```bash
# 下载 Miniconda（清华镜像）
wget https://mirrors.tuna.tsinghua.edu.cn/anaconda/miniconda/Miniconda3-latest-Linux-x86_64.sh -O miniconda.sh

# 安装
bash miniconda.sh -b -p $HOME/miniconda3

# 初始化
~/miniconda3/bin/conda init bash
source ~/.bashrc
```

#### 配置 Conda 清华镜像

```bash
conda config --add channels https://mirrors.tuna.tsinghua.edu.cn/anaconda/pkgs/main
conda config --add channels https://mirrors.tuna.tsinghua.edu.cn/anaconda/pkgs/free
conda config --add channels https://mirrors.tuna.tsinghua.edu.cn/anaconda/cloud/conda-forge
conda config --add channels https://mirrors.tuna.tsinghua.edu.cn/anaconda/cloud/pytorch
conda config --set show_channel_urls yes
```

#### 配置 pip 清华镜像

```bash
mkdir -p ~/.config/pip
cat > ~/.config/pip/pip.conf << 'EOF'
[global]
index-url = https://pypi.tuna.tsinghua.edu.cn/simple
trusted-host = pypi.tuna.tsinghua.edu.cn
EOF
```

---

### 第10步：创建 Conda 环境

```bash
conda create -n myenv python=3.12 -y
conda activate myenv
```

> **Python 3.12 是必需的**：AMD 官方 ROCm 7.2.4 的 PyTorch 2.9.1 wheel 仅提供 `cp312` 构建，匹配 Ubuntu 24.04 的默认 Python 版本。使用 3.10/3.11 将找不到对应 wheel。

---

### 第11步：安装 PyTorch 2.9.1 for ROCm 7.2.4

**重要**：PyPI（`download.pytorch.org/whl/rocm7.2`）上没有 PyTorch 2.9.1 的 ROCm 稳定版，只有 2.11.0/2.12.0 nightly。必须从 **AMD 官方仓库** 下载预编译 whl。

#### 下载 whl 包（使用 aria2c 多线程加速）

```bash
mkdir -p ~/pytorch_whl && cd ~/pytorch_whl

# 下载 torch 2.9.1（约 1.6GB）
wget https://repo.radeon.com/rocm/manylinux/rocm-rel-7.2.4/torch-2.9.1%2Brocm7.2.4.lw.git39497456-cp312-cp312-linux_x86_64.whl

# 下载 torchvision 0.24.0（约 2.9MB）
wget https://repo.radeon.com/rocm/manylinux/rocm-rel-7.2.4/torchvision-0.24.0%2Brocm7.2.4.gitb919bd0c-cp312-cp312-linux_x86_64.whl

# 下载 torchaudio 2.9.0（约 488KB）
wget https://repo.radeon.com/rocm/manylinux/rocm-rel-7.2.4/torchaudio-2.9.0%2Brocm7.2.4.gite3c6ee2b-cp312-cp312-linux_x86_64.whl

# 下载 triton 3.5.1（PyTorch 编译优化必需，约 284MB）
wget https://repo.radeon.com/rocm/manylinux/rocm-rel-7.2.4/triton-3.5.1%2Brocm7.2.4.gita272dfa8-cp312-cp312-linux_x86_64.whl
```

> 若下载缓慢，可改用 aria2c 多线程：`aria2c -x 8 -s 8 <上述URL>`

#### 本地安装

```bash
cd ~/pytorch_whl
pip install ./*.whl
```

#### 版本对应关系（AMD 官方仓库 rocm-rel-7.2.4）

| 包           | 版本     | 构建标识                     | 说明               |
| ----------- | ------ | ------------------------ | ---------------- |
| torch       | 2.9.1  | rocm7.2.4.lw.git39497456 | 核心框架             |
| torchvision | 0.24.0 | rocm7.2.4.gitb919bd0c    | 图像处理             |
| torchaudio  | 2.9.0  | rocm7.2.4.gite3c6ee2b    | 音频处理             |
| triton      | 3.5.1  | rocm7.2.4.gita272dfa8    | PyTorch 编译优化（必需） |

---

### 第12步：验证 PyTorch + GPU

```bash
python -c "
import torch
print(f'PyTorch版本: {torch.__version__}')
print(f'ROCm/HIP版本: {torch.version.hip}')
print(f'GPU可用: {torch.cuda.is_available()}')
print(f'GPU数量: {torch.cuda.device_count()}')
if torch.cuda.is_available():
    print(f'GPU名称: {torch.cuda.get_device_name(0)}')
    x = torch.rand(1000, 1000).cuda()
    y = torch.rand(1000, 1000).cuda()
    z = x @ y
    print('GPU 矩阵乘法测试通过')
"
```

**预期输出**：

```
PyTorch版本: 2.9.1+rocm7.2.4.lw.git39497456
ROCm/HIP版本: 7.2.xxxx
GPU可用: True
GPU数量: 1
GPU名称: AMD Radeon RX 7800 XT
GPU 矩阵乘法测试通过
```

---

### 第13步：安装常用 AI 开发包（可选）

```bash
pip install numpy==1.26.4 pandas matplotlib scikit-learn \
    transformers accelerate huggingface-hub safetensors \
    pillow opencv-python sentencepiece protobuf
```

> **注意**：PyTorch 2.9.1 ROCm wheel 与 numpy 2.x 不兼容，需固定为 `numpy==1.26.4`。

---

### 附录 A：WSL 环境备份与恢复

#### 备份（导出为 tar）

```powershell
# 停止 WSL（确保数据一致性）
wsl --shutdown

# 导出为 tar 文件
wsl --export rocm724 I:\U2404ROCM724.tar
```

#### 恢复（从 tar 导入）

```powershell
# 导入为新发行版
wsl --import Ubuntu-24.04-Restore D:\WSL\Ubuntu-24.04-Restore D:\WSL_Backups\ubuntu2404_rocm_backup.tar

# 设置默认用户（否则进入是 root）
ubuntu2404.exe config --default-user xlrong
```

> `D:\WSL\Ubuntu-24.04-Restore` 是**新虚拟磁盘的存放目录**，不是工作路径，可自定义为任意有空间的目录。

#### 快速克隆（同一台机器）

```powershell
wsl --export Ubuntu-24.04 D:\WSL_Backups\base.tar
wsl --import Ubuntu-24.04-Clone D:\WSL\Clone D:\WSL_Backups\base.tar
```

---

### 附录 B：常见问题速查

#### Q1: `apt update` 报 GPG 签名警告 / 仓库被忽略

**原因**：Ubuntu 24.04 移除了 `apt-key`，旧式 `apt-key add` 注册的密钥不再生效。

**解决**：按第4步使用 `signed-by=/etc/apt/keyrings/rocm.gpg` 方式重新注册密钥与仓库。

#### Q2: `apt install rocm-dev` 报错依赖冲突

**原因**：系统仓库（universe）中的旧版 ROCm 组件与 AMD 官方 7.2.4 冲突。

**解决**：确认第4步的 apt 优先级配置（`Pin: release o=repo.radeon.com` + `Pin-Priority: 600`）已生效；必要时用 `apt-cache madison <包名>` 查询版本后显式指定 7.2.4 版本安装。

#### Q3: `pip install torch==2.9.1` 在 PyPI 上找不到 ROCm 版

**原因**：PyPI 的 `whl/rocm7.2` 索引只有 2.11.0/2.12.0 nightly，没有 2.9.1 稳定版。

**解决**：从 AMD 官方仓库下载 whl（见第11步）。

#### Q4: PyTorch wheel 提示找不到匹配的 Python 版本

**原因**：ROCm 7.2.4 的 PyTorch 2.9.1 wheel 仅为 `cp312`（Python 3.12）构建。

**解决**：Conda 环境必须创建为 `python=3.12`（见第10步）。

#### Q5: `rocm-smi` 报错 `amdgpu not found`

**原因**：WSL2 是虚拟机，没有 Linux amdgpu 内核模块。

**解决**：这是正常的，用 `rocminfo` 和 PyTorch 验证 GPU 即可。

#### Q6: numpy 报 ABI 不兼容错误

**原因**：PyTorch 2.9.1 ROCm wheel 与 numpy 2.x 不兼容。

**解决**：`pip install numpy==1.26.4`。

---

### 参考文档

- [AMD WSL How to Guide](https://rocm.docs.amd.com/projects/radeon-ryzen/en/latest/docs/install/installrad/wsl/howto_wsl.html)
- [ROCm/librocdxg GitHub](https://github.com/ROCm/librocdxg)
- [librocdxg v1.2.1 Release](https://github.com/ROCm/librocdxg/releases/tag/v1.2.1)
- [AMD ROCm PyTorch 安装指南](https://rocm.docs.amd.com/projects/radeon-ryzen/en/latest/docs/install/installrad/native_linux/install-pytorch.html)
- [ROCm 7.2.4 PyTorch Wheel 仓库目录](https://repo.radeon.com/rocm/manylinux/rocm-rel-7.2.4/)
- [AMD Radeon 兼容性矩阵](https://rocm.docs.amd.com/projects/radeon-ryzen/en/latest/docs/compatibility/compatibilityrad/compatibility.html)
- [Adrenalin Edition 26.2.2 版本说明](https://www.amd.com/en/resources/support-articles/release-notes/RN-RAD-WIN-26-2-2.html)
