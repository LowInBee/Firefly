import type { MermaidConfig } from "../types/mermaidConfig";

/**
 * Mermaid 图表渲染配置
 *
 * 使用 merman 在构建时将 mermaid 代码块渲染为静态 SVG，
 * 支持浅色/深色双主题，通过 CSS 自动切换。
 *
 */
export const mermaidConfig: MermaidConfig = {
	/**
	 * 亮色模式主题。
	 * 使用 merman 内置宿主主题。
	 */
	lightTheme: "editor-light",

	/**
	 * 暗色模式主题。
	 * 使用 merman 内置宿主主题。
	 */
	darkTheme: "editor-dark",
};
