---
title: lerobot0.4教程
published: 2026-07-15
description: 
image: ./cover.png
tags: [lerobot, manual]
category: lerobot
draft: false
---

# 一 环境与硬件准备
## 1 软件环境安装
基于Ubuntu24.04，python3.10
### 1.1 miniconda3创建虚拟环境
```shell
wget https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh
sh Miniconda3-latest-Linux-x86_64.sh
source ~/.bashrc

conda create -n lerobot python=3.10
conda activate lerobot
```

### 1.2 克隆代码库并安装相关包与舵机驱动
```shell
git clone https://github.com/JoyandAI/lerobot.git
# 若已经有0.3版本 则输入以下更新仓库指令 
git pull
```
```python
cd lerobot
pip install -e ".[feetech]"
conda install -c conda-forge ffmpeg=7.1.1
```
