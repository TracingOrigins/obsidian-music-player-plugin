/**
 * 曲目建议器：在输入框下方按路径 / 标题 / 艺术家 / 专辑 过滤歌曲，供设置页等使用。
 */

import { AbstractInputSuggest, App, TFile } from "obsidian";
import type { MusicPlayerSettings } from "@/types";
import { getOrCreateTrackId } from "@/utils/track/id";
import "./TrackSuggest.css";

/** 提供 {@link MusicPlayerSettings}（与插件实例上的 `settings` 一致） */
export interface TrackSuggestSettingsHost {
	readonly settings: MusicPlayerSettings;
}

const MAX_SUGGESTIONS = 50;

/**
 * 用于展示与搜索的「歌曲名」：优先元数据标题，否则为文件名（不含路径）。
 */
export function getTrackSongDisplayName(file: TFile, settings: MusicPlayerSettings): string {
	const trackId = getOrCreateTrackId(file.path, settings);
	const meta = settings.tracks[trackId];
	const title = (meta?.title ?? "").trim();
	return title || file.basename;
}

/**
 * 与 {@link FolderSuggest} 类似，基于 {@link AbstractInputSuggest} 的曲目搜索选择。
 */
export class TrackSuggest extends AbstractInputSuggest<TFile> {
	constructor(
		app: App,
		private inputEl: HTMLInputElement,
		private host: TrackSuggestSettingsHost,
		private tracks: TFile[]
	) {
		super(app, inputEl);
	}

	private haystack(file: TFile): string {
		const trackId = getOrCreateTrackId(file.path, this.host.settings);
		const meta = this.host.settings.tracks[trackId];
		const parts = [
			file.path,
			file.basename,
			(meta?.title ?? "").trim(),
			(meta?.artist ?? "").trim(),
			(meta?.album ?? "").trim(),
		];
		return parts.join("\n").toLowerCase();
	}

	getSuggestions(query: string): TFile[] {
		const q = query.toLowerCase().trim();
		if (!q) {
			return this.tracks.slice(0, MAX_SUGGESTIONS);
		}
		return this.tracks
			.filter((f) => this.haystack(f).includes(q))
			.slice(0, MAX_SUGGESTIONS);
	}

	renderSuggestion(file: TFile, el: HTMLElement): void {
		el.empty();
		el.createDiv({ text: getTrackSongDisplayName(file, this.host.settings) });
		el.createDiv({ cls: "music-player-track-suggest-path", text: file.path });
	}

	selectSuggestion(file: TFile): void {
		this.inputEl.value = getTrackSongDisplayName(file, this.host.settings);
		this.inputEl.dispatchEvent(new Event("input", { bubbles: true }));
		this.inputEl.dispatchEvent(new Event("change", { bubbles: true }));
		this.close();
	}
}
