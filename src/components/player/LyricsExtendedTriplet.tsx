/**
 * 逐字时间歌词三行组件
 * 
 * 显示逐字时间歌词的三行（上一行、当前行、下一行），支持逐字高亮的卡拉OK效果。
 * 当前行会逐字高亮显示，非当前行显示完整文字。
 */

import React from "react";
import "./LyricsExtendedTriplet.css";
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
 * 逐字时间歌词三行组件的属性接口
 */
export interface LyricsExtendedTripletProps {
	/** 上一行逐字歌词 */
	prev?: ExtendedLyricLine;
	/** 当前行逐字歌词 */
	current?: ExtendedLyricLine;
	/** 下一行逐字歌词 */
	next?: ExtendedLyricLine;
	/** 当前播放时间（秒），用于计算逐字高亮进度 */
	currentTime: number;
}

/**
 * 单行歌词组件的属性接口（内部使用）
 */
interface LineComponentProps {
	line?: ExtendedLyricLine;
	currentTime: number;
	isCurrent: boolean;
}

const LineComponent = React.memo(({ line, currentTime, isCurrent }: LineComponentProps) => {
	if (!line) {
		return <span className="lyric-text"></span>;
	}

	// 预计算字符的结束时间和文本
	const charsData = React.useMemo(() => {
		return line.chars.map((charData, charIndex) => {
			const nextChar = line.chars[charIndex + 1];
			const charEndTime = nextChar ? nextChar.time : (charData.time + 0.1);
			return { char: charData.char, charTime: charData.time, charEndTime };
		});
	}, [line.chars]);

	// 对于非当前行，显示完整文字（不需要逐字效果）
	if (!isCurrent) {
		return (
			<span className="lyrics-extended-triplet-text">
				{line.text}
			</span>
		);
	}

	// 当前行需要逐字显示效果
	return (
		<div className="lyrics-extended-triplet-text">
			{charsData.map(({ char, charTime, charEndTime }, charIndex) => {
				const fillProgress = calculateCharProgress(currentTime, charTime, charEndTime);

				return (
					<span key={charIndex} className="lyrics-extended-triplet-char">
						<span className="lyrics-extended-triplet-char-bg">{char}</span>
						<span 
							className="lyrics-extended-triplet-char-fill"
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
	);
}, (prevProps, nextProps) => {
	// 优化：只在关键属性变化时重新渲染
	if (prevProps.line !== nextProps.line) return false;
	if (prevProps.isCurrent !== nextProps.isCurrent) return false;
	// 对于当前行，currentTime 的变化需要重新渲染
	if (prevProps.isCurrent && prevProps.currentTime !== nextProps.currentTime) return false;
	return true;
});

LineComponent.displayName = 'LineComponent';

/**
 * 逐字时间歌词三行组件
 * 
 * 显示三行逐字时间歌词，当前行支持逐字高亮的卡拉OK效果。
 * 
 * @param props 组件属性
 */
export function LyricsExtendedTriplet({ 
	prev, 
	current, 
	next, 
	currentTime 
}: LyricsExtendedTripletProps) {
	return (
		<div className="lyrics-triplet">
			<div className="lyric-line-prev">
				<LineComponent line={prev} currentTime={currentTime} isCurrent={false} />
			</div>
			<div className="lyric-line-current">
				<LineComponent line={current} currentTime={currentTime} isCurrent={true} />
			</div>
			<div className="lyric-line-next">
				<LineComponent line={next} currentTime={currentTime} isCurrent={false} />
			</div>
		</div>
	);
}

