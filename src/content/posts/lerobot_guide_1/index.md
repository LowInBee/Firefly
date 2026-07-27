---
title: lerobot0.4/0.5教程
published: 2026-07-15
description: 简短教程
image: ./cover.png
tags: [lerobot, manual]
category: lerobot
draft: false
---

# 一 环境与硬件准备
## 1.1 软件环境安装
基于Ubuntu24.04，
1. python3.10，lerobot0.4
2. python3.12，lerobot0.5

参考手册：
1. [huggingface官方](https://huggingface.co/docs/lerobot/v0.5.1/en/index)
2. [飞书文档](https://tcnppips4y7o.feishu.cn/wiki/T4a5w7vpDi74e1kTukVcELYknVf)
3. [真机采集数据、训练参考koch](https://huggingface.co/docs/lerobot/main/en/getting_started_real_world_robot?teleoperate_koch_camera=Command)

### 1.1.1 miniconda3创建虚拟环境
```shell
wget https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh
sh Miniconda3-latest-Linux-x86_64.sh
source ~/.bashrc

conda create -n lerobot04 python=3.10
conda activate lerobot04
#如果是0.5版本，则需要：
conda create -n lerobot05 python=3.12
conda activate lerobot05
```

### 1.1.2 克隆代码库并安装相关包与舵机驱动
```shell
git clone https://github.com/JoyandAI/lerobot.git
# 若已经有0.3版本 则输入以下更新仓库指令 
git pull
#切换到dev分支，0.5版本代码在这里
git checkout dev
git pull origin dev
```
```python
cd lerobot
pip install -e ".[feetech]"
conda install -c conda-forge ffmpeg=7.1.1
```

```
pip install evdev 
#WSL 用户额外安装
```
### 1.1.3 WSL+ROCM用户
```
pip install -e ".[all]" --no-deps
pip check
pip install datasets accelerate wandb diffusers transformers
```
或者
找到`pyproject.toml`,删除
```
torch
torchvision
torchaudio
```
运行
```
pip install -e ".[all]"
```


## 1.2 机械臂位置手动标定

### 1.2.1 确定编号
```shell
lerobot-find-port
```
拔出USB设备按enter，并给端口权限
```shell
sudo chmod +666 /dev/ttyACM0 /dev/ttyACM1
```

### 1.2.2 从臂：
端口号需和上一步对应，设备名称自定
```shell
lerobot-calibrate \
    --robot.type=so101_follower \
    --robot.port=/dev/ttyACM1 \
    --robot.id=myfollower01
```
- 将机械臂放在middle位后enter
- 将每个关节放在最大和最小位置
回车保存于`~/.cache/huggingface/lerobot/calibration/robots/so101_follower/myfollower01.json`
v0.5版本保存于`~/.cache/huggingface/lerobot/calibration/robots/so_follower/myfollower01.json`

### 1.2.3 主臂：
```shell
lerobot-calibrate \
    --teleop.type=so101_leader \
    --teleop.port=/dev/ttyACM0 \
    --teleop.id=myleader01
```
- 将机械臂放在middle位后enter
- 将每个关节放在最大和最小位置

> [!CAUTION] 注意
> 若标定时出现某个关节为负值或者大于4095时，Ctrl+C 然后断开电源后再插上，重新标定即可。

回车保存于`~/.cache/huggingface/lerobot/calibration/teleoperators/so101_leader/myleader01.json`
v0.5版本保存于`~/.cache/huggingface/lerobot/calibration/teleoperators/so_leader/myleader01.json`
### 1.2.4 检查同步
```shell
lerobot-teleoperate \
    --robot.type=so101_follower \
    --robot.port=/dev/ttyACM1 \
    --robot.id=myfollower01 \
    --teleop.type=so101_leader \
    --teleop.port=/dev/ttyACM0 \
    --teleop.id=myleader01
```
> [!WARNING] 警告
> 检查第2、3、6号关节在 rest 位置时，是否处于与 Leader 臂同步的状态。如差异很大，可能 Leader 臂处于 rest 位时 follower 扭矩还很大，导致舵机发热、过热。

## 1.3 相机配置
### 1.3.1 查看相机编号
```shell
lerobot-find-cameras
```
> [!NOTE] 提示
> 插拔或电脑重启之后序列对应关系会发生变化

在`lerobot/output/captured_images`目录下，可以看到 2个获取的图像文件

### 1.3.2 示教时显示相机画面
```shell
lerobot-teleoperate \
    --robot.type=so101_follower \
    --robot.port=/dev/ttyACM1 \
    --robot.id=myfollower01 \
    --robot.cameras="{ 'wrist': {'type': 'opencv', 'index_or_path': 0, 'width': 640, 'height': 480, 'fps': 60}}" \
    --teleop.type=so101_leader \
    --teleop.port=/dev/ttyACM0 \
    --teleop.id=myleader01 \
    --display_data=true
```
### 1.3.3 本地录制
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
    --robot.type=so101_follower \
    --robot.port=/dev/ttyACM1 \
    --robot.id=myfollower01 \
    --robot.cameras="{'wrist': {'type':'opencv', 'index_or_path':0, 'width':640, 'height':480, 'fps':60}, 'front': {'type':'opencv', 'index_or_path':2, 'width':640, 'height':480, 'fps':30}}" \
    --teleop.type=so101_leader \
    --teleop.port=/dev/ttyACM0 \
    --teleop.id=myleader01 \
    --display_data=true \
    --dataset.repo_id=${HF_USER}/so101_test \
    --dataset.num_episodes=10 --dataset.episode_time_s=20 \
    --dataset.single_task="Grab the black cube"
```
只有一个摄像头时，camera参数部分为：
```shell
--robot.cameras="{'handeye': {'type':'opencv', 'index_or_path':0, 'width':640, 'height':480, 'fps':60}}
```
如果要继续上一次的录制，可以添加：` --resume=true `。训练完的 数据集存放在`./cache/huggingface/lerobot/${HF_USER}/so101_test`下面
> [!WARNING] 警告
> 第2次录制时，使用相同的 dataset.repo_id 参数会报 File exists 错误。要么 dataset.repo_id 换名字，要么删除原来的，要么加 “--resume=true” 继续录制到该数据集。

每次动作的结束以两种方式：
1. 计时到 episode_time_s
2. 如果动作已完成，按键盘向右键提前结束当前轮次
3. 按键盘向左键重录当前轮次
4. 按ESC退出录制

# 二 模型训练

## 2.1 基本流程
1. 手动操作主臂完成目标动作（如抓取杯子）  
2. 从臂通过摄像头同步记录动作轨迹  
3. 建议先采集10组左右跑通整个流程，需要更好的效果再采集更多组（比如≥50）组动作序列。 

## 2.2 训练配置
- act, Action Chunking Transformers
- diffusion, Diffusion Policy
- tdmpc, TDMPC Policy
- vqbet, VQ-BeT
- smolvla, SmolVLA
- pi0, A Vision-Language-Action Flow Model for General Robot Control
- pi0-fast
pi0、pi0.5模型都需要格外下载依赖
```shell
pip install "lerobot[pi]"
```
- sac
- reward_classifier
本地训练，不上传模型时添加选项“--policy.push_to_hub=false”
```shell
lerobot-train \
  --dataset.repo_id=${HF_USER}/so101_test \
  --policy.type=act \
  --output_dir=outputs/train/act_so101_test \
  --job_name=act_so101_test \
  --policy.device=cuda \
  --policy.push_to_hub=false \
  --wandb.enable=false
```
继续之前中断的训练，可以使用下面的命令：
```shell
lerobot-train \
  --config_path=outputs/train/act_so101_test/checkpoints/last/pretrained_model/train_config.json \
  --resume=true
```
## 2.3 SmolVLA训练
先安装相关依赖包
```shell
pip install -e ".[smolvla]"
```
大陆用户，设置Huggingface的国内镜像：
```shell
export HF_ENDPOINT=https://hf-mirror.com
```
```shell
lerobot-train \
  --dataset.repo_id=${HF_USER}/so101_test --policy.push_to_hub=false \
  --policy.type=smolvla --policy.device=cuda \
  --output_dir=outputs/train/smolvla_test \
  --job_name=smolvla_test \
  --batch_size=64 --steps=20000 \
  --wandb.enable=false
```
> [!NOTE] 提示
>如果报显存不足的错误，请减小batch_size。如果显存只有8GB，batch_size 最好设置在28以内。
如果需要上传到huggingface，则选项 policy.push_to_hub 修改为 “--policy.push_to_hub=true”

# 三 模型测试
## 3.1 实时推理测试 
### 3.1.1 v0.5
v0.5.2版本下的代码，lerobot把推理与数据录制分离，之前record也用于推理，现在record为纯录制。
现在用rollout来进行模型的推理。在rollout下有两种不同的推理方式，这里为了做简单的快速验证，我们先用最基本不带录制的推理命令。
```shell
lerobot-rollout \
    --strategy.type=base \
    --policy.path=outputs/smolvla/checkpoints/100000/pretrained_model \
    --robot.type=so101_follower \
    --robot.port=/dev/ttyACM1 \
    --robot.id=myfollower01
    --robot.cameras='{"wrist": {"type": "opencv", "index_or_path": 0, "width": 640, "height": 480, "fps": 60}, "front": {"type": "opencv", "index_or_path": 2, "width": 640, "height": 480, "fps": 30}}' \
    --task="catch the block into the box" \
    --duration=300 \
    --display_data=true \
    --interpolation_multiplier 2
```

### 3.3.2 v0.4
> [!NOTE] 提示
>这里仍然用的是 record.py，是推理的同时记录数据集，可能huggingface希望大家把数据集都上传到HF。但提供了 policy，确实是用指定策略模型推理
```shell
lerobot-record  \
  --robot.type=so101_follower --robot.port=/dev/ttyACM1 --robot.id=myfollower01 \
  --teleop.type=so101_leader --teleop.port=/dev/ttyACM0 --teleop.id=myleader01 \
  --robot.disable_torque_on_disconnect=true \
  --robot.cameras="{'wrist': {'type': 'opencv', 'index_or_path': 0, 'width': 640, 'height': 480, 'fps': 60}, 'front': {'type': 'opencv', 'index_or_path': 2, 'width': 640, 'height': 480, 'fps': 30}}" \
  --display_data=true \
  --dataset.single_task="Put lego brick into the transparent box" \
  --policy.path=outputs/pretrained_model \
  --policy.device=cuda \
  --dataset.repo_id=${HF_USER}/eval_so101 --dataset.push_to_hub=false
```

## 3.2 RTC推理测试
RTC为内部多线程异步推理，仅限于smovla、pi0、pi0.5 实时推理性比较差的模型，解决了推理中机器需要停下来等待模型推理的问题，可以使得推理速度变快
```shell
lerobot-rollout \
    --strategy.type=base \
    --policy.path=outputs/smolvla/checkpoints/100000/pretrained_model \
    --robot.type=so101_follower \
    --robot.id=myfollower01 \
    --robot.port=/dev/ttyACM1 \
    --robot.cameras="{'wrist': {'type': 'opencv', 'index_or_path': 0, 'width': 640, 'height': 480, 'fps': 60}, 'front': {'type': 'opencv', 'index_or_path': 2, 'width': 640, 'height': 480, 'fps': 30}}" \
    --task="catch the block into the box" \
    --inference.type=rtc \
    --inference.rtc.execution_horizon=10 \
    --inference.rtc.max_guidance_weight=10.0 \
    --duration=300 \
    --display_data=true \
    --dataset.push_to_hub=false
```
## 3.3 Sentry持续录制
长时间持续录制，不分episode，一口气录到底，事后处理数据集
```shell
lerobot-rollout \
    --strategy.type=sentry \
    --strategy.upload_every_n_episodes=5 \
    --policy.path=outputs/pretrained_model \
    --inference.type=rtc \
    --robot.type=so101_follower \
    --robot.port=/dev/ttyACM1 \
    --dataset.repo_id=myuser/rollout_sentry_data \
    --dataset.single_task="patrol" \
    --dataset.push_to_hub=false \
    --duration=3600
```

## 3.4 推理时常见问题
- 调节 src\lerobot\robots\so101_follower\so101_follower.py 中 set_so100_robot_preset()函数中的 D_Coefficient 参数，改得小一点，比如0。
- 检查舵机供电（7.4V从臂需2A以上电源，12V从臂需2A以上电源）  
- 动作偏移：重新校准关节零点
- 训练失败：减少batch_size或增加数据集多样性  

