---
title: ubuntu24.04新系统调教
published: 2026-07-15
description: 新系统准备工作
image: ./cover.jpg
tags: [ubuntu, manual]
category: ubuntu
draft: false
---

## 1 更新软件
可在设置中选择国内源，同时开启完整软件源
```shell
sudo apt update && sudo apt upgrade -y
sudo apt install linux-headers-$(uname -r) build-essential gcc g++ make cmake -y
#使用命令行开启完整软件源
sudo add-apt-repository universe
sudo add-apt-repository restricted
sudo add-apt-repository multiverse
sudo apt update
# 中文字体
sudo apt install fonts-wqy-microhei ttf-wqy-zenhei fonts-noto-cjk -y
# 完整语言包
sudo apt install language-pack-zh-hans language-pack-zh-hans-base -y
```
## 2 安装输入法
英文系统须在设置先添加中文
```shell
sudo apt install ibus-libpinyin ibus-pinyin
sudo reboot
```
## 3 安装miniconda3
```shell
wget https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh
sh Miniconda3-latest-Linux-x86_64.sh
source ~/.bashrc
```
conda命令
```shell
conda create -n <name> python=3.X
conda activate <name>
conda deactivate
conda env list
conda remove -n 环境名 --all
```

## 4 安装VScode
```shell
sudo apt install -y wget gpg apt-transport-https
# 下载并保存官方签名密钥
wget -qO- https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor | sudo tee /usr/share/keyrings/microsoft-code.gpg > /dev/null

echo "deb [arch=amd64 signed-by=/usr/share/keyrings/microsoft-code.gpg] https://packages.microsoft.com/repos/code stable main" | sudo tee /etc/apt/sources.list.d/vscode.list

sudo apt update
sudo apt install -y code

sudo apt remove code && sudo apt autoremove
```

## 5 安装clash verge（可选）
- 下载.deb文件
```shell
sudo dpkg -i ./文件名
sudo apt -f install -y #修复依赖
#或
sudo apt install ./xxx.deb
```

## 6 安装ssh（可选）
```shell
sudo apt install openssh-server -y
# 查看状态
systemctl status ssh
# 开机自启（默认装好就启用）
sudo systemctl enable ssh
# 重启ssh服务
sudo systemctl restart ssh
# 停止ssh
sudo systemctl stop ssh
```

## 7 安装Nvidia驱动
```shell
# 彻底卸载所有nvidia、cuda残留
sudo apt purge *nvidia* *cuda* *cudnn*
sudo apt autoremove -y
sudo apt autoclean
# 删除旧黑名单、xorg配置
sudo rm -rf /etc/modprobe.d/blacklist-nouveau.conf /etc/X11/xorg.conf /var/lib/dkms/nvidia*
# 更新系统内核与头文件
sudo apt update && sudo apt upgrade -y
sudo apt install linux-headers-$(uname -r) -y
sudo reboot
```
- RTX 20/30 系：nvidia-driver-570 稳定
- RTX 40 系：nvidia-driver-580 / 590
- RTX 50 系：必须 590+
- 深度学习 / AI 开发：带 -open 开源内核版（如 nvidia-driver-590-open）兼容性更好
```shell
ubuntu-drivers devices
sudo ubuntu-drivers autoinstall
#或
sudo apt install nvidia-driver-595-open -y #目前最新
```
安装中途会弹出蓝色 MOK 密码窗口：
1. 选 OK，设置 8~16 位自定义密码（记住！重启要用）
2. 安装完成执行重启
3. 开机自动进入 MOK Manager：
4. Enroll MOK → Continue → Yes
5. 输入刚才设置的密码，确认重启进系统

## 8修复 Wayland 显卡兼容问题（N 卡必关，避免黑屏、输入法失效）
```shell
sudo nano /etc/gdm3/daemon.conf
```
找到`#WaylandEnable=false`，去掉#，保存退出
```shell
sudo systemctl restart gdm3
```
注销重登，右上角齿轮选择 Ubuntu on Xorg。

## 9Git、网络工具、解压工具
```shell
sudo apt install git curl wget unzip zip tar net-tools iputils-ping tree htop -y
```