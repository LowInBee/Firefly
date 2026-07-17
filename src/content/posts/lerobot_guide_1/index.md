---
title: lerobot0.4教程
published: 2026-07-15
description: 简短教程
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

## 2 机械臂位置手动标定

### 2.1 确定编号
```shell
lerobot-find-port
```
拔出USB设备按enter，并给端口权限
```shell
sudo chmod +666 /dev/ttyACM0 /dev/ttyACM1
```

### 2.1 从臂：
端口号需和上一步对应，设备名称自定
```shell
lerobot-calibrate \
    --robot.type=so101_follower \
    --robot.port=/dev/ttyACM1 \
    --robot.id=myfollower01
```
将机械臂放在middle位后enter
将每个关节放在最大和最小位置
回车保存于`~/.cache/huggingface/lerobot/calibration/robots/so101_follower/myfollower01.json`

### 2.2 主臂：
```shell
lerobot-calibrate \
    --teleop.type=so101_leader \
    --teleop.port=/dev/ttyACM0 \
    --teleop.id=myleader01
```
将机械臂放在middle位后enter
将每个关节放在最大和最小位置

> [!CAUTION] 注意
> 若标定时出现某个关节为负值或者大于4095时，Ctrl+C 然后断开电源后再插上，重新标定即可。

回车保存于`~/.cache/huggingface/lerobot/calibration/robots/so101_leader/myleader01.json`

### 2.3 检查同步
```shell
lerobot-teleoperate \
    --robot.type=so101_follower \
    --robot.port=/dev/ttyACM1 \
    --robot.id=myfollower01
    --teleop.type=so101_leader \
    --teleop.port=/dev/ttyACM0 \
    --teleop.id=myleader01
```
> [!WARNING] 警告
> 检查第2、3、6号关节在 rest 位置时，是否处于与 Leader 臂同步的状态。如差异很大，可能 Leader 臂处于 rest 位时 follower 扭矩还很大，导致舵机发热、过热。

## 3 相机配置
### 3.1 查看相机编号
```shell
lerobot-find-cameras
```
> [!NOTE] 提示
> 插拔或电脑重启之后序列对应关系会发生变化

在`lerobot/output/captured_images`目录下，可以看到 2个获取的图像文件

### 3.2 示教时显示相机画面
```shell
lerobot-teleoperate \
    ---robot.type=so101_follower \
    --robot.port=/dev/ttyACM1 \
    --robot.id=myfollower01
    --robot.cameras="{ 'wrist': {'type': 'opencv', 'index_or_path': 0, 'width': 640, 'height': 360, 'fps': 30}}" \
    --teleop.type=so101_leader \
    --teleop.port=/dev/ttyACM0 \
    --teleop.id=myleader01
    --display_data=true
```
### 3.3 本地录制
地录制比较简单，不用获取Hugging face 的token。<br>
先直接设置 HF_USER 变量，可以直接设置为你的用户名。
```shell
export HF_USER=your_user_name
```
正面的命令比较长，可以写到脚本文件中：<br>
Linux  cmd.sh中以方便重复执行。<br>
再使用 record 命令开始录制（相比 teleoperate，多了后面 --dataset 的三个选项）
```shell
lerobot-record \
    --robot.disable_torque_on_disconnect=true \
    ---robot.type=so101_follower \
    --robot.port=/dev/ttyACM1 \
    --robot.id=myfollower01
    --robot.cameras="{'wrist': {'type':'opencv', 'index_or_path':0, 'width':640, 'height':360, 'fps':30}, 'front': {'type':'opencv', 'index_or_path':2, 'width':640, 'height':360, 'fps':30}}" \
    --teleop.type=so101_leader \
    --teleop.port=/dev/ttyACM0 \
    --teleop.id=myleader01
    --display_data=true \
    --dataset.repo_id=${HF_USER}/so101_test \
    --dataset.num_episodes=10 --dataset.episode_time_s=20 \
    --dataset.single_task="Grab the black cube"
```
只有一个摄像头时，camera参数部分为：
```shell
--robot.cameras="{'handeye': {'type':'opencv', 'index_or_path':0, 'width':640, 'height':360, 'fps':30}}
```
如果要继续上一次的录制，可以添加：` --resume=true `。训练完的 数据集存放在`./cache/huggingface/lerobot/${HF_USER}/so101_test`下面
> [!WARNING] 警告
> 第2次录制时，使用相同的 dataset.repo_id 参数会报 File exists 错误。要么 dataset.repo_id 换名字，要么删除原来的，要么加 “--resume=true” 继续录制到该数据集。

每次动作的结束以两种方式：
1. 计时到 episode_time_s
2. 如果动作已完成，按键盘向右键提前结束当前轮次
3. 按键盘向左键重录当前轮次
4. 按ESC退出录制

