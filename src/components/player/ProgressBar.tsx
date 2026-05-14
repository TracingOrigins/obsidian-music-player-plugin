/**
 * 播放进度条组件
 *
 * 进度条支持指针拖动与单击跳转（立即 seek）；左侧时间单击/双击快退，右侧单击/双击快进。
 */

import React from "react";
import "./ProgressBar.css";
import { t } from "@/utils/i18n/i18n";

/** 区分单击与双击的延迟（毫秒） */
const CLICK_VS_DOUBLE_MS = 280;

/**
 * 播放进度条组件的属性接口
 */
export interface ProgressBarProps {
	/** 当前播放时间（秒） */
	current: number;
	/** 总时长（秒） */
	duration: number;
	/** 跳转到指定比例（0–1），单击与拖动过程中会多次调用 */
	onSeek: (ratio: number) => void;
	/** 快退若干秒（正数，由实现从当前时间减去） */
	onSeekBackward: (seconds: number) => void;
	/** 快进若干秒（正数） */
	onSeekForward: (seconds: number) => void;
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
 * 播放进度条：指针按下即 seek，拖动过程中连续 seek；释放指针结束拖动。
 */
export function ProgressBar({ current, duration, onSeek, onSeekBackward, onSeekForward }: ProgressBarProps) {
	const percent = duration > 0 ? Math.min(Math.max((current / duration) * 100, 0), 100) : 0;

	const barRef = React.useRef<HTMLDivElement | null>(null);
	const dragActiveRef = React.useRef(false);
	const [isDragging, setIsDragging] = React.useState(false);

	/** DOM 定时器 id（用 number 避免与 NodeJS.Timeout 在 tsc 下的冲突） */
	const leftClickTimerRef = React.useRef<number | null>(null);
	const rightClickTimerRef = React.useRef<number | null>(null);

	React.useEffect(() => {
		return () => {
			if (leftClickTimerRef.current) window.clearTimeout(leftClickTimerRef.current);
			if (rightClickTimerRef.current) window.clearTimeout(rightClickTimerRef.current);
		};
	}, []);

	/**
	 * 拖动期间在 activeDocument 上拦截 touchmove（非 passive + preventDefault），
	 * 避免 Obsidian / WebView 把水平滑动识别为侧栏收缩或边缘系统手势（弹窗窗口用 activeDocument）。
	 */
	React.useEffect(() => {
		if (!isDragging) return;
		const blockTouchMove = (e: TouchEvent) => {
			e.preventDefault();
		};
		window.activeDocument.addEventListener("touchmove", blockTouchMove, { passive: false });
		return () => {
			window.activeDocument.removeEventListener("touchmove", blockTouchMove);
		};
	}, [isDragging]);

	const seekFromClientX = React.useCallback(
		(clientX: number) => {
			const el = barRef.current;
			if (!el) return;
			const rect = el.getBoundingClientRect();
			const w = rect.width;
			if (w <= 0) return;
			const ratio = (clientX - rect.left) / w;
			onSeek(Math.min(Math.max(ratio, 0), 1));
		},
		[onSeek]
	);

	const endBarDrag = React.useCallback((e: React.PointerEvent<HTMLDivElement>) => {
		if (!dragActiveRef.current) return;
		e.stopPropagation();
		const target = e.currentTarget;
		try {
			if (target.hasPointerCapture(e.pointerId)) {
				target.releasePointerCapture(e.pointerId);
			}
		} catch {
			// 已释放时忽略
		}
		dragActiveRef.current = false;
		setIsDragging(false);
	}, []);

	const onBarLostPointerCapture = React.useCallback(() => {
		dragActiveRef.current = false;
		setIsDragging(false);
	}, []);

	const onBarPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
		if (e.pointerType === "mouse" && e.button !== 0) return;
		e.stopPropagation();
		if (e.pointerType === "touch") {
			e.preventDefault();
		}
		dragActiveRef.current = true;
		setIsDragging(true);
		try {
			e.currentTarget.setPointerCapture(e.pointerId);
		} catch {
			dragActiveRef.current = false;
			setIsDragging(false);
			return;
		}
		seekFromClientX(e.clientX);
	};

	const onBarPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
		if (!dragActiveRef.current) return;
		e.stopPropagation();
		e.preventDefault();
		seekFromClientX(e.clientX);
	};

	const scheduleLeftSingle = () => {
		if (leftClickTimerRef.current) window.clearTimeout(leftClickTimerRef.current);
		leftClickTimerRef.current = window.setTimeout(() => {
			leftClickTimerRef.current = null;
			onSeekBackward(5);
		}, CLICK_VS_DOUBLE_MS);
	};

	const onLeftTimeClick = (e: React.MouseEvent) => {
		e.stopPropagation();
		scheduleLeftSingle();
	};

	const onLeftTimeDoubleClick = (e: React.MouseEvent) => {
		e.stopPropagation();
		e.preventDefault();
		if (leftClickTimerRef.current) {
			window.clearTimeout(leftClickTimerRef.current);
			leftClickTimerRef.current = null;
		}
		onSeekBackward(15);
	};

	const scheduleRightSingle = () => {
		if (rightClickTimerRef.current) window.clearTimeout(rightClickTimerRef.current);
		rightClickTimerRef.current = window.setTimeout(() => {
			rightClickTimerRef.current = null;
			onSeekForward(5);
		}, CLICK_VS_DOUBLE_MS);
	};

	const onRightTimeClick = (e: React.MouseEvent) => {
		e.stopPropagation();
		scheduleRightSingle();
	};

	const onRightTimeDoubleClick = (e: React.MouseEvent) => {
		e.stopPropagation();
		e.preventDefault();
		if (rightClickTimerRef.current) {
			window.clearTimeout(rightClickTimerRef.current);
			rightClickTimerRef.current = null;
		}
		onSeekForward(15);
	};

	return (
		<div className="play-progress-container">
			<span
				className="play-time current-time"
				aria-label={t("playback.progress.currentHint")}
				onClick={onLeftTimeClick}
				onDoubleClick={onLeftTimeDoubleClick}
			>
				{formatTime(current)}
			</span>
			<div
				ref={barRef}
				className={`play-progress-bar${isDragging ? " is-dragging" : ""}`}
				onPointerDown={onBarPointerDown}
				onPointerMove={onBarPointerMove}
				onPointerUp={endBarDrag}
				onPointerCancel={endBarDrag}
				onLostPointerCapture={onBarLostPointerCapture}
			>
				<div className="play-progress-fill" style={{ width: `${percent}%` }} />
			</div>
			<span
				className="play-time duration"
				aria-label={t("playback.progress.durationHint")}
				onClick={onRightTimeClick}
				onDoubleClick={onRightTimeDoubleClick}
			>
				{formatTime(duration)}
			</span>
		</div>
	);
}

