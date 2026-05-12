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
import { linearFillProgress } from "@/utils/lyrics/charFillProgress";
import { buildKaraokeUnits } from "@/utils/lyrics/karaokeUnits";

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
	const unitsData = React.useMemo(() => buildKaraokeUnits(line.chars, line), [line]);

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
				{unitsData.map(({ text, charTime, charEndTime }, unitIndex) => {
					const fillProgress = isPlayed
						? 1
						: shouldCalculateProgress
							? linearFillProgress(currentTime, charTime, charEndTime)
							: currentTime >= charEndTime
								? 1
								: 0;
					const isWs = text.length === 1 && /\s/.test(text);
					const isWordUnit =
						!isWs && text.length > 1 && /^[A-Za-z0-9'-]+$/.test(text);

					return (
						<span
							key={unitIndex}
							className={`lyrics-extended-char${isWs ? " is-ws" : ""}${
								isWordUnit ? " is-word-unit" : ""
							}`}
						>
							<span className="lyrics-extended-char-bg">{text}</span>
							<span
								className="lyrics-extended-char-fill-clip"
								style={{ width: `${fillProgress * 100}%` }}
							>
								<span className="lyrics-extended-char-fill">{text}</span>
							</span>
						</span>
					);
				})}
			</div>
		</div>
	);
}, (prevProps, nextProps) => {
	if (prevProps.index !== nextProps.index) return false;
	if (prevProps.line !== nextProps.line) return false;
	if (prevProps.isActive !== nextProps.isActive) return false;
	if (prevProps.isPlaying !== nextProps.isPlaying) return false;
	if (prevProps.playingIndex !== nextProps.playingIndex) return false;
	if (prevProps.currentTime !== nextProps.currentTime) return false;
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

