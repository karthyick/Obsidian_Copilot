/**
 * HTMLExporter - Exports markdown content to HTML file
 * Compatible with Google Docs import and web browsers
 *
 * Features:
 * - Converts markdown to styled HTML document
 * - Handles mermaid diagrams via kroki.io image URLs
 * - Supports all standard markdown elements
 * - Generates valid HTML5 documents with embedded styles
 * - Provides file download functionality
 */

import { App, Notice } from "obsidian";
import { MermaidHandler } from "../mermaidHandler";
import { HTMLExportStyles, DEFAULT_HTML_EXPORT_STYLES } from "../types";

/**
 * Markdown AST Node types for HTML conversion
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
  | "table"
  | "tablerow"
  | "tablecell";

/**
 * Markdown AST Node structure
 */
export interface MarkdownNode {
  type: MarkdownNodeType;
  content?: string;
  children?: MarkdownNode[];
  level?: number;
  ordered?: boolean;
  url?: string;
  alt?: string;
  language?: string;
  isHeader?: boolean;
}

/**
 * Export options for HTML generation
 */
export interface HTMLExportOptions {
  includeStyles?: boolean;
  title?: string;
  darkMode?: boolean;
  customStyles?: Partial<HTMLExportStyles>;
}

/**
 * HTMLExporter class for converting markdown to HTML files
 */
export class HTMLExporter {
  private mermaidHandler: MermaidHandler;
  private app: App;
  private styleSettings: HTMLExportStyles;

  constructor(app: App, styleSettings?: HTMLExportStyles) {
    this.app = app;
    this.mermaidHandler = new MermaidHandler();
    this.styleSettings = styleSettings || DEFAULT_HTML_EXPORT_STYLES;
  }

  /**
   * Update the style settings
   * @param styles - New style settings to apply
   */
  updateStyleSettings(styles: HTMLExportStyles): void {
    this.styleSettings = styles;
  }

  /**
   * Get current style settings
   * @returns Current HTMLExportStyles configuration
   */
  getStyleSettings(): HTMLExportStyles {
    return { ...this.styleSettings };
  }

  /**
   * Export markdown content to an HTML file
   * @param markdown - The markdown content to export
   * @param filename - The name for the exported file (without extension)
   * @param options - Export options
   */
  async exportToHtml(
    markdown: string,
    filename: string,
    options: HTMLExportOptions = {}
  ): Promise<void> {
    if (!markdown || markdown.trim().length === 0) {
      throw new Error("Cannot export empty markdown content");
    }

    const sanitizedFilename = this.sanitizeFilename(filename);

    // Process mermaid diagrams
    const processedMarkdown = this.handleMermaidDiagrams(markdown);

    // Parse markdown to AST
    const ast = this.parseMarkdown(processedMarkdown);

    // Convert AST to HTML body content
    const bodyHtml = this.convertToHtml(ast);

    // Merge custom styles with instance settings if provided
    const mergedStyles = options.customStyles
      ? { ...this.styleSettings, ...options.customStyles }
      : this.styleSettings;

    // Determine dark mode
    const useDarkMode = options.darkMode ?? mergedStyles.useDarkMode;

    // Generate full HTML document
    const fullHtml = this.generateHtmlDocument(bodyHtml, {
      ...options,
      title: options.title || sanitizedFilename,
      darkMode: useDarkMode,
      customStyles: mergedStyles,
    });

    // Save the HTML file
    await this.saveHtmlFile(fullHtml, sanitizedFilename);

    new Notice(`HTML file exported: ${sanitizedFilename}.html`);
  }

