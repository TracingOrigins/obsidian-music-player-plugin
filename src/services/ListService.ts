/**
 * 列表管理服务
 * 
 * 负责管理播放列表相关的业务逻辑，包括：
 * - 获取当前播放列表
 * - 格式化列表标识
 * - 解析列表标识
 * - 根据 sectionId 设置当前列表
 */

import { TFile } from "obsidian";
import { LibraryService, PlaylistService } from "./index";
import { formatCurrentList as formatCurrentListUtil, parseCurrentList as parseCurrentListUtil } from "@/utils/list/formatter";
import { sortTracksByTrack } from "@/utils/data/sort";
import { getOrCreateTrackId } from "@/utils/track/id";

/**
 * 当前列表接口
 * 
 * 定义当前播放列表的结构
 */
export interface CurrentList {
	/** 列表类型（"all", "favorites", "playlist", "artist", "album"） */
	type: string;
	/** 列表名称 */
	name: string;
	/** 列表中的曲目数组 */
	tracks: TFile[];
}

/**
 * 列表管理服务类
 * 
 * 负责管理播放列表相关的业务逻辑，提供列表的获取、格式化、解析等功能。
 */
export class ListService {
	/**
	 * 创建列表管理服务实例
	 * 
	 * @param libraryService - 库服务，用于获取艺术家、专辑等分类数据
	 * @param playlistService - 播放列表服务，用于获取播放列表数据
	 * @param plugin - 插件实例，用于访问设置数据
	 */
	constructor(
		private libraryService: LibraryService,
		private playlistService: PlaylistService,
		private plugin: any
	) {}

	/**
	 * 根据当前正在播放的歌曲，推断"当前播放列表"
	 * 
	 * 推断逻辑（按优先级）：
	 * 1. 如果存在用户点击的分类（currentList），直接使用
	 * 2. 如果当前曲目在播放列表中，返回该播放列表
	 * 3. 如果当前曲目在收藏列表中，返回收藏列表
	 * 4. 否则返回全部歌曲列表
	 * 
	 * @param currentTrack - 当前播放的曲目
	 * @param currentList - 当前列表上下文
	 * @param trackList - 所有曲目列表
	 * @param favorites - 收藏列表
	 * @returns 包含列表和标题的对象
	 */
	getCurrentPlaylistForTrack(
		currentTrack: TFile | null,
		currentList: CurrentList | null,
		trackList: TFile[],
		favorites: TFile[]
	): { list: TFile[]; title: string } {
		let list: TFile[] = trackList;
		let title = "全部";

		// 1. 优先使用用户点击的分类
		if (currentList && currentList.tracks.length > 0) {
			list = currentList.tracks;
			if (currentList.type === "favorites") {
				title = "收藏";
			} else if (currentList.type === "playlist") {
				title = `歌单-${currentList.name}`;
			} else if (currentList.type === "album") {
				title = `专辑-${currentList.name}`;
			} else if (currentList.type === "artist") {
				title = `艺术家-${currentList.name}`;
			}
			return { list, title };
		}

		// 2. 如果没有分类，按成员关系自动判断
		if (!currentTrack) {
			return { list, title };
		}

		// 从 plugin.settings 直接读取最新数据
		const path = currentTrack.path;
		const playlistMap = this.plugin.settings.playlists || {};
		// favorites 在设置中以 trackId 的形式存储，这里统一按 ID 处理
		const favoriteIds = new Set(this.plugin.settings.favorites || []);

		const inPlaylists: string[] = [];
		for (const [name, paths] of Object.entries(playlistMap)) {
			if (Array.isArray(paths) && paths.includes(path)) inPlaylists.push(name);
		}

		if (inPlaylists.length > 0) {
			const first = inPlaylists[0];
			if (!first) {
				return { list: trackList, title }; // 理论上不会发生
			}
			const set = new Set(playlistMap[first] || []);
			const filteredTracks = trackList.filter((f) => set.has(f.path));
			// 对播放列表进行排序
			list = sortTracksByTrack(filteredTracks, this.plugin.settings);
			title = `歌单-${first}`;
		} else {
			// 通过 trackId 判断是否在收藏列表中
			const trackId = getOrCreateTrackId(path, this.plugin.settings);
			if (favoriteIds.has(trackId)) {
				// 对收藏列表进行排序
				const filteredTracks = trackList.filter((f) => {
					const id = getOrCreateTrackId(f.path, this.plugin.settings);
					return favoriteIds.has(id);
				});
				list = sortTracksByTrack(filteredTracks, this.plugin.settings);
				title = "收藏";
			} else {
				// 全部列表已经排序，直接使用
				list = trackList;
				title = "全部";
			}
		}

		return { list, title };
	}

	/**
	 * 将播放列表信息转换为 currentList 字符串格式
	 * 
	 * @param type - 列表类型（"all", "favorites", "playlist", "artist", "album"）
	 * @param name - 列表名称（可选，某些类型不需要）
	 * @returns 格式化后的列表标识符字符串
	 */
	formatCurrentList(type: string, name?: string): string {
		return formatCurrentListUtil(type, name);
	}

