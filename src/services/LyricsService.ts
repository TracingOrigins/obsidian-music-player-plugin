/**
 * 歌词管理服务
 * 
 * 负责管理歌词相关的业务逻辑，包括：
 * - 加载歌词（从插件设置中读取）
 * - 解析歌词（LRC 格式和逐字歌词）
 * - 处理歌词格式转换
 * 
 * 歌词数据存储在插件的设置中，每个曲目可以有两种歌词：
 * - lyrics: 普通 LRC 格式歌词
 * - lyricsExtended: 逐字时间戳歌词（Karaoke 风格）
 */

import { LyricLine, LyricsParser } from "@/utils/lyrics/parser";
import { ExtendedLyricLine, LyricsExtendedParser } from "@/utils/lyrics/extendedParser";
import MusicPlayerPlugin from "@/main";
import { getOrCreateTrackId } from "@/utils/track/id";

/**
 * 歌词管理服务类
 * 
 * 提供歌词的加载和解析功能，支持 LRC 格式和逐字歌词格式。
 */
export class LyricsService {
	/**
	 * 创建歌词管理服务实例
	 * 
	 * @param plugin - 插件实例，用于访问设置中的歌词数据
	 */
	constructor(private plugin: MusicPlayerPlugin) {}

	/**
	 * 加载歌词
	 * 
	 * 从插件设置中获取曲目的歌词文本，解析为歌词行数组。
	 * 优先加载逐字歌词，如果没有逐字歌词则加载普通歌词。
	 * 
	 * @param trackPath - 音乐文件路径
	 * @returns 包含普通歌词和逐字歌词的对象
	 */
	loadLyrics(trackPath: string): {
		lyrics: LyricLine[];
		extendedLyrics: ExtendedLyricLine[];
	} {
		// 通过路径获取 ID，然后通过 ID 获取 track 信息
		const trackId = getOrCreateTrackId(trackPath, this.plugin.settings);
		const track = this.plugin.settings.tracks[trackId];
		const lyrics: LyricLine[] = [];
		const extendedLyrics: ExtendedLyricLine[] = [];

		// 优先加载逐字时间歌词
		if (track?.lyricsExtended) {
			extendedLyrics.push(...LyricsExtendedParser.parse(track.lyricsExtended));
		}

		// 如果没有逐字歌词，加载普通歌词
		if (extendedLyrics.length === 0 && track?.lyrics) {
			// 尝试使用 parseLRC 解析 LRC 格式歌词
			const parsedLyrics = LyricsParser.parseLRC(track.lyrics);

			if (parsedLyrics.length > 0) {
				// 如果成功解析出带时间的歌词行，使用解析结果
				lyrics.push(
					...parsedLyrics.map((line) => ({
						time: line.time,
						text: LyricsParser.cleanText(line.text),
					}))
				);
			} else {
				// 如果不是 LRC 格式，按行分割并分配默认时间间隔
				const lines = track.lyrics.split(/\r?\n/).filter((l) => l.trim().length > 0);
				lyrics.push(
					...lines.map((line, index) => ({
						time: index * 3, // 默认每行间隔 3 秒
						text: LyricsParser.cleanText(line), // 清理可能存在的标签
					}))
				);
			}
		}

		return { lyrics, extendedLyrics };
	}
}

