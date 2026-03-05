import React from "react";
import "./PlayingIndicator.css";

/**
 * 播放指示器组件（柱状图动画效果）
 * 用于显示当前正在播放的状态
 */
export function PlayingIndicator() {
	return (
		<div className="playing-indicator" aria-label="正在播放">
			<div className="equalizer-bar" style={{ animationDelay: '0s' }} />
			<div className="equalizer-bar" style={{ animationDelay: '0.1s' }} />
			<div className="equalizer-bar" style={{ animationDelay: '0.2s' }} />
			<div className="equalizer-bar" style={{ animationDelay: '0.3s' }} />
		</div>
	);
}

/**
 * 创建播放指示器的 HTML 字符串（用于非 React 环境）
 */
export function createPlayingIndicatorHTML(): string {
	return `
		<div class="playing-indicator" aria-label="正在播放">
			<div class="equalizer-bar" style="animation-delay: 0s"></div>
			<div class="equalizer-bar" style="animation-delay: 0.1s"></div>
			<div class="equalizer-bar" style="animation-delay: 0.2s"></div>
			<div class="equalizer-bar" style="animation-delay: 0.3s"></div>
		</div>
	`;
}

