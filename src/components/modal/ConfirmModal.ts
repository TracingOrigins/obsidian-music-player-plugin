/**
 * 确认对话框模块
 * 
 * 提供一个简单的确认对话框，用于需要用户确认的操作。
 * 兼容移动端和桌面端，支持键盘快捷键（Enter 确认，Escape 取消）。
 */

import { App } from "obsidian";
import { BaseModal } from "./BaseModal";
import "./ConfirmModal.css";

/**
 * 确认对话框类
 * 
 * 继承自 BaseModal，提供一个确认对话框，包含提示文本和确认/取消按钮。
 * 用于需要用户确认的操作，如删除歌单等。
 */
export class ConfirmModal extends BaseModal<boolean> {

	/**
	 * 构造函数
	 * 
	 * @param app Obsidian 应用实例
	 * @param title 对话框标题
	 * @param message 提示消息文本
	 * @param confirmText 确认按钮文本，默认为 "确定"
	 * @param cancelText 取消按钮文本，默认为 "取消"
	 */
	constructor(
		app: App,
		private title: string,
		private message: string,
		private confirmText: string = "确定",
		private cancelText: string = "取消"
	) {
		super(app, title);
	}

	/**
	 * 当模态框打开时调用
	 * 创建对话框内容
	 */
	onOpen() {
		void super.onOpen();
		
		// 创建消息文本容器
		const messageContainer = this.contentEl.createDiv({ cls: "prompt-message-container" });
		// 使用 pre + pre-wrap 保留换行与缩进，同时自动换行避免溢出
		messageContainer.createEl("pre", { text: this.message, cls: "prompt-message" });

		// 创建按钮容器
		this.createButtonContainer(
			this.confirmText,
			this.cancelText,
			() => this.submit(true),
			() => this.cancel(false)
		);
		
		// 设置键盘事件处理
		this.setupKeyboardHandlers(
			() => this.submit(true),
			() => this.cancel(false)
		);
	}

	/**
	 * 当模态框关闭时调用
	 * 如果用户没有提交（直接关闭或按 Escape），返回 false
	 */
	onClose() {
		super.onClose();
		// 只有在用户未提交的情况下才返回 false
		// 如果已提交，submit() 方法已经处理了 resolve
		if (!this.submitted) {
			this.resolve(false);
		}
	}
}

