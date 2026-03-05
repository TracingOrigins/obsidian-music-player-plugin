/**
 * 文件夹建议器模块
 * 
 * 提供一个在输入框下方显示文件夹列表的悬浮框，支持搜索和选择文件夹
 */

import { AbstractInputSuggest, App, TFolder } from 'obsidian';

/**
 * 文件夹建议器类
 * 
 * 继承自 Obsidian 的 AbstractInputSuggest，提供文件夹搜索和选择功能
 * 当用户在输入框中输入时，会在下方显示匹配的文件夹列表
 */
export class FolderSuggest extends AbstractInputSuggest<TFolder> {
	private folders: TFolder[] = [];

	/**
	 * 构造函数
	 * @param app Obsidian 应用实例
	 * @param inputEl 输入框元素
	 */
	constructor(
		app: App,
		private inputEl: HTMLInputElement
	) {
		super(app, inputEl);
		this.loadFolders();
	}

	/**
	 * 加载所有文件夹
	 * 从 vault 中获取所有文件夹并存储
	 */
	private loadFolders(): void {
		this.folders = [];
		// 获取所有已加载的文件和文件夹
		this.app.vault.getAllLoadedFiles().forEach(file => {
			if (file instanceof TFolder) {
				this.folders.push(file);
			}
		});
		// 按路径排序
		this.folders.sort((a, b) => a.path.localeCompare(b.path));
	}

	/**
	 * 获取建议列表
	 * 根据用户输入筛选匹配的文件夹
	 * 
	 * @param inputStr 用户输入的字符串
	 * @returns 匹配的文件夹数组
	 */
	getSuggestions(inputStr: string): TFolder[] {
		const lowerInput = inputStr.toLowerCase().trim();
		
		// 如果输入为空，显示所有文件夹（默认展示）
		if (!lowerInput) {
			// 限制最多显示 50 个文件夹，避免列表过长
			return this.folders.slice(0, 50);
		}

		// 筛选包含输入字符串的文件夹路径
		const matches = this.folders.filter(folder => {
			const path = folder.path.toLowerCase();
			// 支持匹配路径的任何部分
			return path.includes(lowerInput);
		});

		// 限制最多显示 50 个建议，避免列表过长
		return matches.slice(0, 50);
	}

	/**
	 * 渲染建议项
	 * 在建议列表中显示文件夹路径
	 * 
	 * @param folder 文件夹对象
	 * @param el 要渲染的 HTML 元素
	 */
	renderSuggestion(folder: TFolder, el: HTMLElement): void {
		el.setText(folder.path);
		// 添加文件夹图标样式（可选）
		el.addClass('folder-suggest-item');
	}

	/**
	 * 选择建议项
	 * 当用户选择某个文件夹时，将其路径填入输入框
	 * 
	 * @param folder 选中的文件夹对象
	 */
	selectSuggestion(folder: TFolder): void {
		// 设置输入框的值（去掉末尾的斜杠，如果有的话）
		const path = folder.path.replace(/\/$/, '');
		this.inputEl.value = path;
		// 触发 input 和 change 事件，确保 onChange 回调被调用
		this.inputEl.dispatchEvent(new Event('input', { bubbles: true }));
		this.inputEl.dispatchEvent(new Event('change', { bubbles: true }));
		// 关闭建议框
		this.close();
	}
}

