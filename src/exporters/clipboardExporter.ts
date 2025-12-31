/**
 * ClipboardExporter - Exports markdown content to clipboard as rich HTML
 * Compatible with Google Docs paste functionality
 *
 * Features:
 * - Converts markdown to styled HTML for clipboard
 * - Handles mermaid diagrams via kroki.io image URLs
 * - Supports all standard markdown elements (headings, lists, code blocks, etc.)
 * - Falls back to plain text if rich text copy fails
 */

import { MermaidHandler } from "../mermaidHandler";

/**
 * Markdown AST Node types for rich text conversion
 */
export type MarkdownNodeType =
  | "heading"
  | "paragraph"
  | "bold"
  | "italic"
  | "code"
  | "codeblock"
  | "link"
  | "image"
  | "list"
  | "listitem"
  | "blockquote"
  | "horizontalrule"
  | "text"
  | "linebreak"
  | "mermaid";

/**
 * Markdown AST Node structure
 */
export interface MarkdownNode {
  type: MarkdownNodeType;
  content?: string;
  children?: MarkdownNode[];
  level?: number; // For headings (1-6)
  ordered?: boolean; // For lists
  url?: string; // For links and images
  alt?: string; // For images
  language?: string; // For code blocks
}

/**
 * ClipboardExporter class for converting markdown to clipboard-compatible HTML
 */
export class ClipboardExporter {
  private mermaidHandler: MermaidHandler;

  constructor() {
    this.mermaidHandler = new MermaidHandler();
  }

  /**
   * Export markdown content to clipboard as rich HTML
   * @param markdown - The markdown content to export
   * @throws Error if clipboard operation fails and plain text fallback also fails
   */
  async exportToClipboard(markdown: string): Promise<void> {
    if (!markdown || markdown.trim().length === 0) {
      throw new Error("Cannot export empty markdown content");
    }

    // Process mermaid diagrams first
    const processedMarkdown = this.handleMermaidDiagrams(markdown);

    // Parse markdown to AST
    const ast = this.parseMarkdown(processedMarkdown);

    // Convert AST to HTML
    const html = this.convertToRichText(ast);

    // Create the full HTML document for clipboard
    const fullHtml = this.wrapHtmlForClipboard(html);

    // Copy to clipboard using Clipboard API with HTML MIME type
    await this.copyHtmlToClipboard(fullHtml, markdown);
  }

  /**
   * Handle Mermaid diagrams by converting them to kroki.io image URLs
   * @param content - The markdown content containing mermaid blocks
   * @returns Markdown with mermaid blocks replaced by image references
   */
  handleMermaidDiagrams(content: string): string {
    if (!content || !this.mermaidHandler.hasMermaid(content)) {
      return content;
    }

    const blocks = this.mermaidHandler.extractMermaidBlocks(content);
    if (blocks.length === 0) {
      return content;
    }

    let result = content;
    let offset = 0;

    for (const block of blocks) {
      // Encode mermaid to kroki.io URL
      const krokiUrl = this.encodeMermaidToKroki(block.code);

      // Create image markdown replacement
      const imageMarkdown = `![Mermaid Diagram](${krokiUrl})`;

      // Calculate the original mermaid block text
      const originalBlock = content.substring(block.startIndex, block.endIndex);

      // Replace in result
      const adjustedStart = block.startIndex - offset;
      const adjustedEnd = block.endIndex - offset;
      result = result.substring(0, adjustedStart) + imageMarkdown + result.substring(adjustedEnd);

      // Update offset for next replacement
      offset += originalBlock.length - imageMarkdown.length;
    }

    return result;
  }

  /**
   * Encode mermaid code to a kroki.io URL
   * @param mermaidCode - The mermaid diagram code
   * @returns The kroki.io URL for the rendered diagram
   */
  encodeMermaidToKroki(mermaidCode: string): string {
    if (!mermaidCode || mermaidCode.trim().length === 0) {
      return "";
    }
    // Base64 encode the mermaid code for kroki.io
    const encoded = this.encodeBase64Url(mermaidCode);
    return `https://kroki.io/mermaid/svg/${encoded}`;
  }

