/**
 * 列表格式化工具函数
 * 
 * 包含列表标识的格式化和解析逻辑，纯函数实现。
 * 用于在字符串格式和结构化格式之间转换播放列表信息。
 */

/**
 * 将播放列表信息转换为 currentList 字符串格式
 * 
 * 将类型和名称组合成标准化的字符串格式，用于存储和传递播放列表信息。
 * 支持的格式：
 * - "all"：全部歌曲
 * - "favorites"：收藏列表
 * - "playlist:歌单名"：指定歌单
 * - "artist:艺术家名"：指定艺术家的所有歌曲
 * - "album:专辑名"：指定专辑的所有歌曲
 * 
 * @param type 列表类型（"all"、"favorites"、"playlist"、"artist"、"album"）
 * @param name 列表名称（对于 playlist、artist、album 类型必需）
 * @returns 返回格式化的字符串，如果类型或名称无效则返回 "all"
 * 
 * @example
 * ```typescript
 * formatCurrentList("playlist", "我的歌单") // "playlist:我的歌单"
 * formatCurrentList("artist", "周杰伦") // "artist:周杰伦"
 * formatCurrentList("all") // "all"
 * ```
 */
export function formatCurrentList(type: string, name?: string): string {
	if (type === "all") return "all";
	if (type === "favorites") return "favorites";
	if (type === "playlist" && name) return `playlist:${name}`;
	if (type === "artist" && name) return `artist:${name}`;
	if (type === "album" && name) return `album:${name}`;
	return "all";
}

/**
 * 从 currentList 字符串解析播放列表信息
 * 
 * 将格式化的字符串解析为结构化的对象，包含类型和名称。
 * 支持解析以下格式：
 * - "all" -> { type: "all", name: "全部" }
 * - "favorites" -> { type: "favorites", name: "收藏" }
 * - "playlist:歌单名" -> { type: "playlist", name: "歌单名" }
 * - "artist:艺术家名" -> { type: "artist", name: "艺术家名" }
 * - "album:专辑名" -> { type: "album", name: "专辑名" }
 * 
 * @param currentList 格式化的列表字符串（可选，默认为 "all"）
 * @returns 返回包含 type 和 name 的对象
 * 
 * @example
 * ```typescript
 * parseCurrentList("playlist:我的歌单") // { type: "playlist", name: "我的歌单" }
 * parseCurrentList("artist:周杰伦") // { type: "artist", name: "周杰伦" }
 * parseCurrentList() // { type: "all", name: "全部" }
 * ```
 */
export function parseCurrentList(currentList?: string): { type: string; name: string } {
	if (!currentList || currentList === "all") {
		return { type: "all", name: "全部" };
	}
	if (currentList === "favorites") {
		return { type: "favorites", name: "收藏" };
	}
	if (currentList.startsWith("playlist:")) {
		return { type: "playlist", name: currentList.replace("playlist:", "") };
	}
	if (currentList.startsWith("artist:")) {
		return { type: "artist", name: currentList.replace("artist:", "") };
	}
	if (currentList.startsWith("album:")) {
		return { type: "album", name: currentList.replace("album:", "") };
	}
	return { type: "all", name: "全部" };
}

