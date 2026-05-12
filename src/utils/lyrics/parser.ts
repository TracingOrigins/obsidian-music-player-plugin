/**
 * LRC 歌词解析器模块
 * 
 * 提供歌词解析和处理功能，支持：
 * - 解析 LRC 格式的歌词文件
 * - 清理歌词文本中的时间标签
 * - 解析时间标签用于卡拉OK效果
 * 
 * LRC 格式示例：
 * [00:12.34]这是第一句歌词
 * [00:15.67]这是第二句歌词
 */

/**
 * 歌词行接口
 * 
 * 表示一行歌词，包含时间和文本信息
 */
export interface LyricLine {
	/** 歌词行的时间点（秒） */
	time: number;
	/** 歌词文本（可能包含时间标签，用于卡拉OK效果） */
	text: string;
}

/**
 * 歌词解析器类
 * 
 * 提供静态方法用于解析和处理歌词文本
 */
export class LyricsParser {
	/**
	 * 解析 LRC 格式的歌词文件
	 * 
	 * 将 LRC 格式的歌词文本解析为歌词行数组。
	 * 支持标准 LRC 格式： [mm:ss.xx]歌词文本
	 * 
	 * @param lrcContent LRC 格式的歌词文本内容
	 * @returns 返回解析后的歌词行数组，按时间排序
	 * 
	 * @example
	 * ```typescript
	 * const lrc = "[00:12.34]这是第一句歌词\n[00:15.67]这是第二句歌词";
	 * const lines = LyricsParser.parseLRC(lrc);
	 * // lines: [
	 * //   { time: 12.34, text: "这是第一句歌词" },
	 * //   { time: 15.67, text: "这是第二句歌词" }
	 * // ]
	 * ```
	 */
	static parseLRC(lrcContent: string): LyricLine[] {
		// 按行分割歌词文本
		const lines = lrcContent.split("\n");
		// 匹配时间标签的正则表达式：[mm:ss.xx]
		const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2})\]/g;
		const lyrics: LyricLine[] = [];

		// 遍历每一行
		lines.forEach((line) => {
			// 查找所有时间标签
			const matches = [...line.matchAll(timeRegex)];
			if (matches.length > 0) {
				// 如果一行包含多个时间标签，为每个时间标签创建一条歌词行
				matches.forEach((match) => {
					// 解析时间：分钟、秒、百分秒
					const minutesStr = match[1];
					const secondsStr = match[2];
					const hundredthsStr = match[3];
					if (!minutesStr || !secondsStr || !hundredthsStr) {
						return; // 跳过无效的匹配
					}
					const minutes = parseInt(minutesStr);
					const seconds = parseInt(secondsStr);
					const hundredths = parseInt(hundredthsStr);
					// 转换为秒数
					const time = minutes * 60 + seconds + hundredths / 100;

					// 提取歌词文本（移除行首时间标签；不 trim，以保留英文词间空格与行内前导空格）
					const text = line.replace(/\[(\d{2}):(\d{2})\.(\d{2})\]/g, "");
					if (text.trim().length > 0) {
						lyrics.push({
							time: time,
							text: text,
						});
					}
				});
			}
		});

		// 按时间排序，确保歌词按播放顺序排列
		return lyrics.sort((a, b) => a.time - b.time);
	}

	/**
	 * 清理歌词文本中的时间标签，返回纯文本
	 * 
	 * 移除所有格式的时间标签（方括号和尖括号格式），返回干净的歌词文本。
	 * 用于显示歌词时去除时间标签。
	 * 
	 * @param text 包含时间标签的歌词文本
	 * @returns 返回清理后的纯文本歌词
	 * 
	 * @example
	 * ```typescript
	 * const text = "[00:12.34]这是歌词<00:15.67>更多文本";
	 * const clean = LyricsParser.cleanText(text);
	 * // clean: "这是歌词更多文本"
	 * ```
	 */
	static cleanText(text: string): string {
		return text
			.replace(/\[\d+:\d+\.\d+\]/g, "") // 移除 [mm:ss.xx] 格式的时间标签
			.replace(/\[\d+:\d+\]/g, "") // 移除 [mm:ss] 格式的时间标签
			.replace(/\[.*?\]/g, "") // 移除任何其他方括号内的内容
			.replace(/<\d+:\d+\.\d+>/g, "") // 移除 <mm:ss.xx> 格式的时间标签
			.replace(/<\d+:\d+>/g, "") // 移除 <mm:ss> 格式的时间标签
			.replace(/<.*?>/g, "") // 移除任何其他尖括号内的内容
			.trimEnd(); // 仅去掉行尾空白，保留行首空格
	}

	/**
	 * 解析歌词行中的时间标签，用于卡拉OK效果
	 * 
	 * 将包含时间标签的歌词文本解析为字符数组，每个字符都关联一个时间点。
	 * 这样可以实现逐字高亮的卡拉OK效果。
	 * 
	 * @param text 包含时间标签的歌词文本（如 "[00:12.34]这是[00:15.67]歌词"）
	 * @param baseTime 基础时间（秒），如果歌词中没有时间标签，所有字符都使用这个时间
	 * @returns 返回字符数组，每个字符对象包含字符本身和对应的时间点
	 * 
	 * @example
	 * ```typescript
	 * const text = "[00:12.34]这是[00:15.67]歌词";
	 * const chars = LyricsParser.parseTimeTags(text, 12.34);
	 * // chars: [
	 * //   { char: "这", time: 12.34 },
	 * //   { char: "是", time: 12.34 },
	 * //   { char: "歌", time: 15.67 },
	 * //   { char: "词", time: 15.67 }
	 * // ]
	 * ```
	 */
	static parseTimeTags(text: string, baseTime: number): Array<{ char: string; time: number }> {
		// 匹配时间标签的正则表达式（支持方括号和尖括号）
		const timeTagRegex = /[<[]([\d:.]+)[>\]]/g;
		const chars: Array<{ char: string; time: number }> = [];
		let lastIndex = 0; // 上一个时间标签后的索引位置
		let lastTime = baseTime; // 上一个时间标签的时间

		// 查找所有时间标签
		const matches = [...text.matchAll(timeTagRegex)];

		// 如果没有足够的时间标签（少于2个），无法实现逐字效果
		// 直接返回所有字符，都使用基础时间
		if (matches.length < 2) {
			const cleanText = this.cleanText(text);
			cleanText.split("").forEach((char) => {
				chars.push({ char, time: baseTime });
			});
			return chars;
		}

		// 解析每个时间标签之间的文本
		for (let i = 0; i < matches.length; i++) {
			const match = matches[i];
			if (!match) {
				continue; // 跳过无效的匹配
			}
			const timeStr = match[1];
			if (!timeStr) {
				continue; // 跳过无效的匹配
			}
			// 解析时间字符串（格式：mm:ss.xx 或 mm:ss）
			const timeParts = timeStr.split(/[:.]/);
			const minutesPart = timeParts[0];
			const secondsPart = timeParts[1];
			const hundredthsPart = timeParts[2];
			if (!minutesPart || !secondsPart) {
				continue; // 跳过无效的时间格式
			}
			const time = parseInt(minutesPart) * 60 + parseInt(secondsPart) + (hundredthsPart ? parseInt(hundredthsPart) : 0) / 100;

			// 获取当前时间标签之前的文本
			const matchIndex = match.index ?? 0;
			const beforeText = text.substring(lastIndex, matchIndex);
			// 将文本分割为字符，每个字符都关联上一个时间标签的时间
			for (const char of beforeText) {
				chars.push({ char, time: lastTime });
			}

			// 更新索引和时间，为下一段文本做准备
			lastIndex = matchIndex + (match[0]?.length ?? 0);
			lastTime = time;
		}

		// 处理最后一个时间标签之后的文本
		const remainingText = text.substring(lastIndex);
		for (const char of remainingText) {
			chars.push({ char, time: lastTime });
		}

		return chars;
	}
}


