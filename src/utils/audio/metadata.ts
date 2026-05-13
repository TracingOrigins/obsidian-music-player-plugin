/**
 * 音频元数据提取模块
 * 
 * 从音频文件的二进制数据中提取嵌入的元数据信息，包括：
 * - 封面图片
 * - 歌词文本（与 music-metadata 一致：优先 **common.lyrics**，否则从原生标签中宽泛匹配 USLT/SYLT/LYRICS 等）
 * - 歌曲基本信息（标题、艺术家、专辑等）
 * - 音轨号和时长等
 * 
 * 注意：歌词从音频内嵌标签读取；优先使用库解析后的 common.lyrics，与最初实现一致。
 */

// 为移动端提供 Buffer polyfill
// music-metadata-browser 库内部使用了 Buffer，需要在全局作用域中提供
import { initBufferPolyfill } from "../polyfills/buffer";
initBufferPolyfill();

import { App, TFile } from "obsidian";
import { IAudioMetadata, parseBuffer } from "music-metadata-browser";
import { isSupportedAudioExtension } from "@/constants/audio";

/**
 * 从原生标签中提取文本值的辅助函数
 * 
 * 遍历所有格式的原生标签，查找匹配的标签并提取文本值。
 * 支持多种值格式：字符串、对象的 text 属性（字符串或数组）。
 * 
 * @param native 原生标签对象
 * @param idMatcher 标签 ID 匹配函数，返回 true 表示匹配
 * @param descriptionMatcher 可选的描述匹配函数，用于额外匹配
 * @returns 提取的文本值，如果未找到则返回 undefined
 */
function extractTextFromNativeTags(
	native: IAudioMetadata["native"] | undefined,
	idMatcher: (id: string, upperId: string) => boolean,
	descriptionMatcher?: (description: string) => boolean
): string | undefined {
	if (!native) return undefined;

	const descriptionFromUnknown = (v: unknown): string => {
		if (typeof v !== "object" || v === null || !("description" in v)) return "";
		const d = (v as { description?: unknown }).description;
		return typeof d === "string" ? d : "";
	};

	// 遍历所有格式（ID3v2、Vorbis、APEv2 等）
	for (const format of Object.keys(native)) {
		const nativeTags = native[format] || [];
		// 遍历该格式的所有标签
		for (const tag of nativeTags) {
			const id = String(tag.id || "");
			const upperId = id.toUpperCase();
			const value: unknown = tag.value as unknown;

			// 检查是否匹配
			const isMatched = idMatcher(id, upperId);
			if (!isMatched && descriptionMatcher) {
				const desc = descriptionFromUnknown(value);
				if (!descriptionMatcher(desc)) continue;
			}

			// 尝试从不同格式的标签值中提取文本
			// 格式1：直接是字符串
			if (typeof value === "string" && isMatched) {
				return value;
			}
			// 格式1b：字符串数组（部分 Vorbis / APE 标签）
			else if (
				Array.isArray(value) &&
				isMatched &&
				value.length > 0 &&
				value.every((item: unknown) => typeof item === "string")
			) {
				return value.join("\n");
			}
			// 格式2：对象中包含 text 属性（字符串）
			else if (
				value !== null &&
				typeof value === "object" &&
				typeof (value as { text?: unknown }).text === "string" &&
				(isMatched ||
					(descriptionMatcher && descriptionMatcher(descriptionFromUnknown(value))))
			) {
				return (value as { text: string }).text;
			}
			// 格式3：对象中包含 text 属性（数组）
			else if (value !== null && typeof value === "object") {
				const textProp = (value as { text?: unknown }).text;
				if (
					Array.isArray(textProp) &&
					textProp.length > 0 &&
					textProp.every((item): item is string => typeof item === "string") &&
					(isMatched ||
						(descriptionMatcher && descriptionMatcher(descriptionFromUnknown(value))))
				) {
					return textProp.join("\n");
				}
			}
		}
	}

	return undefined;
}

