/**
 * 音乐库标签页组件
 * 
 * 负责顶部标签栏的显示和交互。
 */

import React from "react";
import { PlayingIndicator } from "@/components/player/PlayingIndicator";
import "./LibraryPage.css";

/**
 * 标签页 ID 类型
 */
export type TabId = "favorites" | "all" | "playlists" | "artists" | "albums";

/**
 * 标签页定义
 */
export interface TabDefinition {
	id: TabId;
	label: string;
}

/**
 * LibraryTabs 组件的属性接口
 */
export interface LibraryTabsProps {
	/** 当前激活的标签页 */
	activeTab: TabId;
	/** 切换标签页的回调函数 */
	onChangeTab: (tabId: TabId) => void;
	/** 当前播放列表标识（用于高亮显示当前列表） */
	currentList?: string;
	/** 当前正在播放的歌曲路径（用于判断是否显示播放指示器） */
	activePath?: string | null;
}

/**
 * 音乐库标签页组件
 * 
 * 显示标签页切换按钮，支持播放状态指示。
 * 
 * @param props 组件属性
 */
export function LibraryTabs({
	activeTab,
	onChangeTab,
	currentList,
	activePath,
}: LibraryTabsProps) {
	const tabDefs: TabDefinition[] = [
		{ id: "all", label: "全部" },
		{ id: "favorites", label: "收藏" },
		{ id: "playlists", label: "歌单" },
		{ id: "artists", label: "艺术家" },
		{ id: "albums", label: "专辑" },
	];

	// 判断当前标签页是否匹配 currentList
	const isTabMatched = (tabId: TabId): boolean => {
		if (!currentList || !activePath) return false;
		
		if (tabId === "all" && currentList === "all") {
			return true;
		}
		
		if (tabId === "favorites" && currentList === "favorites") {
			return true;
		}
		
		if (tabId === "playlists" && currentList.startsWith("playlist:")) {
			return true;
		}
		
		if (tabId === "artists" && currentList.startsWith("artist:")) {
			return true;
		}
		
		if (tabId === "albums" && currentList.startsWith("album:")) {
			return true;
		}
		
		return false;
	};

	return (
		<div className="toolbar">
			<div className="tabs">
				{tabDefs.map((tab) => {
					const matched = isTabMatched(tab.id);
					
					return (
						<button
							key={tab.id}
							className={`tab-btn ${activeTab === tab.id ? "active" : ""}`}
							onClick={() => onChangeTab(tab.id)}
						>
							{matched ? (
								<span className="tab-playing-indicator">
									<PlayingIndicator />
								</span>
							) : null}
							{tab.label}
						</button>
					);
				})}
			</div>
		</div>
	);
}

