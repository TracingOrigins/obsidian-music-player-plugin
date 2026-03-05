/**
 * 歌词自动滚动 Hook
 * 
 * 负责管理歌词列表的自动滚动逻辑，包括：
 * - 基于 playingIndex 的自动滚动，让当前行保持在容器中间
 * - 初次进入歌词模式时的「立即滚动到当前行」
 * - 手动滚动与自动滚动之间的状态区分
 * - 用户手动滚动后暂停自动滚动，5秒后自动恢复
 * - 如果在5秒内有新的手动滚动，则重新计时
 */

import React from "react";
import type { LyricLine } from "@/utils/lyrics/parser";
import type { ExtendedLyricLine } from "@/utils/lyrics/extendedParser";

/**
 * Hook 的输入参数
 */
export interface UseLyricsAutoScrollParams {
	/** 显示模式 */
	viewMode: "disc" | "lyrics";
	/** 要使用的歌词数据（普通 or 逐字） */
	lyricsToUse: LyricLine[] | ExtendedLyricLine[] | null;
	/** 当前播放的歌词行索引 */
	playingIndex: number;
	/** 是否是首次切换到歌词模式 */
	isInitialMount?: boolean;
	/** 首次切换完成的回调 */
	onInitialMountComplete?: () => void;
}

/**
 * Hook 的返回值
 */
export interface UseLyricsAutoScrollReturn {
	/** 滚动容器的 ref */
	scrollRef: React.RefObject<HTMLDivElement>;
	/** 歌词行的 ref 数组 */
	lineRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
}

/**
 * 歌词自动滚动 Hook
 * 
 * 管理歌词列表的自动滚动逻辑，包括初始定位和播放时的自动滚动。
 * 
 * @param params Hook 参数
 * @returns Hook 返回值
 */