  /**
   * Export markdown content to an HTML file at a specified path
   * Convenience method that wraps exportToHtml with additional path control
   * @param markdown - The markdown content to export
   * @param filePath - The full path for the exported file (with or without .html extension)
   * @param options - Export options
   */
  async exportToHtmlFile(
    markdown: string,
    filePath: string,
    options: HTMLExportOptions = {}
  ): Promise<void> {
    if (!markdown || markdown.trim().length === 0) {
      throw new Error("Cannot export empty markdown content");
    }

    // Ensure .html extension
    const normalizedPath = filePath.endsWith(".html") ? filePath : `${filePath}.html`;

    // Process mermaid diagrams
    const processedMarkdown = this.handleMermaidDiagrams(markdown);

    // Parse markdown to AST
    const ast = this.parseMarkdown(processedMarkdown);

    // Convert AST to HTML body content
    const bodyHtml = this.convertToHtml(ast);

    // Merge custom styles with instance settings if provided
    const mergedStyles = options.customStyles
      ? { ...this.styleSettings, ...options.customStyles }
      : this.styleSettings;

    // Determine dark mode
    const useDarkMode = options.darkMode ?? mergedStyles.useDarkMode;

    // Extract filename from path for title
    const filename = normalizedPath.split("/").pop()?.replace(".html", "") || "Exported Document";

    // Generate full HTML document
    const fullHtml = this.generateHtmlDocument(bodyHtml, {
      ...options,
      title: options.title || filename,
      darkMode: useDarkMode,
      customStyles: mergedStyles,
    });

    // Save the HTML file directly to the specified path
    await this.saveHtmlFileToPath(fullHtml, normalizedPath);

    new Notice(`HTML file exported: ${normalizedPath}`);
  }

  /**
   * Save HTML content to a specific file path
   */
  private async saveHtmlFileToPath(html: string, filePath: string): Promise<void> {
    try {
      const vault = this.app.vault;

      // Extract folder path
      const folderPath = filePath.substring(0, filePath.lastIndexOf("/"));

      // Create folder if it doesn't exist and there is a folder path
      if (folderPath) {
        const folderExists = vault.getAbstractFileByPath(folderPath);
        if (!folderExists) {
          await vault.createFolder(folderPath);
        }
      }

      // Check if file already exists
      const existingFile = vault.getAbstractFileByPath(filePath);
      if (existingFile) {
        await this.app.fileManager.trashFile(existingFile);
      }

      // Create the file
      await vault.create(filePath, html);
    } catch {
      // Vault save failed - silently fall back to browser download
      const filename = filePath.split("/").pop() || "export.html";
      this.downloadHtmlFile(html, filename);
    }
  }

  /**
   * Handle Mermaid diagrams by converting them to kroki.io image URLs
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
      const krokiUrl = this.encodeMermaidToKroki(block.code);
      const imageMarkdown = `![Mermaid Diagram](${krokiUrl})`;
      const originalBlock = content.substring(block.startIndex, block.endIndex);

      const adjustedStart = block.startIndex - offset;
      const adjustedEnd = block.endIndex - offset;
      result =
        result.substring(0, adjustedStart) +
        imageMarkdown +
        result.substring(adjustedEnd);

      offset += originalBlock.length - imageMarkdown.length;
    }

    return result;
  }

  /**
   * Encode mermaid code to a kroki.io URL
   */
  encodeMermaidToKroki(mermaidCode: string): string {
    if (!mermaidCode || mermaidCode.trim().length === 0) {
      return "";
    }
    const encoded = this.encodeBase64Url(mermaidCode);
    return `https://kroki.io/mermaid/svg/${encoded}`;
  }