/**
 * 提取内嵌歌词（与 music-metadata 最初推荐用法一致）：
 * 1. `common.lyrics`（库已归并多来源，含 M4A、部分 MP3）
 * 2. 原生标签：id 含 lyrics、或 USLT / SYLT；TXXX 等配合 description 含 lyrics
 * 3. 再遍历原生标签，读取 USLT 的 `value.text`
 */
function extractLyricsFromMetadata(metadata: IAudioMetadata): string | undefined {
	const common = metadata.common.lyrics;
	if (common && Array.isArray(common) && common.length > 0) {
		const joined = common.join("\n");
		if (joined.trim()) return joined;
	}

	const extractedLyrics = extractTextFromNativeTags(
		metadata.native,
		(id, upperId) => {
			const isLyricsId = /lyrics/i.test(id);
			const isStandardLyrics = upperId === "USLT" || upperId === "SYLT";
			return isLyricsId || isStandardLyrics;
		},
		(desc) => /lyrics/i.test(desc)
	);
	if (extractedLyrics?.trim()) {
		return extractedLyrics;
	}

	const native = metadata.native;
	if (native) {
		for (const format of Object.keys(native)) {
			const nativeTags = native[format] || [];
			for (const tag of nativeTags) {
				const id = String(tag.id || "").toUpperCase();
				const value: unknown = tag.value;
				if (id === "USLT" && value && typeof (value as { text?: string }).text === "string") {
					const t = (value as { text: string }).text;
					if (t.trim()) return t;
				}
			}
		}
	}

	return undefined;
}

/**
 * 嵌入的音频元数据接口
 * 表示从音频文件中提取出的所有元数据信息
 */
export interface EmbeddedAudioMetadata {
	/** 封面图片的 base64 Data URL（如 data:image/jpeg;base64,...） */
	coverDataUrl?: string;
	/** 歌词文本内容 */
	lyricsText?: string;
	/** 歌曲标题 */
	title?: string;
	/** 艺术家名称 */
	artist?: string;
	/** 专辑名称 */
	album?: string;
	/** 专辑艺术家（可能不同于艺术家） */
	albumArtist?: string;
	/** 发行年份 */
	year?: number;
	/** 音乐流派（可以是字符串或字符串数组） */
	genre?: string | string[];
	/** 音轨号（专辑中的第几首） */
	track?: number;
	/** 歌曲时长（秒） */
	duration?: number;
}

/**
 * 读取音频文件的二进制数据（兼容移动端）
 * 
 * 使用 adapter.readBinary 作为首选方法（移动端兼容），
 * 如果失败则使用 vault.readBinary 作为后备。
 * 
 * @param app Obsidian 应用实例
 * @param file 音频文件
 * @returns 音频文件的二进制数据（ArrayBuffer），如果读取失败则返回 null
 */
export async function readAudioFileBinary(
	app: App,
	file: TFile
): Promise<ArrayBuffer | null> {
	try {
		// 使用 adapter.readBinary 以确保移动端兼容性
		// 在移动端，vault.readBinary 可能不工作，需要使用 adapter.readBinary
		let binary: ArrayBuffer;
		try {
			binary = await app.vault.adapter.readBinary(file.path);
		} catch (adapterError) {
			// 如果 adapter.readBinary 失败，尝试使用 vault.readBinary 作为后备
			console.warn(`使用 adapter.readBinary 读取失败，尝试使用 vault.readBinary (${file.path}):`, adapterError);
			try {
				binary = await app.vault.readBinary(file);
			} catch (vaultError) {
				console.error(`无法读取文件 ${file.path}:`, vaultError);
				return null;
			}
		}
		
		// 确保 binary 是 ArrayBuffer
		if (!(binary instanceof ArrayBuffer)) {
			console.error(`文件 ${file.path} 读取结果不是 ArrayBuffer:`, typeof binary);
			return null;
		}
		
		return binary;
	} catch (error) {
		console.error(`读取音频文件时出错 (${file.path}):`, error);
		return null;
	}
}