export function useLyricsAutoScroll({
	viewMode,
	lyricsToUse,
	playingIndex,
	isInitialMount = false,
	onInitialMountComplete,
}: UseLyricsAutoScrollParams): UseLyricsAutoScrollReturn {
	const scrollRef = React.useRef<HTMLDivElement | null>(null);
	const lineRefs = React.useRef<(HTMLDivElement | null)[]>([]);
	const isAutoScrollingRef = React.useRef(false);
	const isInitialScrollRef = React.useRef(false);
	// 标记是否暂停自动滚动（用户手动滚动后）
	const isAutoScrollPausedRef = React.useRef(false);
	// 存储恢复自动滚动的定时器ID
	const resumeAutoScrollTimerRef = React.useRef<number | null>(null);

	// 确保 lineRefs 数组长度与歌词匹配（仅歌词模式）
	React.useEffect(() => {
		if (viewMode === "lyrics" && lyricsToUse && lyricsToUse.length > 0) {
			lineRefs.current = new Array(lyricsToUse.length).fill(null) as (HTMLDivElement | null)[];
		} else {
			lineRefs.current = [];
		}
	}, [viewMode, lyricsToUse]);

	// 辅助函数：将指定索引的歌词行定位到容器正中间（立即定位，无动画）
	const jumpLineToCenterAbove = React.useCallback((lineIndex: number) => {
		const container = scrollRef.current;
		const lineEl = lineRefs.current[lineIndex];
		if (!container || !lineEl) return false;

		const originalScrollBehavior = container.style.scrollBehavior;
		container.setCssProps({ scrollBehavior: 'auto' });

		const containerRect = container.getBoundingClientRect();
		const lineRect = lineEl.getBoundingClientRect();
		const containerHeight = containerRect.height;
		const centerY = containerHeight / 2;

		const lineTopRelative = lineRect.top - containerRect.top + container.scrollTop;
		const lineHeight = lineRect.height;
		const targetScrollTop = lineTopRelative - centerY + lineHeight / 2;

		container.scrollTop = Math.max(0, targetScrollTop);

		setTimeout(() => {
			container.setCssProps({ scrollBehavior: originalScrollBehavior });
		}, 0);

		return true;
	}, []);

	// 辅助函数：将指定索引的歌词行滚动到容器正中间（平滑滚动）
	const lastScrollIndexRef = React.useRef<number>(-1);
	const scrollLineToCenterAbove = React.useCallback((lineIndex: number) => {
		if (lastScrollIndexRef.current === lineIndex) return;
		lastScrollIndexRef.current = lineIndex;

		const container = scrollRef.current;
		const lineEl = lineRefs.current[lineIndex];
		if (!container || !lineEl) return;

		const containerRect = container.getBoundingClientRect();
		const lineRect = lineEl.getBoundingClientRect();
		const containerHeight = containerRect.height;
		const centerY = containerHeight / 2;

		const lineTopRelative = lineRect.top - containerRect.top + container.scrollTop;
		const lineHeight = lineRect.height;
		const targetScrollTop = lineTopRelative - centerY + lineHeight / 2;

		const currentScrollTop = container.scrollTop;
		if (Math.abs(targetScrollTop - currentScrollTop) < 10) return;

		container.scrollTo({
			top: targetScrollTop,
			behavior: 'smooth'
		});
	}, []);

	// 当首次切换到歌词模式时，立即定位到当前播放位置
	React.useLayoutEffect(() => {
		// 当切换到歌词模式且需要初始定位时，设置标记
		if (viewMode === "lyrics" && isInitialMount) {
			isInitialScrollRef.current = true;
		} else if (viewMode === "disc") {
			// 切换到 disc 模式时重置标记
			isInitialScrollRef.current = false;
			return;
		}

		// 只在歌词模式且需要初始定位时执行
		if (viewMode !== "lyrics" || !isInitialScrollRef.current) return;
		
		// 如果还没有歌词数据，等待
		if (playingIndex < 0 && (!lyricsToUse || lyricsToUse.length === 0)) {
			return;
		}

		// 如果 playingIndex < 0 但已有歌词数据，说明当前没有播放的歌词行
		if (playingIndex < 0) {
			isInitialScrollRef.current = false;
			if (onInitialMountComplete) {
				onInitialMountComplete();
			}
			return;
		}

		const attemptScroll = () => {
			const container = scrollRef.current;
			const lineEl = lineRefs.current[playingIndex];
			
			// 如果容器或元素还没准备好，重试
			if (!container || !lineEl) {
				setTimeout(attemptScroll, 10);
				return;
			}

			// 如果容器高度为0，重试
			if (container.clientHeight === 0) {
				setTimeout(attemptScroll, 10);
				return;
			}

			// 尝试滚动到当前播放位置
			const success = jumpLineToCenterAbove(playingIndex);
			if (success) {
				isInitialScrollRef.current = false;
				if (onInitialMountComplete) {
					onInitialMountComplete();
				}
			} else {
				// 如果第一次失败，再试一次
				setTimeout(() => {
					jumpLineToCenterAbove(playingIndex);
					isInitialScrollRef.current = false;
					if (onInitialMountComplete) {
						onInitialMountComplete();
					}
				}, 50);
			}
		};

		// 使用 requestAnimationFrame 确保 DOM 已渲染
		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				attemptScroll();
			});
		});
	}, [viewMode, isInitialMount, playingIndex, lyricsToUse, jumpLineToCenterAbove, onInitialMountComplete]);

	// 监听滚动事件，检测用户手动滚动
	React.useEffect(() => {
		if (viewMode !== "lyrics") {
			// 切换到非歌词模式时，重置暂停状态并清理定时器
			isAutoScrollPausedRef.current = false;
			if (resumeAutoScrollTimerRef.current !== null) {
				window.clearTimeout(resumeAutoScrollTimerRef.current);
				resumeAutoScrollTimerRef.current = null;
			}
			return;
		}

		const container = scrollRef.current;
		if (!container) return;

		const handleScroll = () => {
			// 如果是自动滚动，不处理
			if (isAutoScrollingRef.current) return;

			// 用户手动滚动，暂停自动滚动
			isAutoScrollPausedRef.current = true;

			// 清除之前的定时器
			if (resumeAutoScrollTimerRef.current !== null) {
				window.clearTimeout(resumeAutoScrollTimerRef.current);
			}

			// 设置新的5秒定时器，5秒后恢复自动滚动
			resumeAutoScrollTimerRef.current = window.setTimeout(() => {
				isAutoScrollPausedRef.current = false;
				resumeAutoScrollTimerRef.current = null;
			}, 5000);
		};

		container.addEventListener('scroll', handleScroll, { passive: true });

		return () => {
			container.removeEventListener('scroll', handleScroll);
			// 清理定时器
			if (resumeAutoScrollTimerRef.current !== null) {
				window.clearTimeout(resumeAutoScrollTimerRef.current);
			}
		};
	}, [viewMode]);

	// 当播放进度变化时，自动把当前行滚动到容器正中间（仅歌词模式）
	React.useEffect(() => {
		if (viewMode !== "lyrics" || isInitialScrollRef.current) return;
		if (playingIndex < 0) return;
		// 如果自动滚动被暂停（用户手动滚动后），则不执行自动滚动
		if (isAutoScrollPausedRef.current) return;

		isAutoScrollingRef.current = true;
		scrollLineToCenterAbove(playingIndex);
		window.setTimeout(() => {
			isAutoScrollingRef.current = false;
		}, 400);
	}, [viewMode, playingIndex, scrollLineToCenterAbove]);

	// 当切换到歌词模式且需要初始定位时，设置标记
	// 使用 useLayoutEffect 确保在渲染前设置，这样 useLayoutEffect 中的滚动逻辑能正确执行
	React.useLayoutEffect(() => {
		if (viewMode === "lyrics" && isInitialMount) {
			isInitialScrollRef.current = true;
		} else if (viewMode === "disc") {
			// 切换到 disc 模式时重置标记和清理定时器
			isInitialScrollRef.current = false;
			isAutoScrollPausedRef.current = false;
			if (resumeAutoScrollTimerRef.current !== null) {
				window.clearTimeout(resumeAutoScrollTimerRef.current);
				resumeAutoScrollTimerRef.current = null;
			}
		}
	}, [viewMode, isInitialMount]);

	// 组件卸载时清理定时器
	React.useEffect(() => {
		return () => {
			if (resumeAutoScrollTimerRef.current !== null) {
				window.clearTimeout(resumeAutoScrollTimerRef.current);
			}
		};
	}, []);

	return {
		scrollRef,
		lineRefs,
	};
}

