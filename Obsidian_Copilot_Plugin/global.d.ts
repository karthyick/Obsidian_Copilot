declare global {
    interface ObsidianHTMLElement extends HTMLElement {
        empty(): void;
        createEl<K extends keyof HTMLElementTagNameMap>(
            tagName: K,
            props?: { cls?: string | string[]; text?: string; attr?: Record<string, string> }
        ): HTMLElementTagNameMap[K];
        createDiv(props?: { cls?: string | string[]; text?: string; attr?: Record<string, string> }): HTMLDivElement;
        createSpan(props?: { cls?: string | string[]; text?: string; attr?: Record<string, string> }): HTMLSpanElement;
    }
    // Also augment Element, as container sometimes becomes type 'Element'
    interface ObsidianElement extends Element {
        empty(): void;
        createEl<K extends keyof HTMLElementTagNameMap>(
            tagName: K,
            props?: { cls?: string | string[]; text?: string; attr?: Record<string, string> }
        ): HTMLElementTagNameMap[K];
        createDiv(props?: { cls?: string | string[]; text?: string; attr?: Record<string, string> }): HTMLDivElement;
        createSpan(props?: { cls?: string | string[]; text?: string; attr?: Record<string, string> }): HTMLSpanElement;
    }
}