/**
 * 从音频文件的二进制缓冲区中提取嵌入的元数据
 * 
 * 使用 music-metadata-browser 库解析音频文件，提取：
 * 1. 封面图片：转换为 Blob URL
 * 2. 歌词：优先 **common.lyrics**，否则从原生标签匹配（与 music-metadata 最初用法一致）
 * 3. 基本信息：标题、艺术家、专辑、年份、流派、音轨号、时长等
 * 
 * @param buffer 音频文件的二进制数据（ArrayBuffer）
 * @returns 返回提取的元数据对象，如果解析失败则返回 null
 * 
 * @example
 * ```typescript
 * const binary = await vault.readBinary(file);
 * const metadata = await getEmbeddedAudioMetadataFromBuffer(binary);
 * if (metadata) {
 *   console.log(metadata.title, metadata.artist);
 * }
 * ```
 */
export async function getEmbeddedAudioMetadataFromBuffer(
	buffer: ArrayBuffer,
): Promise<EmbeddedAudioMetadata | null> {
	try {
		// 验证 buffer 类型
		if (!(buffer instanceof ArrayBuffer)) {
			console.error("getEmbeddedAudioMetadataFromBuffer: buffer 不是 ArrayBuffer", typeof buffer);
			return null;
		}
		
		// 检查 buffer 大小
		if (buffer.byteLength === 0) {
			console.error("getEmbeddedAudioMetadataFromBuffer: buffer 为空");
			return null;
		}
		
		// 将 ArrayBuffer 转换为 Uint8Array
		// 使用 Uint8Array 而不是 Node.js 的 Buffer，以支持浏览器和移动端环境
		const uint8Array = new Uint8Array(buffer);
		
		// 解析音频元数据，启用时长计算
		// 在移动端，可能需要限制解析的数据量以避免内存问题
		const metadata: IAudioMetadata = await parseBuffer(uint8Array, "audio", {
			duration: true,
		});

		const result: EmbeddedAudioMetadata = {};

		// 提取封面图片
		// 封面图片通常存储在 metadata.common.picture 数组中
		const picture = metadata.common.picture && metadata.common.picture[0];
		if (picture && picture.data) {
			// 将图片数据转换为 Uint8Array（兼容浏览器环境）
			const pictureData = new Uint8Array(picture.data);

			// 使用 Buffer（已在顶部做过 polyfill）将二进制数据转成 base64
			// 注意：这里生成的是可持久化存储在 data.json 中的 base64 Data URL
			const base64 = Buffer.from(pictureData).toString("base64");
			const mimeType = picture.format || "image/jpeg";
			result.coverDataUrl = `data:${mimeType};base64,${base64}`;
		}

		// 歌词：common.lyrics → 原生宽泛匹配 → USLT 兜底（与最初实现一致）
		const lyricsText = extractLyricsFromMetadata(metadata);
		if (lyricsText?.trim()) {
			result.lyricsText = lyricsText;
		}

		// 提取基本元数据信息
		// 歌曲标题：优先从 common.title 获取，如果不存在则尝试从原生标签中查找
		if (metadata.common.title) {
			result.title = metadata.common.title;
		} else {
			const extractedTitle = extractTextFromNativeTags(
				metadata.native,
				(id) => {
					// 检查是否是标题相关的标签
					const upperId = id.toUpperCase();
					return /^(TIT2|TITLE|TITLE_MAIN|TITLE_MAIN_MAIN|TITLE_ORIGINAL)$/i.test(upperId);
				}
			);
			if (extractedTitle) {
				result.title = extractedTitle.trim();
			}
		}

		// 歌曲时长（秒）
		if (metadata.format?.duration) {
			result.duration = metadata.format.duration;
		}
		
		// 艺术家名称（可能是数组，需要合并）
		// 优先从 common.artist 获取，如果不存在则尝试从原生标签中查找
		if (metadata.common.artist) {
			result.artist = Array.isArray(metadata.common.artist)
				? metadata.common.artist.join(", ")
				: metadata.common.artist;
		} else {
			const extractedArtist = extractTextFromNativeTags(
				metadata.native,
				(id) => {
					// 检查是否是艺术家相关的标签
					const upperId = id.toUpperCase();
					return /^(TPE1|ARTIST|ARTIST_MAIN|ARTIST_ORIGINAL)$/i.test(upperId);
				}
			);
			if (extractedArtist) {
				result.artist = extractedArtist.trim();
			}
		}
		
		// 专辑名称
		if (metadata.common.album) {
			result.album = metadata.common.album;
		}
		
		// 专辑艺术家（可能是数组，需要合并）
		if (metadata.common.albumartist) {
			result.albumArtist = Array.isArray(metadata.common.albumartist)
				? metadata.common.albumartist.join(", ")
				: metadata.common.albumartist;
		}
		
		// 发行年份
		if (metadata.common.year) {
			result.year = metadata.common.year;
		}
		
		// 音乐流派（可能是数组，需要合并）
		if (metadata.common.genre) {
			result.genre = Array.isArray(metadata.common.genre)
				? metadata.common.genre.join(", ")
				: metadata.common.genre;
		}
		
		// 音轨号（可能是对象 {no: 1, of: 10} 或直接是数字）
		if (metadata.common.track) {
			result.track = typeof metadata.common.track === "object"
				? metadata.common.track.no || undefined
				: metadata.common.track;
		}

		return result;
	} catch (e) {
		// 如果解析失败，记录详细错误信息以便调试（特别是在移动端）
		const errorMessage = e instanceof Error ? e.message : String(e);
		const errorDetails: Record<string, unknown> = {
			error: errorMessage,
			bufferSize: buffer?.byteLength ?? 0,
			bufferType: buffer ? (buffer instanceof ArrayBuffer ? 'ArrayBuffer' : typeof buffer) : 'null/undefined'
		};
		
		// 只在开发环境或非移动端记录堆栈信息（移动端可能不支持）
		if (e instanceof Error && e.stack) {
			try {
				errorDetails.stack = e.stack;
			} catch {
				// 忽略堆栈信息获取失败
			}
		}
		
		console.error("Failed to parse embedded audio metadata:", errorDetails);
		return null;
	}
}