	/**
	 * 从 currentList 字符串解析播放列表信息
	 * 
	 * @param currentList - 列表标识符字符串（如 "all", "favorites", "playlist:xxx"）
	 * @returns 包含类型和名称的对象
	 */
	parseCurrentList(currentList?: string): { type: string; name: string } {
		return parseCurrentListUtil(currentList);
	}

	/**
	 * 根据 sectionId 设置当前播放列表
	 * 
	 * 根据 sectionId 从相应的服务中获取列表数据并构建 CurrentList 对象。
	 * 支持的 sectionId 格式：
	 * - "all" - 全部歌曲
	 * - "favorites" - 收藏列表
	 * - "playlist-xxx" - 播放列表
	 * - "artist-xxx" - 艺术家
	 * - "album-xxx" - 专辑
	 * 
	 * @param sectionId - section ID 字符串
	 * @param trackList - 所有曲目列表
	 * @param favorites - 收藏列表
	 * @returns CurrentList 对象，如果 sectionId 无效则返回 null
	 */
	setCurrentListFromSectionId(
		sectionId: string,
		trackList: TFile[],
		favorites: TFile[]
	): CurrentList | null {
		if (sectionId === "all") {
			// 全部列表已经排序，直接返回
			return { type: "all", name: "全部", tracks: trackList };
		} else if (sectionId === "favorites") {
			// 收藏列表已经排序，直接返回
			return { type: "favorites", name: "收藏", tracks: favorites };
		} else if (sectionId.startsWith("playlist-")) {
			const playlistName = sectionId.replace("playlist-", "");
			const playlistMap = this.playlistService.getPlaylistMap();
			const playlistPaths = playlistMap[playlistName] || [];
			const tracks = trackList.filter((f) => playlistPaths.includes(f.path));
			// 对播放列表进行排序
			const sortedTracks = sortTracksByTrack(tracks, this.plugin.settings);
			return { type: "playlist", name: playlistName, tracks: sortedTracks };
		} else if (sectionId.startsWith("artist-")) {
			const artistName = sectionId.replace("artist-", "");
			const artists = this.libraryService.getArtists(trackList);
			const artist = artists.find((a) => a.name === artistName);
			if (artist) {
				// 艺术家列表已经排序，直接返回
				return { type: "artist", name: artistName, tracks: artist.tracks };
			}
		} else if (sectionId.startsWith("album-")) {
			const albumName = sectionId.replace("album-", "");
			const albums = this.libraryService.getAlbums(trackList);
			const album = albums.find((a) => a.name === albumName);
			if (album) {
				// 专辑列表已经排序，直接返回
				return { type: "album", name: albumName, tracks: album.tracks };
			}
		}
		return null;
	}

	/**
	 * 计算当前列表标识字符串
	 * 
	 * 根据当前曲目和列表上下文，计算并返回列表标识符。
	 * 标识符格式：
	 * - "all" - 全部歌曲
	 * - "favorites" - 收藏列表
	 * - "playlist:xxx" - 播放列表
	 * - "album:xxx" - 专辑
	 * - "artist:xxx" - 艺术家
	 * 
	 * @param currentTrack - 当前播放的曲目
	 * @param currentList - 当前列表对象
	 * @param trackList - 所有曲目列表
	 * @param favorites - 收藏列表
	 * @returns 列表标识符字符串
	 */
	calculateCurrentListId(
		currentTrack: TFile | null,
		currentList: CurrentList | null,
		trackList: TFile[],
		favorites: TFile[]
	): string {
		if (currentList) {
			return this.formatCurrentList(currentList.type, currentList.name);
		}
		if (!currentTrack) return "all";

		const { title } = this.getCurrentPlaylistForTrack(
			currentTrack,
			currentList,
			trackList,
			favorites
		);
		if (title === "收藏") return "favorites";
		if (title.startsWith("歌单-")) return `playlist:${title.replace("歌单-", "")}`;
		if (title.startsWith("专辑-")) return `album:${title.replace("专辑-", "")}`;
		if (title.startsWith("艺术家-")) return `artist:${title.replace("艺术家-", "")}`;
		return "all";
	}

	/**
	 * 设置当前列表上下文
	 * 
	 * 根据 section ID 设置当前列表和列表标识符。
	 * 如果 sectionId 未提供，返回 null。
	 * 
	 * @param sectionId - 可选的 section ID
	 * @param currentSectionId - 当前的 section ID
	 * @param trackList - 所有曲目列表
	 * @param favorites - 收藏列表
	 * @returns 包含列表对象和列表标识符的对象
	 */
	setCurrentListContext(
		sectionId: string | undefined,
		currentSectionId: string | null,
		trackList: TFile[],
		favorites: TFile[]
	): { list: CurrentList | null; listId: string | null } {
		if (!sectionId) {
			return { list: null, listId: null };
		}
		const list = this.setCurrentListFromSectionId(sectionId, trackList, favorites);
		if (list) {
			return {
				list,
				listId: this.formatCurrentList(list.type, list.name),
			};
		}
		return { list: null, listId: null };
	}
}

