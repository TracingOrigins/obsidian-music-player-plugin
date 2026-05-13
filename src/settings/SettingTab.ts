/**
 * 音乐播放器设置标签页模块
 * 
 * 在 Obsidian 的设置页面中显示插件的配置选项
 */

import { App, PluginSettingTab, Setting } from 'obsidian';
import MusicPlayerPlugin from '@/main';
import { t } from '@/utils/i18n/i18n';
import { MusicPlayerView, VIEW_TYPE_MUSIC_PLAYER } from '@/views/MusicPlayerView';
import { FolderSuggest } from '@/components/shared/FolderSuggest';
import { getTrackSongDisplayName, TrackSuggest } from '@/components/shared/TrackSuggest';
import { sortTracksByTrack } from '@/utils/data/sort';
import { scanVaultAudioFiles } from '@/utils/library/scanVaultAudio';

/**
 * 音乐播放器设置标签页类
 * 在 Obsidian 的设置页面中显示插件的配置选项
 */
export class MusicPlayerSettingTab extends PluginSettingTab {
	/** 插件实例引用 */
	plugin: MusicPlayerPlugin;
	/** 
	 * 设置标签页图标
	 * 用于在 Obsidian 设置页面左侧边栏的插件列表中显示图标标识
	 * "music" 是 Obsidian 内置的 Lucide 图标名称，表示音乐相关的图标
	 * 该图标会显示在设置页面的插件列表项旁边，帮助用户快速识别插件
	 */
	icon: string = "music";

	/**
	 * 构造函数
	 * @param app Obsidian 应用实例
	 * @param plugin 插件实例
	 */
	constructor(app: App, plugin: MusicPlayerPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	/**
	 * 显示设置界面
	 * 在用户打开设置页面时调用，创建并显示所有设置项
	 */
	display(): void {
		const { containerEl } = this;

		// 清空容器，准备重新渲染
		containerEl.empty();

		// 创建音乐文件夹设置项（使用 setHeading 创建标题）
		new Setting(containerEl)
			.setName(t('settings.heading'))
			.setHeading();
		
		new Setting(containerEl)
			.setName(t('settings.musicFolder.name'))
			.setDesc(t('settings.musicFolder.desc'))
			.addText(text => {
				const inputEl = text.inputEl;
				// 创建文件夹建议器，在输入框下方显示文件夹列表
				new FolderSuggest(this.app, inputEl);
				
				text
					.setPlaceholder(t('settings.musicFolder.placeholder'))
					.setValue(this.plugin.settings.musicFolder)
					.onChange(async (value) => {
						// 保存用户输入的音乐文件夹路径
						this.plugin.settings.musicFolder = value;
						await this.plugin.saveSettings();
						// 通知已打开的播放器视图刷新音乐列表
						const view = this.app.workspace.getLeavesOfType(VIEW_TYPE_MUSIC_PLAYER)[0]?.view as MusicPlayerView;
						if (view) {
							void view.refreshMusicList();
						}
					});
			});

		// 创建自动播放开关；曲目选择在其下方的独立区域
		new Setting(containerEl)
			.setName(t('settings.autoPlay.name'))
			.setDesc(t('settings.autoPlay.desc'))
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.autoPlayOnOpen ?? false)
				.onChange(async (value) => {
					this.plugin.settings.autoPlayOnOpen = value;
					await this.plugin.saveSettings();
					syncAutoPlayTrackVisibility();
				}));

		const autoPlayTrackWrap = containerEl.createDiv();
		const syncAutoPlayTrackVisibility = () => {
			autoPlayTrackWrap.style.display = this.plugin.settings.autoPlayOnOpen ? 'block' : 'none';
		};
		syncAutoPlayTrackVisibility();

		const sortedTracks = sortTracksByTrack(
			scanVaultAudioFiles(this.app, this.plugin.settings.musicFolder ?? ''),
			this.plugin.settings
		);

		const pathSet = new Set(sortedTracks.map((f) => f.path));
		let storedPath = (this.plugin.settings.autoPlayOpenTrackPath ?? '').trim();
		if (storedPath && !pathSet.has(storedPath)) {
			storedPath = '';
			this.plugin.settings.autoPlayOpenTrackPath = '';
			void this.plugin.saveSettings();
		}

		const fileForStoredPath = storedPath
			? sortedTracks.find((f) => f.path === storedPath)
			: undefined;
		const inputDisplayValue = fileForStoredPath
			? getTrackSongDisplayName(fileForStoredPath, this.plugin.settings)
			: '';

		const resolvePathFromInput = (trim: string): string => {
			if (!trim) {
				return '';
			}
			if (pathSet.has(trim)) {
				return trim;
			}
			const byDisplay = sortedTracks.filter(
				(f) => getTrackSongDisplayName(f, this.plugin.settings) === trim
			);
			if (byDisplay.length > 0 && byDisplay[0]) {
				return byDisplay[0].path;
			}
			return this.plugin.settings.autoPlayOpenTrackPath;
		};

		new Setting(autoPlayTrackWrap)
			.setName(t('settings.autoPlayTrack.name'))
			.setDesc(t('settings.autoPlayTrack.desc'))
			.addText((text) => {
				const inputEl = text.inputEl;
				new TrackSuggest(this.app, inputEl, this.plugin, sortedTracks);

				text
					.setPlaceholder(t('settings.autoPlayTrack.placeholder'))
					.setValue(inputDisplayValue)
					.onChange(async (value) => {
						const trim = value.trim();
						const nextPath = resolvePathFromInput(trim);
						if (nextPath !== this.plugin.settings.autoPlayOpenTrackPath) {
							this.plugin.settings.autoPlayOpenTrackPath = nextPath;
							await this.plugin.saveSettings();
						}
					});
			});

	}
}

