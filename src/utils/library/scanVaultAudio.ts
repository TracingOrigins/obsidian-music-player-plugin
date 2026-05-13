/**
 * 从仓库扫描音频文件（不依赖插件主类），供 LibraryService 与设置页等复用。
 */

import type { App, TFile } from "obsidian";
import { SUPPORTED_AUDIO_FORMATS } from "@/constants";

const SUPPORTED_AUDIO_EXT = new Set<string>(SUPPORTED_AUDIO_FORMATS);

/**
 * 按音乐文件夹设置过滤后返回支持的音频文件列表（未排序）。
 */
export function scanVaultAudioFiles(app: App, musicFolder: string): TFile[] {
	const files = app.vault.getFiles().filter((f) =>
		SUPPORTED_AUDIO_EXT.has(`.${f.extension.toLowerCase()}`)
	);

	if (musicFolder) {
		const folder = musicFolder.replace(/\/$/, "");
		return files.filter((f) => f.path.startsWith(`${folder}/`) || f.path === folder);
	}

	return files;
}
