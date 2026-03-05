/**
 * 音频相关常量定义
 */

/** 支持的音频文件格式 */
export const SUPPORTED_AUDIO_FORMATS = ['.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac'] as const;

/** 默认音量值（0.0 - 1.0） */
export const DEFAULT_VOLUME = 1.0;

/** 默认播放速度（1.0 为正常速度） */
export const DEFAULT_PLAYBACK_RATE = 1.0;

/** 支持的图片文件扩展名（用于封面查找） */
export const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'] as const;

