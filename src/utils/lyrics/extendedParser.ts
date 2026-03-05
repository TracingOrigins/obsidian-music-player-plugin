/**
 * 逐字时间歌词解析器模块
 * 
 * 提供逐字时间歌词解析功能，支持：
 * - 解析包含逐字时间标签的歌词文件（LYRICS_EXTENDED）
 * - 解析格式：<mm:ss.xx>字 或 [mm:ss.xx]字
 * - 用于实现卡拉OK逐字高亮效果
 * 
 * 逐字时间歌词格式示例：
 * [00:12.34]这<00:12.45>是<00:12.56>歌<00:12.67>词
 * 或
 * <00:12.34>这<00:12.45>是<00:12.56>歌<00:12.67>词
 */

/**
 * 逐字歌词字符接口
 * 表示一个字符及其对应的时间点
 */
export interface ExtendedLyricChar {
	/** 字符内容 */
	char: string;
	/** 该字符的时间点（秒） */
	time: number;
}

/**
 * 逐字歌词行接口
 * 表示一行逐字歌词，包含行时间和字符数组
 */
export interface ExtendedLyricLine {
	/** 歌词行的时间点（秒） */
	time: number;
	/** 该行的逐字字符数组 */
	chars: ExtendedLyricChar[];
	/** 该行的纯文本（用于显示） */
	text: string;
}

/**
 * 逐字歌词解析器类
 * 
 * 提供静态方法用于解析逐字时间歌词文本
 */
export class LyricsExtendedParser {
	/**
	 * 解析逐字时间歌词文本
	 * 
	 * 将包含逐字时间标签的歌词文本解析为逐字歌词行数组。
	 * 支持格式：
	 * - [mm:ss.xx]字<mm:ss.xx>字（行时间标签 + 逐字时间标签）
	 * - <mm:ss.xx>字<mm:ss.xx>字（只有逐字时间标签）
	 * 
	 * @param extendedContent 逐字时间歌词文本内容
	 * @returns 返回解析后的逐字歌词行数组，按时间排序
	 * 
	 * @example
	 * ```typescript
	 * const extended = "[00:12.34]这<00:12.45>是<00:12.56>歌<00:12.67>词";
	 * const lines = LyricsExtendedParser.parse(extended);
	 * ```
	 */
	static parse(extendedContent: string): ExtendedLyricLine[] {
		if (!extendedContent || !extendedContent.trim()) {
			return [];
		}

		const lines: ExtendedLyricLine[] = [];
		// 按行分割歌词文本
		const textLines = extendedContent.split(/\r?\n/);

		// 匹配行时间标签的正则表达式：[mm:ss.xx]
		const lineTimeRegex = /\[(\d{2}):(\d{2})\.(\d{2})\]/;
		// 匹配逐字时间标签的正则表达式：<mm:ss.xx> 或 [mm:ss.xx]
		const charTimeRegex = /[<[](\d{2}):(\d{2})\.(\d{2})[>\]]/g;

		textLines.forEach((line) => {
			if (!line.trim()) return;

			// 查找行时间标签
			const lineTimeMatch = line.match(lineTimeRegex);
			let lineTime = 0;
			
			if (lineTimeMatch) {
				// 解析行时间：分钟、秒、百分秒
				const minutesStr = lineTimeMatch[1];
				const secondsStr = lineTimeMatch[2];
				const hundredthsStr = lineTimeMatch[3];
				if (minutesStr && secondsStr && hundredthsStr) {
					const minutes = parseInt(minutesStr);
					const seconds = parseInt(secondsStr);
					const hundredths = parseInt(hundredthsStr);
					lineTime = minutes * 60 + seconds + hundredths / 100;
				}
			}

			// 移除行时间标签，只保留逐字时间标签和文本
			let processedLine = line.replace(lineTimeRegex, "");

			// 解析逐字时间标签
			const chars: ExtendedLyricChar[] = [];
			const matches = [...processedLine.matchAll(charTimeRegex)];
			
			if (matches.length === 0) {
				// 如果没有逐字时间标签，将整行文本作为单个字符组
				const cleanText = processedLine.trim();
				if (cleanText) {
					cleanText.split("").forEach((char) => {
						if (char.trim()) {
							chars.push({ char, time: lineTime });
						}
					});
				}
			} else {
				// 有逐字时间标签，解析每个字符的时间
				let lastIndex = 0;
				let lastTime = lineTime;

				matches.forEach((match, index) => {
					// 解析时间标签中的时间
					const minutesStr = match[1];
					const secondsStr = match[2];
					const hundredthsStr = match[3];
					if (!minutesStr || !secondsStr || !hundredthsStr) {
						return; // 跳过无效的匹配
					}
					const minutes = parseInt(minutesStr);
					const seconds = parseInt(secondsStr);
					const hundredths = parseInt(hundredthsStr);
					const time = minutes * 60 + seconds + hundredths / 100;

					// 获取当前时间标签之前的文本
					const matchIndex = match.index ?? 0;
					const beforeText = processedLine.substring(lastIndex, matchIndex);
					
					// 将文本分割为字符，每个字符都关联上一个时间标签的时间
					beforeText.split("").forEach((char) => {
						if (char.trim()) {
							chars.push({ char, time: lastTime });
						}
					});

					// 更新索引和时间
					const matchLength = match[0]?.length ?? 0;
					lastIndex = matchIndex + matchLength;
					lastTime = time;
				});

				// 处理最后一个时间标签之后的文本
				const remainingText = processedLine.substring(lastIndex);
				remainingText.split("").forEach((char) => {
					if (char.trim()) {
						chars.push({ char, time: lastTime });
					}
				});
			}

			// 如果解析出字符，添加到结果中
			if (chars.length > 0) {
				// 生成纯文本（移除所有时间标签）
				const text = chars.map(c => c.char).join("");
				
				// 如果没有行时间，使用第一个字符的时间作为行时间
				const finalLineTime = lineTime > 0 ? lineTime : (chars[0]?.time || 0);

				lines.push({
					time: finalLineTime,
					chars,
					text,
				});
			}
		});

		// 按时间排序，确保歌词按播放顺序排列
		return lines.sort((a, b) => a.time - b.time);
	}

	/**
	 * 清理逐字歌词文本中的时间标签，返回纯文本
	 * 
	 * @param text 包含时间标签的逐字歌词文本
	 * @returns 返回清理后的纯文本歌词
	 */
	static cleanText(text: string): string {
		return text
			.replace(/\[\d+:\d+\.\d+\]/g, "") // 移除 [mm:ss.xx] 格式的时间标签
			.replace(/\[\d+:\d+\]/g, "") // 移除 [mm:ss] 格式的时间标签
			.replace(/<\d+:\d+\.\d+>/g, "") // 移除 <mm:ss.xx> 格式的时间标签
			.replace(/<\d+:\d+>/g, "") // 移除 <mm:ss> 格式的时间标签
			.trim(); // 去除首尾空白
	}
}

