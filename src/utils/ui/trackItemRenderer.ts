/**
 * 播放列表项渲染工具
 * 
 * 提供统一的播放列表项 DOM 创建逻辑，供 QueueModal 和 TrackSearchModal 使用
 */

import { TFile } from "obsidian";
import type { TrackInfo } from "@/types";

/**
 * 创建 SVG 播放占位符图标
 * 
 * @returns 返回 SVG 元素
 */
export function createPlayPlaceholderSVG(): SVGSVGElement {
	const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
	svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
	svg.setAttribute("width", "24");
	svg.setAttribute("height", "24");
	svg.setAttribute("viewBox", "0 0 24 24");
	svg.setAttribute("fill", "none");
	svg.setAttribute("stroke", "currentColor");
	svg.setAttribute("stroke-width", "2");
	
	const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
	circle.setAttribute("cx", "12");
	circle.setAttribute("cy", "12");
	circle.setAttribute("r", "10");
	svg.appendChild(circle);
	
	const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
	polygon.setAttribute("points", "10 8 16 12 10 16 10 8");
	svg.appendChild(polygon);
	
	return svg;
}

/**
 * 创建播放指示器（均衡器动画）
 * 
 * @param container 容器元素
 */
export function createPlayingIndicator(container: HTMLElement): void {
	container.setAttribute("aria-label", "正在播放");
	for (let i = 0; i < 4; i++) {
		const bar = container.createDiv("equalizer-bar");
		bar.style.animationDelay = `${i * 0.1}s`;
	}
}

/**
 * 渲染播放列表项的选项
 */
export interface RenderTrackItemOptions {
	/** 文件对象 */
	file: TFile;
	/** 曲目信息（可选） */
	track?: TrackInfo;
	/** 是否是当前播放的曲目 */
	isActive: boolean;
	/** 封面 URL 缓存 */
	coverCache: Map<string, string>;
	/** Intersection Observer 实例（可选） */
	observer?: IntersectionObserver | null;
}

/**
 * 渲染播放列表项的内容
 * 
 * @param contentEl 内容容器元素
 * @param options 渲染选项
 * @returns 返回封面容器元素，用于后续的 Intersection Observer 观察
 */
export function renderTrackItemContent(
	contentEl: HTMLElement, 
	options: RenderTrackItemOptions
): HTMLElement {
	const { file, track, isActive, coverCache, observer } = options;
	
	// 创建内容容器
	const container = contentEl.createDiv("playlist-item-container");
	
	// 创建封面图片容器（异步加载，但先创建占位容器）
	const coverContainerEl = container.createDiv("playlist-item-cover");
	// 添加 data-track-path 属性，用于 Intersection Observer
	coverContainerEl.setAttribute("data-track-path", file.path);
	// 先显示占位图标（播放图标），然后异步加载封面
	const placeholder = coverContainerEl.createDiv("playlist-item-placeholder");
	placeholder.appendChild(createPlayPlaceholderSVG());
	
	// 如果已经有缓存的封面，直接加载
	if (coverCache.has(file.path)) {
		const coverUrl = coverCache.get(file.path);
		if (coverUrl) {
			coverContainerEl.empty();
			const coverImg = coverContainerEl.createEl("img");
			coverImg.src = coverUrl;
			coverImg.alt = track?.title || file.basename;
		}
	} else {
		// 使用 Intersection Observer 来懒加载封面
		// 只有在可见时才加载封面
		if (observer) {
			observer.observe(coverContainerEl);
		}
	}

	// 创建文本信息容器
	const textContainer = container.createDiv("playlist-item-text");
	
	// 创建并设置曲目标题
	const titleEl = textContainer.createDiv("playlist-item-title");
	const title = track?.title || file.basename;
	// 如果是当前播放的曲目，在标题前添加播放指示器
	if (isActive) {
		titleEl.empty();
		const indicatorContainer = titleEl.createDiv("playing-indicator");
		createPlayingIndicator(indicatorContainer);
		titleEl.createSpan({ text: title });
	} else {
		titleEl.setText(title);
	}
	
	// 创建并设置艺术家和专辑信息
	const metaEl = textContainer.createDiv("playlist-item-meta");
	const artist = track?.artist || "";
	const album = track?.album || "";
	
	// 根据是否有艺术家和专辑信息，显示不同的格式
	if (artist && album) {
		// 两者都有：显示 "艺术家 • 专辑"
		metaEl.setText(`${artist} • ${album}`);
	} else if (artist) {
		// 只有艺术家：只显示艺术家
		metaEl.setText(artist);
	} else if (album) {
		// 只有专辑：只显示专辑
		metaEl.setText(album);
	}
	
	return coverContainerEl;
}

