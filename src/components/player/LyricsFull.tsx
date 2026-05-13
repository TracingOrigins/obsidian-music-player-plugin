/**
 * 完整歌词列表组件
 * 
 * 显示完整的歌词列表，支持：
 * - 自动滚动到当前播放的歌词行
 * - 高亮显示当前播放的歌词行
 * - 点击歌词行跳转到对应时间点
 * - 卡拉OK 效果（逐字高亮）
 */

import React from "react";
import "./LyricsFull.css";
import type { LyricLine } from "@/utils/lyrics/parser";
import { LyricsParser } from "@/utils/lyrics/parser";
import { t } from "@/utils/i18n/i18n";

/**
 * 完整歌词列表组件的属性接口
 */
export interface LyricsFullProps {
	/** 完整的歌词列表 */
	fullLyrics: LyricLine[];
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
 * 完整歌词列表组件
 * 
 * 显示完整歌词列表，支持自动滚动、高亮显示和点击跳转。
 * 
 * @param props 组件属性
 */
export function LyricsFull({
	fullLyrics,
	activeIndex,
	playingIndex,
	onToggleMode,
	onSeek,
	scrollRef,
	lineRefs,
}: LyricsFullProps) {
	// 如果没有歌词，显示提示信息
	// 空状态时不处理点击，让父级的 onClick 处理（切换到唱片页）
	if (!fullLyrics || fullLyrics.length === 0) {
		return (
			<div className="lyrics lyrics-empty">
				<span className="lyrics-empty-text">{t("playback.noLyrics")}</span>
			</div>
		);
	}

	return (
		<div
			className="lyrics lyrics-scroll"
			ref={scrollRef}
			style={{
				paddingTop: 0,
				paddingBottom: 0,
			}}
		>
			{fullLyrics.map((line, index) => {
				// 清理所有时间标签（包括卡拉OK标签），只显示纯歌词文本
				const displayText = LyricsParser.cleanText(line.text);
				const isActive = index === activeIndex;
				const isPlaying = index === playingIndex;
				const isPlayed = playingIndex >= 0 && index < playingIndex;
				return (
					<div
						key={index}
						ref={(el) => {
							lineRefs.current[index] = el;
						}}
						className={`lyrics-line ${isActive ? "is-active" : ""} ${isPlaying ? "is-playing" : ""} ${isPlayed ? "is-played" : ""}`}
					>
						<span
							className="lyrics-text"
							onClick={(e) => {
								e.stopPropagation();
								if (Number.isFinite(line.time)) {
									onSeek(line.time);
								}
							}}
						>
							{displayText}
						</span>
					</div>
				);
			})}
		</div>
	);
}

