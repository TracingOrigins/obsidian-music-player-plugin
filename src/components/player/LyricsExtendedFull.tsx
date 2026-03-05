/**
 * 逐字时间歌词完整列表组件
 * 
 * 显示完整的逐字时间歌词列表，支持：
 * - 自动滚动到当前播放的歌词行
 * - 高亮显示当前播放的歌词行
 * - 逐字高亮的卡拉OK效果
 * - 点击歌词行跳转到对应时间点
 */

import React from "react";
import "./LyricsExtendedFull.css";
import type { ExtendedLyricLine } from "@/utils/lyrics/extendedParser";

/**
 * 计算字符填充进度的辅助函数
 * 
 * 根据当前播放时间和字符的时间范围，计算字符的填充进度（0-1）。
 * 
 * @param currentTime 当前播放时间（秒）
 * @param charTime 字符开始时间（秒）
 * @param charEndTime 字符结束时间（秒）
 * @returns 返回填充进度（0-1）
 */
function calculateCharProgress(currentTime: number, charTime: number, charEndTime: number): number {
	if (currentTime >= charEndTime) return 1;
	if (currentTime <= charTime) return 0;
	const charDuration = charEndTime - charTime;
	const elapsed = currentTime - charTime;
	return Math.min(elapsed / charDuration, 1);
}

/**
 * 逐字时间歌词完整列表组件的属性接口
 */
export interface LyricsExtendedFullProps {
	/** 完整的逐字时间歌词列表 */
	fullLyrics: ExtendedLyricLine[];
	/** 当前播放时间（秒），用于计算逐字高亮进度 */
	currentTime: number;
	/** 当前激活的歌词行索引（用于滚动定位） */
	activeIndex: number;
	/** 当前播放的歌词索引，用于加大字号高亮 */
	playingIndex: number;
	/** 切换显示模式的回调函数 */
	onToggleMode: () => void;
	/** 点击歌词行时的跳转（不强制开始播放） */
	onSeek: (time: number) => void;
	/** 滚动容器的 ref */
	scrollRef: React.RefObject<HTMLDivElement>;
	/** 歌词行的 ref 数组，用于滚动定位 */
	lineRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
}

/**
 * 歌词行组件的属性接口（内部使用，使用 memo 优化）
 */
interface LineProps {
	line: ExtendedLyricLine;
	index: number;
	currentTime: number;
	isActive: boolean;
	isPlaying: boolean;
	playingIndex: number;
	onSeek: (time: number) => void;
	lineRef: (el: HTMLDivElement | null) => void;
}

const LineComponent = React.memo(({ line, index, currentTime, isActive, isPlaying, playingIndex, onSeek, lineRef }: LineProps) => {
	// 预计算字符的结束时间和文本，避免在渲染时重复计算
	const charsData = React.useMemo(() => {
		return line.chars.map((charData, charIndex) => {
			const nextChar = line.chars[charIndex + 1];
			const charEndTime = nextChar ? nextChar.time : (charData.time + 0.1);
			return { char: charData.char, charTime: charData.time, charEndTime };
		});
	}, [line.chars]);

	// 计算每个字符的进度，只在当前行激活时计算
	const shouldCalculateProgress = isActive || isPlaying;
	
	// 判断是否是播放过的歌词（index < playingIndex）
	const isPlayed = playingIndex >= 0 && index < playingIndex;
	
	return (
		<div
			ref={lineRef}
			className={`lyrics-extended-line ${isActive ? "is-active" : ""} ${isPlaying ? "is-playing" : ""} ${isPlayed ? "is-played" : ""}`}
		>
			<div
				className="lyrics-extended-text"
				onClick={(e) => {
					e.stopPropagation();
					if (Number.isFinite(line.time)) {
						onSeek(line.time);
					}
				}}
			>
				{charsData.map(({ char, charTime, charEndTime }, charIndex) => {
					// 对于播放过的歌词，所有字符都应该完全填充（显示完整高亮）
					// 对于当前行，计算逐字进度
					// 对于其他行，如果时间已过则填充，否则不填充
					const fillProgress = isPlayed 
						? 1 
						: (shouldCalculateProgress 
							? calculateCharProgress(currentTime, charTime, charEndTime)
							: (currentTime >= charEndTime ? 1 : 0));

					return (
						<span key={charIndex} className="lyrics-extended-char">
							<span className="lyrics-extended-char-bg">{char}</span>
							<span 
								className="lyrics-extended-char-fill"
								style={{
									transform: `scaleX(${fillProgress})`,
									transformOrigin: 'left',
								}}
							>
								{char}
							</span>
						</span>
					);
				})}
			</div>
		</div>
	);
}, (prevProps, nextProps) => {
	// 快速路径：如果关键属性没变，不重新渲染
	if (prevProps.index !== nextProps.index) return false;
	if (prevProps.isActive !== nextProps.isActive) return false;
	if (prevProps.isPlaying !== nextProps.isPlaying) return false;
	if (prevProps.playingIndex !== nextProps.playingIndex) return false;
	if (prevProps.line !== nextProps.line) return false;
	
	// 对于逐字歌词，currentTime 的任何变化都需要重新渲染以保持流畅
	// 不再对 currentTime 进行节流，确保每次更新都能触发渲染
	if (prevProps.currentTime !== nextProps.currentTime) return false;
	
	// 只有当所有属性都相同时才跳过渲染
	return true;
});

LineComponent.displayName = 'LineComponent';

export function LyricsExtendedFull({
	fullLyrics,
	currentTime,
	activeIndex,
	playingIndex,
	onToggleMode,
	onSeek,
	scrollRef,
	lineRefs,
}: LyricsExtendedFullProps) {
	// 如果没有歌词，显示提示信息
	if (!fullLyrics || fullLyrics.length === 0) {
		return (
			<div className="lyrics-extended lyrics-extended-empty">
				<span className="lyrics-extended-empty-text">暂无逐字歌词</span>
			</div>
		);
	}

	return (
		<div
			className="lyrics-extended lyrics-extended-scroll"
			ref={scrollRef}
			style={{
				paddingTop: 0,
				paddingBottom: 0,
			}}
		>
			{fullLyrics.map((line, index) => (
				<LineComponent
					key={index}
					line={line}
					index={index}
					currentTime={currentTime}
					isActive={index === activeIndex}
					isPlaying={index === playingIndex}
					playingIndex={playingIndex}
					onSeek={onSeek}
					lineRef={(el) => {
						lineRefs.current[index] = el;
					}}
				/>
			))}
		</div>
	);
}