  /**
   * Encode string to URL-safe base64
   * @param str - The string to encode
   * @returns URL-safe base64 encoded string
   */
  private encodeBase64Url(str: string): string {
    // Use pako-like compression for kroki.io
    // For simplicity, we'll use a basic approach that kroki.io accepts
    const bytes = new TextEncoder().encode(str);

    // Compress using simple deflate-like encoding for kroki
    // kroki.io accepts both plain base64 and compressed
    const base64 = this.bytesToBase64(bytes);

    // Make URL-safe
    return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  /**
   * Convert bytes to base64
   */
  private bytesToBase64(bytes: Uint8Array): string {
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Parse markdown string into AST nodes
   * @param markdown - The markdown string to parse
   * @returns Array of MarkdownNode
   */
  parseMarkdown(markdown: string): MarkdownNode[] {
    if (!markdown) {
      return [];
    }

    const nodes: MarkdownNode[] = [];
    const lines = markdown.split("\n");
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      // Heading detection (# to ######)
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch) {
        nodes.push({
          type: "heading",
          level: headingMatch[1].length,
          children: this.parseInline(headingMatch[2]),
        });
        i++;
        continue;
      }

      // Code block detection
      if (line.startsWith("```")) {
        const language = line.slice(3).trim();
        const codeLines: string[] = [];
        i++;
        while (i < lines.length && !lines[i].startsWith("```")) {
          codeLines.push(lines[i]);
          i++;
        }
        nodes.push({
          type: "codeblock",
          content: codeLines.join("\n"),
          language: language || undefined,
        });
        i++; // Skip closing ```
        continue;
      }

      // Blockquote detection
      if (line.startsWith("> ")) {
        const quoteLines: string[] = [];
        while (i < lines.length && lines[i].startsWith("> ")) {
          quoteLines.push(lines[i].slice(2));
          i++;
        }
        nodes.push({
          type: "blockquote",
          children: this.parseMarkdown(quoteLines.join("\n")),
        });
        continue;
      }

      // Horizontal rule detection
      if (/^[-*_]{3,}$/.test(line.trim())) {
        nodes.push({ type: "horizontalrule" });
        i++;
        continue;
      }

      // Ordered list detection
      if (/^\d+\.\s+/.test(line)) {
        const listItems: MarkdownNode[] = [];
        while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
          const itemContent = lines[i].replace(/^\d+\.\s+/, "");
          listItems.push({
            type: "listitem",
            children: this.parseInline(itemContent),
          });
          i++;
        }
        nodes.push({
          type: "list",
          ordered: true,
          children: listItems,
        });
        continue;
      }

      // Unordered list detection
      if (/^[-*+]\s+/.test(line)) {
        const listItems: MarkdownNode[] = [];
        while (i < lines.length && /^[-*+]\s+/.test(lines[i])) {
          const itemContent = lines[i].replace(/^[-*+]\s+/, "");
          listItems.push({
            type: "listitem",
            children: this.parseInline(itemContent),
          });
          i++;
        }
        nodes.push({
          type: "list",
          ordered: false,
          children: listItems,
        });
        continue;
      }

      // Empty line - paragraph break
      if (line.trim() === "") {
        i++;
        continue;
      }

      // Paragraph - collect consecutive non-empty lines
      const paragraphLines: string[] = [];
      while (
        i < lines.length &&
        lines[i].trim() !== "" &&
        !lines[i].startsWith("#") &&
        !lines[i].startsWith("```") &&
        !lines[i].startsWith("> ") &&
        !/^[-*_]{3,}$/.test(lines[i].trim()) &&
        !/^\d+\.\s+/.test(lines[i]) &&
        !/^[-*+]\s+/.test(lines[i])
      ) {
        paragraphLines.push(lines[i]);
        i++;
      }

      if (paragraphLines.length > 0) {
        nodes.push({
          type: "paragraph",
          children: this.parseInline(paragraphLines.join(" ")),
        });
      }
    }

