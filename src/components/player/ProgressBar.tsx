/**
 * 播放进度条组件
 * 
 * 显示当前播放进度，支持点击跳转到指定位置。
 * 包含当前时间和总时长显示。
 */

import React from "react";
import "./ProgressBar.css";

/**
 * 播放进度条组件的属性接口
 */
export interface ProgressBarProps {
	/** 当前播放时间（秒） */
	current: number;
	/** 总时长（秒） */
	duration: number;
	/** 点击进度条时的回调函数，参数为 0-1 之间的比例 */
	onSeek: (ratio: number) => void;
}

/**
 * 格式化时间为 MM:SS 格式
 * 
 * @param sec 秒数
 * @returns 返回格式化的时间字符串（如 "3:45"）
 */
export function formatTime(sec: number): string {
	if (!Number.isFinite(sec) || sec < 0) return "0:00";
	const s = Math.floor(sec);
	const m = Math.floor(s / 60);
	const r = s % 60;
	return `${m}:${r.toString().padStart(2, "0")}`;
}

/**
 * 播放进度条组件
 * 
 * 显示播放进度条，支持点击跳转。显示当前时间和总时长。
 * 
 * @param props 组件属性
 */
export function ProgressBar({ current, duration, onSeek }: ProgressBarProps) {
	const percent = duration > 0 ? Math.min(Math.max((current / duration) * 100, 0), 100) : 0;

	return (
		<div
			className="play-progress-container"
			onClick={(e) => {
				e.stopPropagation(); // 阻止事件冒泡，避免触发父容器的点击事件
				const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
				const ratio = (e.clientX - rect.left) / rect.width;
				onSeek(Math.min(Math.max(ratio, 0), 1));
			}}
		>
			<span className="play-time current-time">{formatTime(current)}</span>
			<div className="play-progress-bar">
				<div className="play-progress-fill" style={{ width: `${percent}%` }} />
			</div>
			<span className="play-time duration">{formatTime(duration)}</span>
		</div>
	);
}