/**
 * 从音频文件中提取内嵌封面
 * 
 * 读取音频文件的二进制数据，提取内嵌封面并返回 base64 Data URL。
 * 这是一个便捷函数，封装了文件读取和封面提取的完整流程。
 * 
 * @param app Obsidian 应用实例
 * @param file 音频文件
 * @returns 封面图片的 base64 Data URL，如果未找到则返回 undefined
 * 
 * @example
 * ```typescript
 * const coverUrl = await getEmbeddedCoverFromFile(app, file);
 * if (coverUrl) {
 *   console.log('封面:', coverUrl);
 * }
 * ```
 */
export async function getEmbeddedCoverFromFile(
	app: App,
	file: TFile
): Promise<string | undefined> {
	try {
		// 检查是否为支持的音频格式
		const ext = file.extension?.toLowerCase() || '';
		if (!isSupportedAudioExtension(ext)) {
			return undefined;
		}

		// 读取音频文件的二进制数据（兼容移动端）
		const buffer = await readAudioFileBinary(app, file);
		if (!buffer) {
			return undefined;
		}
		
		// 提取元数据（包括内嵌封面）
		const metadata = await getEmbeddedAudioMetadataFromBuffer(buffer);
		
		// 如果存在内嵌封面，返回 base64 Data URL
		return metadata?.coverDataUrl;
	} catch (error) {
		console.error(`获取内嵌封面时出错 (${file.path}):`, error);
		return undefined;
	}
}

