/**
 * 音乐播放器设置标签页模块
 * 
 * 在 Obsidian 的设置页面中显示插件的配置选项
 */

import { App, PluginSettingTab, Setting } from 'obsidian';
import MusicPlayerPlugin from '@/main';
import { MusicPlayerView, VIEW_TYPE_MUSIC_PLAYER } from '@/views/MusicPlayerView';
import { FolderSuggest } from '@/components/shared/FolderSuggest';

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
			.setName('音乐播放器设置')
			.setHeading();
		
		new Setting(containerEl)
			.setName('音乐文件夹')
			.setDesc('指定包含音乐文件的文件夹路径（相对于仓库根目录，留空则扫描整个仓库）。')
			.addText(text => {
				const inputEl = text.inputEl;
				// 创建文件夹建议器，在输入框下方显示文件夹列表
				new FolderSuggest(this.app, inputEl);
				
				text
					.setPlaceholder('输入或选择文件夹路径')
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

		// 创建自动播放设置项
		new Setting(containerEl)
			.setName('打开时自动播放')
			.setDesc('启用后，打开音乐播放器时会自动播放第一首歌曲')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.autoPlayOnOpen ?? false)
				.onChange(async (value) => {
					// 保存用户选择的自动播放设置
					this.plugin.settings.autoPlayOnOpen = value;
					await this.plugin.saveSettings();
				}));

	}
}