  /**
   * Encode string to URL-safe base64
   */
  private encodeBase64Url(str: string): string {
    const bytes = new TextEncoder().encode(str);
    const base64 = this.bytesToBase64(bytes);
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

      // Table detection
      if (line.includes("|") && i + 1 < lines.length && lines[i + 1].includes("|")) {
        const tableResult = this.parseTable(lines, i);
        if (tableResult.node) {
          nodes.push(tableResult.node);
          i = tableResult.endIndex;
          continue;
        }
      }

      // Heading detection
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
        i++;
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

      // Empty line
      if (line.trim() === "") {
        i++;
        continue;
      }

      // Paragraph
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
   * Parse a markdown table
   */
  private parseTable(
    lines: string[],
    startIndex: number
  ): { node: MarkdownNode | null; endIndex: number } {
    const headerLine = lines[startIndex];
    const separatorLine = lines[startIndex + 1];

    // Check if this is a valid table (has separator line with dashes)
    if (!separatorLine || !/^[\s|:-]+$/.test(separatorLine)) {
      return { node: null, endIndex: startIndex + 1 };
    }

    const rows: MarkdownNode[] = [];

    // Parse header row
    const headerCells = this.parseTableRow(headerLine, true);
    if (headerCells.children && headerCells.children.length > 0) {
      rows.push(headerCells);
    }

    // Parse body rows
    let i = startIndex + 2;
    while (i < lines.length && lines[i].includes("|")) {
      const row = this.parseTableRow(lines[i], false);
      if (row.children && row.children.length > 0) {
        rows.push(row);
      }
      i++;
    }

    if (rows.length === 0) {
      return { node: null, endIndex: i };
    }

    return {
      node: {
        type: "table",
        children: rows,
      },
      endIndex: i,
    };
  }

  /**
   * Parse a table row
   */
  private parseTableRow(line: string, isHeader: boolean): MarkdownNode {
    const cells = line
      .split("|")
      .map((cell) => cell.trim())
      .filter((cell, index, arr) => index > 0 && index < arr.length - 1 || (index === 0 && cell) || (index === arr.length - 1 && cell));

    const cellNodes: MarkdownNode[] = cells
      .filter((cell) => cell.length > 0)
      .map((cell) => ({
        type: "tablecell" as MarkdownNodeType,
        isHeader,
        children: this.parseInline(cell),
      }));

    return {
      type: "tablerow",
      children: cellNodes,
    };
  }

  /**
   * Parse inline markdown elements
   */
  parseInline(text: string): MarkdownNode[] {
    if (!text) {
      return [];
    }

    const nodes: MarkdownNode[] = [];
    let remaining = text;

    while (remaining.length > 0) {
      // Image
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

      // Link
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

      // Bold
      const boldMatch = remaining.match(/^(\*\*|__)([^*_]+)\1/);
      if (boldMatch) {
        nodes.push({
          type: "bold",
          children: this.parseInline(boldMatch[2]),
        });
        remaining = remaining.slice(boldMatch[0].length);
        continue;
      }

      // Italic
      const italicMatch = remaining.match(/^(\*|_)([^*_]+)\1/);
      if (italicMatch) {
        nodes.push({
          type: "italic",
          children: this.parseInline(italicMatch[2]),
        });
        remaining = remaining.slice(italicMatch[0].length);
        continue;
      }

      // Inline code
      const codeMatch = remaining.match(/^`([^`]+)`/);
      if (codeMatch) {
        nodes.push({
          type: "code",
          content: codeMatch[1],
        });
        remaining = remaining.slice(codeMatch[0].length);
        continue;
      }

      // Plain text
      const nextSpecial = remaining.search(/[![*_`]/);
      if (nextSpecial === -1) {
        nodes.push({
          type: "text",
          content: remaining,
        });
        break;
      } else if (nextSpecial === 0) {
        nodes.push({
          type: "text",
          content: remaining[0],
        });
        remaining = remaining.slice(1);
      } else {
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
   * Convert AST nodes to HTML string
   */
  convertToHtml(ast: MarkdownNode[]): string {
    return ast.map((node) => this.nodeToHtml(node)).join("");
  }

  /**
   * Convert a single AST node to HTML
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
        return "<hr>";
      case "text":
        return this.escapeHtml(node.content || "");
      case "linebreak":
        return "<br>";
      case "table":
        return this.tableToHtml(node);
      case "tablerow":
        return this.tableRowToHtml(node);
      case "tablecell":
        return this.tableCellToHtml(node);
      default:
        return "";
    }
  }

  /**
   * Convert heading node to HTML
   */
  private headingToHtml(node: MarkdownNode): string {
    const level = node.level || 1;
    const content = node.children ? this.convertToHtml(node.children) : "";
    return `<h${level}>${content}</h${level}>\n`;
  }

  /**
   * Convert paragraph node to HTML
   */
  private paragraphToHtml(node: MarkdownNode): string {
    const content = node.children ? this.convertToHtml(node.children) : "";
    return `<p>${content}</p>\n`;
  }

  /**
   * Convert bold node to HTML
   */
  private boldToHtml(node: MarkdownNode): string {
    const content = node.children ? this.convertToHtml(node.children) : "";
    return `<strong>${content}</strong>`;
  }

  /**
   * Convert italic node to HTML
   */
  private italicToHtml(node: MarkdownNode): string {
    const content = node.children ? this.convertToHtml(node.children) : "";
    return `<em>${content}</em>`;
  }

  /**
   * Convert inline code node to HTML
   */
  private inlineCodeToHtml(node: MarkdownNode): string {
    const content = this.escapeHtml(node.content || "");
    return `<code>${content}</code>`;
  }

  /**
   * Convert code block node to HTML
   */
  private codeBlockToHtml(node: MarkdownNode): string {
    const content = this.escapeHtml(node.content || "");
    const langClass = node.language ? ` class="language-${node.language}"` : "";
    return `<pre><code${langClass}>${content}</code></pre>\n`;
  }

  /**
   * Convert link node to HTML
   */
  private linkToHtml(node: MarkdownNode): string {
    const content = this.escapeHtml(node.content || "");
    const url = this.escapeHtml(node.url || "#");
    return `<a href="${url}">${content}</a>`;
  }

  /**
   * Convert image node to HTML
   */
  private imageToHtml(node: MarkdownNode): string {
    const url = this.escapeHtml(node.url || "");
    const alt = this.escapeHtml(node.alt || "");
    return `<img src="${url}" alt="${alt}">\n`;
  }

  /**
   * Convert list node to HTML
   */
  private listToHtml(node: MarkdownNode): string {
    const tag = node.ordered ? "ol" : "ul";
    const items = node.children
      ? node.children.map((child) => this.nodeToHtml(child)).join("")
      : "";
    return `<${tag}>\n${items}</${tag}>\n`;
  }

  /**
   * Convert list item node to HTML
   */
  private listItemToHtml(node: MarkdownNode): string {
    const content = node.children ? this.convertToHtml(node.children) : "";
    return `<li>${content}</li>\n`;
  }

  /**
   * Convert blockquote node to HTML
   */
  private blockquoteToHtml(node: MarkdownNode): string {
    const content = node.children ? this.convertToHtml(node.children) : "";
    return `<blockquote>\n${content}</blockquote>\n`;
  }

  /**
   * Convert table node to HTML
   */
  private tableToHtml(node: MarkdownNode): string {
    const rows = node.children
      ? node.children.map((child) => this.nodeToHtml(child)).join("")
      : "";
    return `<table>\n${rows}</table>\n`;
  }

  /**
   * Convert table row node to HTML
   */
  private tableRowToHtml(node: MarkdownNode): string {
    const cells = node.children
      ? node.children.map((child) => this.nodeToHtml(child)).join("")
      : "";
    return `<tr>\n${cells}</tr>\n`;
  }

  /**
   * Convert table cell node to HTML
   */
  private tableCellToHtml(node: MarkdownNode): string {
    const tag = node.isHeader ? "th" : "td";
    const content = node.children ? this.convertToHtml(node.children) : "";
    return `<${tag}>${content}</${tag}>\n`;
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
   * Generate a complete HTML5 document
   */
  generateHtmlDocument(
    bodyHtml: string,
    options: HTMLExportOptions = {}
  ): string {
    const title = this.escapeHtml(options.title || "Exported Document");

    // Use custom styles from options, or fall back to instance settings
    const styleConfig = options.customStyles
      ? { ...this.styleSettings, ...options.customStyles }
      : this.styleSettings;

    const useDarkMode = options.darkMode ?? styleConfig.useDarkMode;
    const styles = this.getDocumentStyles(useDarkMode, styleConfig);

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="generator" content="Obsidian AI Assistant HTML Exporter">
    <title>${title}</title>
    <style>
${styles}
    </style>
</head>
<body>
    <article class="document-content">
${bodyHtml}
    </article>
</body>
</html>`;
  }

  /**
   * Get CSS styles for the document using configurable style settings
   * @param darkMode - Whether to use dark mode colors
   * @param styles - The style configuration to use
   */
  private getDocumentStyles(darkMode = false, styles: HTMLExportStyles = this.styleSettings): string {
    // Dark mode has hardcoded colors for contrast, but uses configurable font/spacing
    if (darkMode) {
      return `
        :root {
            --bg-color: #1e1e1e;
            --text-color: #d4d4d4;
            --heading-color: #ffffff;
            --link-color: #569cd6;
            --code-bg: #2d2d2d;
            --code-text: #ce9178;
            --border-color: #404040;
            --blockquote-border: #569cd6;
            --blockquote-text: #9cdcfe;
            --table-header-bg: #2d2d2d;
        }
        body {
            font-family: ${styles.fontFamily};
            font-size: ${styles.fontSize};
            line-height: ${styles.lineHeight};
            color: var(--text-color);
            background-color: var(--bg-color);
            max-width: ${styles.maxWidth};
            margin: 0 auto;
            padding: 40px 20px;
        }
        h1, h2, h3, h4, h5, h6 {
            color: var(--heading-color);
            margin-top: ${styles.headingSpacing};
            margin-bottom: 16px;
            font-weight: 600;
            line-height: 1.25;
        }
        h1 { font-size: 2em; border-bottom: 1px solid var(--border-color); padding-bottom: 0.3em; }
        h2 { font-size: 1.5em; border-bottom: 1px solid var(--border-color); padding-bottom: 0.3em; }
        h3 { font-size: 1.25em; }
        h4 { font-size: 1em; }
        h5 { font-size: 0.875em; }
        h6 { font-size: 0.85em; color: #6a737d; }
        p { margin: 0 0 ${styles.paragraphSpacing} 0; }
        a { color: var(--link-color); text-decoration: none; }
        a:hover { text-decoration: underline; }
        code {
            font-family: 'Consolas', 'Monaco', monospace;
            font-size: 0.9em;
            background-color: var(--code-bg);
            color: var(--code-text);
            padding: 0.2em 0.4em;
            border-radius: 3px;
        }
        pre {
            background-color: var(--code-bg);
            padding: 16px;
            border-radius: 6px;
            overflow-x: auto;
            margin: 16px 0;
        }
        pre code {
            background: none;
            padding: 0;
            font-size: 0.9em;
            color: var(--text-color);
        }
        blockquote {
            margin: 16px 0;
            padding: 0 16px;
            border-left: 4px solid var(--blockquote-border);
            color: var(--blockquote-text);
        }
        ul, ol {
            margin: 16px 0;
            padding-left: 2em;
        }
        li { margin: 4px 0; }
        hr {
            border: none;
            border-top: 1px solid var(--border-color);
            margin: ${styles.headingSpacing} 0;
        }
        img {
            max-width: 100%;
            height: auto;
            margin: 16px 0;
        }
        table {
            border-collapse: collapse;
            width: 100%;
            margin: 16px 0;
        }
        th, td {
            border: 1px solid var(--border-color);
            padding: 8px 12px;
            text-align: left;
        }
        th {
            background-color: var(--table-header-bg);
            font-weight: 600;
        }
        .document-content {
            background-color: var(--bg-color);
        }
      `;
    }

    // Light mode uses fully configurable colors from settings
    return `
        :root {
            --bg-color: #ffffff;
            --text-color: ${styles.textColor};
            --heading-color: ${styles.headingColor};
            --link-color: ${styles.linkColor};
            --code-bg: ${styles.codeBackground};
            --code-text: ${styles.codeTextColor};
            --border-color: ${styles.tableBorderColor};
            --blockquote-border: ${styles.blockquoteBorderColor};
            --blockquote-text: ${styles.blockquoteTextColor};
            --table-header-bg: ${styles.tableHeaderBackground};
        }
        body {
            font-family: ${styles.fontFamily};
            font-size: ${styles.fontSize};
            line-height: ${styles.lineHeight};
            color: var(--text-color);
            background-color: var(--bg-color);
            max-width: ${styles.maxWidth};
            margin: 0 auto;
            padding: 40px 20px;
        }
        h1, h2, h3, h4, h5, h6 {
            color: var(--heading-color);
            margin-top: ${styles.headingSpacing};
            margin-bottom: 16px;
            font-weight: 600;
            line-height: 1.25;
        }
        h1 { font-size: 2em; border-bottom: 1px solid var(--border-color); padding-bottom: 0.3em; }
        h2 { font-size: 1.5em; border-bottom: 1px solid var(--border-color); padding-bottom: 0.3em; }
        h3 { font-size: 1.25em; }
        h4 { font-size: 1em; }
        h5 { font-size: 0.875em; }
        h6 { font-size: 0.85em; color: #656d76; }
        p { margin: 0 0 ${styles.paragraphSpacing} 0; }
        a { color: var(--link-color); text-decoration: none; }
        a:hover { text-decoration: underline; }
        code {
            font-family: 'Consolas', 'Monaco', monospace;
            font-size: 0.9em;
            background-color: var(--code-bg);
            color: var(--code-text);
            padding: 0.2em 0.4em;
            border-radius: 3px;
        }
        pre {
            background-color: var(--code-bg);
            padding: 16px;
            border-radius: 6px;
            overflow-x: auto;
            margin: 16px 0;
        }
        pre code {
            background: none;
            padding: 0;
            font-size: 0.9em;
        }
        blockquote {
            margin: 16px 0;
            padding: 0 16px;
            border-left: 4px solid var(--blockquote-border);
            color: var(--blockquote-text);
        }
        ul, ol {
            margin: 16px 0;
            padding-left: 2em;
        }
        li { margin: 4px 0; }
        hr {
            border: none;
            border-top: 1px solid var(--border-color);
            margin: ${styles.headingSpacing} 0;
        }
        img {
            max-width: 100%;
            height: auto;
            margin: 16px 0;
        }
        table {
            border-collapse: collapse;
            width: 100%;
            margin: 16px 0;
        }
        th, td {
            border: 1px solid var(--border-color);
            padding: 8px 12px;
            text-align: left;
        }
        th {
            background-color: var(--table-header-bg);
            font-weight: 600;
        }
        .document-content {
            background-color: var(--bg-color);
        }
    `;
  }

  /**
   * Sanitize filename for safe file creation
   */
  private sanitizeFilename(filename: string): string {
    return filename
      .replace(/[<>:"/\\|?*]/g, "_")
      .replace(/\s+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "")
      .substring(0, 100);
  }

  /**
   * Save HTML content to a file
   */
  private async saveHtmlFile(html: string, filename: string): Promise<void> {
    const fullFilename = `${filename}.html`;

    // Try to save using Obsidian's vault adapter first
    try {
      const vault = this.app.vault;
      const exportFolder = "exports";

      // Create exports folder if it doesn't exist
      const folderExists = vault.getAbstractFileByPath(exportFolder);
      if (!folderExists) {
        await vault.createFolder(exportFolder);
      }

      const filePath = `${exportFolder}/${fullFilename}`;

      // Check if file already exists
      const existingFile = vault.getAbstractFileByPath(filePath);
      if (existingFile) {
        // Delete existing file to overwrite - use trashFile to respect user preferences
        await this.app.fileManager.trashFile(existingFile);
      }

      // Create the file
      await vault.create(filePath, html);

      return;
    } catch (vaultError) {
      // If vault save fails, silently fall through to browser download as fallback
      void vaultError; // Acknowledge the error without logging
    }

    // Fallback: Browser-based download
    this.downloadHtmlFile(html, fullFilename);
  }

  /**
   * Download HTML file using browser download API
   */
  private downloadHtmlFile(html: string, filename: string): void {
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.addClass("html-export-download-link");
    link.setCssProps({ display: "none" });

    document.body.appendChild(link);
    link.click();

    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
