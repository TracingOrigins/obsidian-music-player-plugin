/**
 * 资源管理服务
 * 
 * 负责管理插件资源文件的加载和缓存。
 * 资源文件（如图片）会被转换为 base64 数据 URI 格式，方便在 React 组件中使用。
 */

import { App } from "obsidian";
import MusicPlayerPlugin from "@/main";

/**
 * 资源管理服务类
 * 
 * 提供资源文件的加载和缓存功能，将文件转换为 base64 数据 URI。
 * 使用内存缓存避免重复读取文件。
 */
export class AssetService {
	/** 资源文件缓存（文件名 -> base64 数据 URI） */
	private assetCache: Map<string, string> = new Map();

	/**
	 * 创建资源管理服务实例
	 * 
	 * @param app - Obsidian App 实例，用于访问 vault 路径
	 * @param plugin - 插件实例，用于获取插件 ID
	 */
	constructor(
		private app: App,
		private plugin: MusicPlayerPlugin
	) {}

	/**
	 * 获取插件资源文件的 base64 数据 URI
	 * 
	 * 从插件目录读取资源文件，转换为 base64 数据 URI 格式。
	 * 如果文件已缓存，直接返回缓存结果。
	 * 如果文件不存在或读取失败，返回一个透明的 1x1 像素占位图。
	 * 
	 * @param filename - 资源文件名（相对于插件目录）
	 * @returns base64 数据 URI 字符串
	 */
	async getAssetPath(filename: string): Promise<string> {
		if (this.assetCache.has(filename)) return this.assetCache.get(filename)!;
		try {
			const pluginId = this.plugin.manifest.id;
			const vaultPath = (this.app.vault.adapter as any).basePath;
			if (!vaultPath) throw new Error('无法获取 vault 路径');
			const assetPath = `${vaultPath}/.obsidian/plugins/${pluginId}/${filename}`;
			const fs = require('fs');
			const path = require('path');
			if (!fs.existsSync(assetPath)) throw new Error(`资源文件不存在: ${assetPath}`);
			const fileBuffer = fs.readFileSync(assetPath);
			const base64 = fileBuffer.toString('base64');
			const ext = path.extname(filename).toLowerCase();
			const mimeTypes: Record<string, string> = {
				'.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
				'.gif': 'image/gif', '.svg': 'image/svg+xml',
			};
			const mimeType = mimeTypes[ext] || 'image/png';
			const dataUri = `data:${mimeType};base64,${base64}`;
			this.assetCache.set(filename, dataUri);
			return dataUri;
		} catch (error) {
			console.error(`无法加载资源文件 ${filename}:`, error);
			return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
		}
	}
}