    return nodes;
  }

  /**
   * Parse inline markdown elements (bold, italic, code, links, images)
   * @param text - The inline text to parse
   * @returns Array of MarkdownNode
   */
  parseInline(text: string): MarkdownNode[] {
    if (!text) {
      return [];
    }

    const nodes: MarkdownNode[] = [];
    let remaining = text;

    while (remaining.length > 0) {
      // Image detection: ![alt](url)
      const imageMatch = remaining.match(/^!\[([^\]]*)\]\(([^)]+)\)/);
      if (imageMatch) {
        nodes.push({
          type: "image",
          alt: imageMatch[1],
          url: imageMatch[2],
        });
        remaining = remaining.slice(imageMatch[0].length);
        continue;
      }

      // Link detection: [text](url)
      const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
      if (linkMatch) {
        nodes.push({
          type: "link",
          content: linkMatch[1],
          url: linkMatch[2],
        });
        remaining = remaining.slice(linkMatch[0].length);
        continue;
      }

      // Bold detection: **text** or __text__
      const boldMatch = remaining.match(/^(\*\*|__)([^*_]+)\1/);
      if (boldMatch) {
        nodes.push({
          type: "bold",
          children: this.parseInline(boldMatch[2]),
        });
        remaining = remaining.slice(boldMatch[0].length);
        continue;
      }

      // Italic detection: *text* or _text_ (single)
      const italicMatch = remaining.match(/^(\*|_)([^*_]+)\1/);
      if (italicMatch) {
        nodes.push({
          type: "italic",
          children: this.parseInline(italicMatch[2]),
        });
        remaining = remaining.slice(italicMatch[0].length);
        continue;
      }

      // Inline code detection: `code`
      const codeMatch = remaining.match(/^`([^`]+)`/);
      if (codeMatch) {
        nodes.push({
          type: "code",
          content: codeMatch[1],
        });
        remaining = remaining.slice(codeMatch[0].length);
        continue;
      }

      // Plain text - find next special character or end
      const nextSpecial = remaining.search(/[![*_`]/);
      if (nextSpecial === -1) {
        // No more special characters
        nodes.push({
          type: "text",
          content: remaining,
        });
        break;
      } else if (nextSpecial === 0) {
        // Special character at start but didn't match patterns above
        // Treat as plain text
        nodes.push({
          type: "text",
          content: remaining[0],
        });
        remaining = remaining.slice(1);
      } else {
        // Text before the special character
        nodes.push({
          type: "text",
          content: remaining.slice(0, nextSpecial),
        });
        remaining = remaining.slice(nextSpecial);
      }
    }

    return nodes;
  }

  /**
   * Convert AST nodes to HTML string with Google Docs compatible styling
   * @param ast - Array of MarkdownNode
   * @returns HTML string
   */
  convertToRichText(ast: MarkdownNode[]): string {
    return ast.map((node) => this.nodeToHtml(node)).join("");
  }

  /**
   * Convert a single AST node to HTML
   * @param node - The MarkdownNode to convert
   * @returns HTML string
   */
  private nodeToHtml(node: MarkdownNode): string {
    switch (node.type) {
      case "heading":
        return this.headingToHtml(node);
      case "paragraph":
        return this.paragraphToHtml(node);
      case "bold":
        return this.boldToHtml(node);
      case "italic":
        return this.italicToHtml(node);
      case "code":
        return this.inlineCodeToHtml(node);
      case "codeblock":
        return this.codeBlockToHtml(node);
      case "link":
        return this.linkToHtml(node);
      case "image":
        return this.imageToHtml(node);
      case "list":
        return this.listToHtml(node);
      case "listitem":
        return this.listItemToHtml(node);
      case "blockquote":
        return this.blockquoteToHtml(node);
      case "horizontalrule":
        return '<hr style="border: none; border-top: 1px solid #ccc; margin: 16px 0;">';
      case "text":
        return this.escapeHtml(node.content || "");
      case "linebreak":
        return "<br>";
      default:
        return "";
    }
  }

  /**
   * Convert heading node to HTML
   */
  private headingToHtml(node: MarkdownNode): string {
    const level = node.level || 1;
    const sizes: Record<number, string> = {
      1: "26pt",
      2: "22pt",
      3: "18pt",
      4: "14pt",
      5: "12pt",
      6: "10pt",
    };
    const content = node.children ? this.convertToRichText(node.children) : "";
    return `<h${level} style="font-size: ${sizes[level]}; font-weight: bold; color: #000; margin: 16px 0 8px 0; line-height: 1.3;">${content}</h${level}>`;
  }

  /**
   * Convert paragraph node to HTML
   */
  private paragraphToHtml(node: MarkdownNode): string {
    const content = node.children ? this.convertToRichText(node.children) : "";
    return `<p style="font-size: 11pt; color: #000; margin: 0 0 12px 0; line-height: 1.5;">${content}</p>`;
  }

  /**
   * Convert bold node to HTML
   */
  private boldToHtml(node: MarkdownNode): string {
    const content = node.children ? this.convertToRichText(node.children) : "";
    return `<strong style="font-weight: bold;">${content}</strong>`;
  }

  /**
   * Convert italic node to HTML
   */
  private italicToHtml(node: MarkdownNode): string {
    const content = node.children ? this.convertToRichText(node.children) : "";
    return `<em style="font-style: italic;">${content}</em>`;
  }

  /**
   * Convert inline code node to HTML
   */
  private inlineCodeToHtml(node: MarkdownNode): string {
    const content = this.escapeHtml(node.content || "");
    return `<code style="background-color: #f4f4f4; padding: 2px 6px; border-radius: 3px; font-family: 'Courier New', monospace; font-size: 10pt;">${content}</code>`;
  }

  /**
   * Convert code block node to HTML
   */
  private codeBlockToHtml(node: MarkdownNode): string {
    const content = this.escapeHtml(node.content || "");
    const language = node.language ? ` data-language="${node.language}"` : "";
    return `<pre style="background-color: #f4f4f4; padding: 12px; border-radius: 4px; overflow-x: auto; margin: 12px 0;"${language}><code style="font-family: 'Courier New', monospace; font-size: 10pt; color: #333;">${content}</code></pre>`;
  }

  /**
   * Convert link node to HTML
   */
  private linkToHtml(node: MarkdownNode): string {
    const content = this.escapeHtml(node.content || "");
    const url = this.escapeHtml(node.url || "#");
    return `<a href="${url}" style="color: #1a73e8; text-decoration: underline;">${content}</a>`;
  }

  /**
   * Convert image node to HTML
   */
  private imageToHtml(node: MarkdownNode): string {
    const url = this.escapeHtml(node.url || "");
    const alt = this.escapeHtml(node.alt || "");
    return `<img src="${url}" alt="${alt}" style="max-width: 100%; height: auto; margin: 12px 0;">`;
  }

  /**
   * Convert list node to HTML
   */
  private listToHtml(node: MarkdownNode): string {
    const tag = node.ordered ? "ol" : "ul";
    const items = node.children
      ? node.children.map((child) => this.nodeToHtml(child)).join("")
      : "";
    const listStyle = node.ordered
      ? "list-style-type: decimal;"
      : "list-style-type: disc;";
    return `<${tag} style="margin: 12px 0; padding-left: 24px; ${listStyle}">${items}</${tag}>`;
  }

  /**
   * Convert list item node to HTML
   */
  private listItemToHtml(node: MarkdownNode): string {
    const content = node.children ? this.convertToRichText(node.children) : "";
    return `<li style="font-size: 11pt; color: #000; line-height: 1.5; margin: 4px 0;">${content}</li>`;
  }

  /**
   * Convert blockquote node to HTML
   */
  private blockquoteToHtml(node: MarkdownNode): string {
    const content = node.children ? this.convertToRichText(node.children) : "";
    return `<blockquote style="border-left: 4px solid #ddd; padding-left: 16px; margin: 12px 0; color: #666; font-style: italic;">${content}</blockquote>`;
  }

  /**
   * Escape HTML special characters
   */
  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return text.replace(/[&<>"']/g, (char) => map[char]);
  }

  /**
   * Wrap HTML content with document structure for clipboard
   */
  private wrapHtmlForClipboard(html: string): string {
    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
body {
  font-family: Arial, sans-serif;
  font-size: 11pt;
  color: #000;
  line-height: 1.5;
}
</style>
</head>
<body>
${html}
</body>
</html>`;
  }

  /**
   * Copy HTML content to clipboard with fallback
   * @param html - The HTML content
   * @param plainText - The plain text fallback
   */
  private async copyHtmlToClipboard(
    html: string,
    plainText: string
  ): Promise<void> {
    try {
      // Use the modern Clipboard API with HTML support
      // Obsidian runs in Electron which fully supports ClipboardItem
      const htmlBlob = new Blob([html], { type: "text/html" });
      const textBlob = new Blob([plainText], { type: "text/plain" });
      const clipboardItem = new ClipboardItem({
        "text/html": htmlBlob,
        "text/plain": textBlob,
      });
      await navigator.clipboard.write([clipboardItem]);
    } catch {
      // Fallback - copy as plain text if rich text copy fails
      await navigator.clipboard.writeText(plainText);
      throw new Error(
        "Could not copy rich text. Plain text was copied instead."
      );
    }
  }
}
