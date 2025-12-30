/**
 * DOCXExporter - Exports markdown content to Microsoft Word DOCX files
 * Compatible with Microsoft Word and Google Docs import
 *
 * Features:
 * - Converts markdown to properly formatted DOCX documents
 * - Handles mermaid diagrams via kroki.io PNG images
 * - Supports all standard markdown elements (headings, lists, code blocks, etc.)
 * - Generates valid DOCX files with proper MIME type
 * - Provides file save functionality via Obsidian vault or browser download
 */

import { App, Notice } from "obsidian";
import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  Packer,
  AlignmentType,
  BorderStyle,
  ImageRun,
  ExternalHyperlink,
  Table,
  TableRow,
  TableCell,
  WidthType,
  IRunOptions,
  IParagraphOptions,
} from "docx";
import { MermaidHandler } from "../mermaidHandler";

/**
 * Markdown AST Node types for DOCX conversion
 */
export type MarkdownNodeType =
  | "heading"
  | "paragraph"
  | "bold"
  | "italic"
  | "code"
  | "codeblock"
  | "mermaid"
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
 * Export options for DOCX generation
 */
export interface DOCXExportOptions {
  title?: string;
  author?: string;
  includeTableOfContents?: boolean;
}

/**
 * Image data for embedding in DOCX
 */
interface ImageData {
  buffer: ArrayBuffer;
  width: number;
  height: number;
}

/**
 * DOCXExporter class for converting markdown to DOCX files
 */
export class DOCXExporter {
  private mermaidHandler: MermaidHandler;
  private app: App;

  constructor(app: App) {
    this.app = app;
    this.mermaidHandler = new MermaidHandler();
  }

  /**
   * Export markdown content to a DOCX file
   * @param markdown - The markdown content to export
   * @param filename - The name for the exported file (without extension)
   * @param options - Export options
   */
  async exportToDocx(
    markdown: string,
    filename: string,
    options: DOCXExportOptions = {}
  ): Promise<void> {
    if (!markdown || markdown.trim().length === 0) {
      throw new Error("Cannot export empty markdown content");
    }

    const sanitizedFilename = this.sanitizeFilename(filename);

    // Process mermaid diagrams - extract image data before parsing
    const { processedMarkdown, mermaidImages } =
      await this.handleMermaidDiagrams(markdown);

    // Parse markdown to AST
    const ast = this.parseMarkdown(processedMarkdown);

    // Convert AST to DOCX document children
    const docChildren = await this.convertToDocx(ast, mermaidImages);

    // Create the DOCX document
    const doc = new Document({
      creator: options.author || "Obsidian AI Assistant",
      title: options.title || sanitizedFilename,
      description: "Exported from Obsidian AI Assistant",
      sections: [
        {
          properties: {},
          children: docChildren,
        },
      ],
    });

    // Generate and save the DOCX file
    await this.saveDocxFile(doc, sanitizedFilename);

    new Notice(`DOCX file exported: ${sanitizedFilename}.docx`);
  }

  /**
   * Handle Mermaid diagrams by converting them to kroki.io PNG images
   * Returns both processed markdown and image data for embedding
   */
  async handleMermaidDiagrams(
    content: string
  ): Promise<{ processedMarkdown: string; mermaidImages: Map<string, ImageData> }> {
    const mermaidImages = new Map<string, ImageData>();

    if (!content || !this.mermaidHandler.hasMermaid(content)) {
      return { processedMarkdown: content, mermaidImages };
    }

    const blocks = this.mermaidHandler.extractMermaidBlocks(content);
    if (blocks.length === 0) {
      return { processedMarkdown: content, mermaidImages };
    }

    let result = content;
    let offset = 0;

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      const imageId = `mermaid_image_${i}`;

      // Fetch the PNG image from kroki.io
      try {
        const imageData = await this.fetchMermaidPng(block.code);
        mermaidImages.set(imageId, imageData);
      } catch (error) {
        // Mermaid fetch failed - fall back to placeholder text silently
        void error; // Acknowledge the error without logging
        const placeholderMarkdown = `[Mermaid Diagram - Failed to render]`;
        const originalBlock = content.substring(block.startIndex, block.endIndex);
        const adjustedStart = block.startIndex - offset;
        const adjustedEnd = block.endIndex - offset;
        result =
          result.substring(0, adjustedStart) +
          placeholderMarkdown +
          result.substring(adjustedEnd);
        offset += originalBlock.length - placeholderMarkdown.length;
        continue;
      }

      // Create a special placeholder for the image
      const imageMarkdown = `![mermaid:${imageId}](mermaid)`;
      const originalBlock = content.substring(block.startIndex, block.endIndex);

      const adjustedStart = block.startIndex - offset;
      const adjustedEnd = block.endIndex - offset;
      result =
        result.substring(0, adjustedStart) +
        imageMarkdown +
        result.substring(adjustedEnd);

      offset += originalBlock.length - imageMarkdown.length;
    }

    return { processedMarkdown: result, mermaidImages };
  }

  /**
   * Fetch Mermaid diagram as PNG from kroki.io
   */
  private async fetchMermaidPng(mermaidCode: string): Promise<ImageData> {
    if (!mermaidCode || mermaidCode.trim().length === 0) {
      throw new Error("Empty mermaid code");
    }

    const encoded = this.encodeBase64Url(mermaidCode);
    const url = `https://kroki.io/mermaid/png/${encoded}`;

    // Note: Using fetch is the standard way to make HTTP requests in Obsidian plugins
    // as they run in an Electron browser environment that supports the Fetch API
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch Mermaid PNG: ${response.status}`);
    }

    const buffer = await response.arrayBuffer();

    // Default dimensions for Mermaid diagrams - will be scaled by docx
    const width = 600;
    const height = 400;

    return { buffer, width, height };
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
        // Detect mermaid blocks specifically
        if (language.toLowerCase() === "mermaid") {
          nodes.push({
            type: "mermaid",
            content: codeLines.join("\n"),
            language: "mermaid",
          });
        } else {
          nodes.push({
            type: "codeblock",
            content: codeLines.join("\n"),
            language: language || undefined,
          });
        }
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
      .filter(
        (cell, index, arr) =>
          (index > 0 && index < arr.length - 1) ||
          (index === 0 && cell) ||
          (index === arr.length - 1 && cell)
      );

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
      // Image (including mermaid placeholders)
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
      const nextSpecial = remaining.search(/[!\[*_`]/);
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
   * Convert AST nodes to DOCX paragraph/table children
   */
  async convertToDocx(
    ast: MarkdownNode[],
    mermaidImages: Map<string, ImageData>
  ): Promise<(Paragraph | Table)[]> {
    const children: (Paragraph | Table)[] = [];

    for (const node of ast) {
      const elements = await this.nodeToDocx(node, mermaidImages);
      children.push(...elements);
    }

    return children;
  }

  /**
   * Convert a single AST node to DOCX elements
   */
  private async nodeToDocx(
    node: MarkdownNode,
    mermaidImages: Map<string, ImageData>
  ): Promise<(Paragraph | Table)[]> {
    switch (node.type) {
      case "heading":
        return [this.headingToDocx(node)];
      case "paragraph":
        return [await this.paragraphToDocx(node, mermaidImages)];
      case "codeblock":
        return [this.codeBlockToDocx(node)];
      case "list":
        return this.listToDocx(node);
      case "blockquote":
        return await this.blockquoteToDocx(node, mermaidImages);
      case "horizontalrule":
        return [this.horizontalRuleToDocx()];
      case "table":
        return [this.tableToDocx(node)];
      case "image":
        return [await this.imageToDocx(node, mermaidImages)];
      default:
        return [];
    }
  }

  /**
   * Convert heading node to DOCX Paragraph
   */
  private headingToDocx(node: MarkdownNode): Paragraph {
    const level = node.level || 1;
    const headingLevel = this.getHeadingLevel(level);

    const runs: TextRun[] = this.inlineNodesToRuns(node.children || []);

    return new Paragraph({
      heading: headingLevel,
      children: runs,
      spacing: { before: 240, after: 120 },
    });
  }

  /**
   * Get HeadingLevel enum value from numeric level
   */
  private getHeadingLevel(level: number): (typeof HeadingLevel)[keyof typeof HeadingLevel] {
    const headingMap: Record<number, (typeof HeadingLevel)[keyof typeof HeadingLevel]> = {
      1: HeadingLevel.HEADING_1,
      2: HeadingLevel.HEADING_2,
      3: HeadingLevel.HEADING_3,
      4: HeadingLevel.HEADING_4,
      5: HeadingLevel.HEADING_5,
      6: HeadingLevel.HEADING_6,
    };
    return headingMap[level] || HeadingLevel.HEADING_1;
  }

  /**
   * Convert paragraph node to DOCX Paragraph
   */
  private async paragraphToDocx(
    node: MarkdownNode,
    mermaidImages: Map<string, ImageData>
  ): Promise<Paragraph> {
    const runs = await this.inlineNodesToRunsAsync(node.children || [], mermaidImages);

    return new Paragraph({
      children: runs,
      spacing: { after: 120 },
    });
  }

  /**
   * Convert inline nodes to TextRun array (synchronous version)
   */
  private inlineNodesToRuns(nodes: MarkdownNode[]): TextRun[] {
    const runs: TextRun[] = [];

    for (const node of nodes) {
      switch (node.type) {
        case "text":
          runs.push(new TextRun({ text: node.content || "" }));
          break;
        case "bold":
          runs.push(
            ...this.inlineNodesToRuns(node.children || []).map(
              (run) => new TextRun({ ...this.getRunOptions(run), bold: true })
            )
          );
          break;
        case "italic":
          runs.push(
            ...this.inlineNodesToRuns(node.children || []).map(
              (run) => new TextRun({ ...this.getRunOptions(run), italics: true })
            )
          );
          break;
        case "code":
          runs.push(
            new TextRun({
              text: node.content || "",
              font: "Courier New",
              size: 20,
              shading: { fill: "f4f4f4" },
            })
          );
          break;
        case "link":
          runs.push(
            new TextRun({
              text: node.content || "",
              color: "0000FF",
              underline: { type: "single" },
            })
          );
          break;
        case "linebreak":
          runs.push(new TextRun({ break: 1 }));
          break;
        default:
          if (node.content) {
            runs.push(new TextRun({ text: node.content }));
          }
      }
    }

    return runs;
  }

  /**
   * Convert inline nodes to Run array (async version for image support)
   */
  private async inlineNodesToRunsAsync(
    nodes: MarkdownNode[],
    mermaidImages: Map<string, ImageData>
  ): Promise<(TextRun | ImageRun | ExternalHyperlink)[]> {
    const runs: (TextRun | ImageRun | ExternalHyperlink)[] = [];

    for (const node of nodes) {
      switch (node.type) {
        case "text":
          runs.push(new TextRun({ text: node.content || "" }));
          break;
        case "bold":
          runs.push(
            ...this.inlineNodesToRuns(node.children || []).map(
              (run) => new TextRun({ ...this.getRunOptions(run), bold: true })
            )
          );
          break;
        case "italic":
          runs.push(
            ...this.inlineNodesToRuns(node.children || []).map(
              (run) => new TextRun({ ...this.getRunOptions(run), italics: true })
            )
          );
          break;
        case "code":
          runs.push(
            new TextRun({
              text: node.content || "",
              font: "Courier New",
              size: 20,
              shading: { fill: "f4f4f4" },
            })
          );
          break;
        case "link":
          runs.push(
            new ExternalHyperlink({
              link: node.url || "#",
              children: [
                new TextRun({
                  text: node.content || node.url || "",
                  color: "0000FF",
                  underline: { type: "single" },
                }),
              ],
            })
          );
          break;
        case "image":
          const imageRun = await this.createImageRun(node, mermaidImages);
          if (imageRun) {
            runs.push(imageRun);
          } else {
            runs.push(new TextRun({ text: `[Image: ${node.alt || "image"}]` }));
          }
          break;
        case "linebreak":
          runs.push(new TextRun({ break: 1 }));
          break;
        default:
          if (node.content) {
            runs.push(new TextRun({ text: node.content }));
          }
      }
    }

    return runs;
  }

  /**
   * Get run options from an existing TextRun
   * Note: Uses internal structure access as docx library doesn't expose public getters
   */
  private getRunOptions(run: TextRun): Partial<IRunOptions> {
    // Extract text from the run using internal structure
    // The docx library stores options internally but doesn't expose public getters
    const internalRun = run as unknown as { options?: Partial<IRunOptions> };
    const options = internalRun.options;
    if (!options) {
      return { text: "" };
    }
    return {
      text: typeof options.text === "string" ? options.text : "",
      font: options.font,
      size: options.size,
      bold: options.bold,
      italics: options.italics,
    };
  }

  /**
   * Create ImageRun for image nodes
   */
  private async createImageRun(
    node: MarkdownNode,
    mermaidImages: Map<string, ImageData>
  ): Promise<ImageRun | null> {
    const alt = node.alt || "";

    // Check if this is a mermaid placeholder image
    if (alt.startsWith("mermaid:")) {
      const imageId = alt.replace("mermaid:", "");
      const imageData = mermaidImages.get(imageId);

      if (imageData) {
        return new ImageRun({
          data: imageData.buffer,
          transformation: {
            width: imageData.width,
            height: imageData.height,
          },
          type: "png",
        });
      }
    }

    // For external images, try to fetch them
    const url = node.url || "";
    if (url && url.startsWith("http")) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          const buffer = await response.arrayBuffer();
          const contentType = response.headers.get("content-type") || "";
          const type = contentType.includes("png")
            ? "png"
            : contentType.includes("gif")
              ? "gif"
              : "jpg";

          return new ImageRun({
            data: buffer,
            transformation: {
              width: 400,
              height: 300,
            },
            type: type as "png" | "gif" | "jpg" | "bmp",
          });
        }
      } catch (error) {
        // Image fetch failed - silently continue without the image
        void error; // Acknowledge the error without logging
      }
    }

    return null;
  }

  /**
   * Convert standalone image node to DOCX Paragraph
   */
  private async imageToDocx(
    node: MarkdownNode,
    mermaidImages: Map<string, ImageData>
  ): Promise<Paragraph> {
    const imageRun = await this.createImageRun(node, mermaidImages);

    if (imageRun) {
      return new Paragraph({
        children: [imageRun],
        alignment: AlignmentType.CENTER,
        spacing: { before: 120, after: 120 },
      });
    }

    // Fallback: text placeholder for failed images
    return new Paragraph({
      children: [new TextRun({ text: `[Image: ${node.alt || "image"}]`, italics: true })],
      spacing: { after: 120 },
    });
  }

  /**
   * Convert code block node to DOCX Paragraph
   */
  private codeBlockToDocx(node: MarkdownNode): Paragraph {
    const content = node.content || "";
    const language = node.language || "";

    const paragraphOptions: IParagraphOptions = {
      children: [
        new TextRun({
          text: language ? `[${language}]\n` : "",
          font: "Courier New",
          size: 18,
          bold: true,
        }),
        new TextRun({
          text: content,
          font: "Courier New",
          size: 18,
        }),
      ],
      shading: { fill: "f4f4f4" },
      spacing: { before: 120, after: 120 },
      border: {
        top: { style: BorderStyle.SINGLE, size: 1, color: "cccccc" },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: "cccccc" },
        left: { style: BorderStyle.SINGLE, size: 1, color: "cccccc" },
        right: { style: BorderStyle.SINGLE, size: 1, color: "cccccc" },
      },
    };

    return new Paragraph(paragraphOptions);
  }

  /**
   * Convert list node to DOCX Paragraphs
   */
  private listToDocx(node: MarkdownNode): Paragraph[] {
    const items: Paragraph[] = [];
    const isOrdered = node.ordered || false;

    (node.children || []).forEach((item, index) => {
      const bullet = isOrdered ? `${index + 1}. ` : "• ";
      const runs = this.inlineNodesToRuns(item.children || []);

      items.push(
        new Paragraph({
          children: [new TextRun({ text: bullet }), ...runs],
          indent: { left: 720 }, // 0.5 inch indent
          spacing: { after: 60 },
        })
      );
    });

    return items;
  }

  /**
   * Convert blockquote node to DOCX Paragraphs
   */
  private async blockquoteToDocx(
    node: MarkdownNode,
    mermaidImages: Map<string, ImageData>
  ): Promise<Paragraph[]> {
    const paragraphs: Paragraph[] = [];

    for (const child of node.children || []) {
      if (child.type === "paragraph") {
        const runs = await this.inlineNodesToRunsAsync(
          child.children || [],
          mermaidImages
        );

        paragraphs.push(
          new Paragraph({
            children: runs.map((run) => {
              if (run instanceof TextRun) {
                return new TextRun({ ...this.getRunOptions(run), italics: true });
              }
              return run;
            }),
            indent: { left: 720 },
            border: {
              left: { style: BorderStyle.SINGLE, size: 12, color: "cccccc" },
            },
            spacing: { after: 60 },
          })
        );
      }
    }

    return paragraphs;
  }

  /**
   * Convert horizontal rule to DOCX Paragraph
   */
  private horizontalRuleToDocx(): Paragraph {
    return new Paragraph({
      children: [],
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 6, color: "cccccc" },
      },
      spacing: { before: 240, after: 240 },
    });
  }

  /**
   * Convert table node to DOCX Table
   */
  private tableToDocx(node: MarkdownNode): Table {
    const rows: TableRow[] = [];

    for (const rowNode of node.children || []) {
      if (rowNode.type === "tablerow") {
        const cells: TableCell[] = [];

        for (const cellNode of rowNode.children || []) {
          const runs = this.inlineNodesToRuns(cellNode.children || []);
          const isHeader = cellNode.isHeader || false;

          cells.push(
            new TableCell({
              children: [
                new Paragraph({
                  children: isHeader
                    ? runs.map(
                        (run) =>
                          new TextRun({ ...this.getRunOptions(run), bold: true })
                      )
                    : runs,
                }),
              ],
              shading: isHeader ? { fill: "f0f0f0" } : undefined,
            })
          );
        }

        rows.push(new TableRow({ children: cells }));
      }
    }

    return new Table({
      rows,
      width: { size: 100, type: WidthType.PERCENTAGE },
    });
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
   * Save DOCX document to a file
   */
  private async saveDocxFile(doc: Document, filename: string): Promise<void> {
    const fullFilename = `${filename}.docx`;

    // Generate the DOCX blob
    const blob = await Packer.toBlob(doc);

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
        // Delete existing file to overwrite
        await this.app.fileManager.trashFile(existingFile);
      }

      // Convert blob to ArrayBuffer for vault.createBinary
      const arrayBuffer = await blob.arrayBuffer();

      // Create the binary file - vault.createBinary expects ArrayBuffer
      await vault.createBinary(filePath, arrayBuffer);

      return;
    } catch (vaultError) {
      // If vault save fails, silently fall through to browser download as fallback
      void vaultError; // Acknowledge the error without logging
    }

    // Fallback: Browser-based download
    this.downloadDocxFile(blob, fullFilename);
  }

  /**
   * Download DOCX file using browser download API
   */
  private downloadDocxFile(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.addClass("docx-export-download-link");
    link.setCssProps({ display: "none" });

    document.body.appendChild(link);
    link.click();

    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Encode mermaid code to kroki.io URL (public for testing)
   * @param mermaidCode - The mermaid diagram code
   * @returns URL-safe base64 encoded kroki.io PNG URL
   */
  encodeMermaidToKroki(mermaidCode: string): string {
    if (!mermaidCode || mermaidCode.trim().length === 0) {
      return "";
    }
    const encoded = this.encodeBase64Url(mermaidCode);
    return `https://kroki.io/mermaid/png/${encoded}`;
  }

  /**
   * Convert AST to DOCX elements (public for testing)
   * @param ast - Parsed markdown AST nodes
   * @returns Array of Paragraph and Table elements
   */
  convertToDocxElements(ast: MarkdownNode[]): (Paragraph | Table)[] {
    const elements: (Paragraph | Table)[] = [];

    for (const node of ast) {
      switch (node.type) {
        case "heading":
          elements.push(this.headingToDocx(node));
          break;
        case "paragraph":
          // Create synchronous paragraph for testing
          elements.push(
            new Paragraph({
              children: this.inlineNodesToRuns(node.children || []),
              spacing: { after: 120 },
            })
          );
          break;
        case "codeblock":
          elements.push(this.codeBlockToDocx(node));
          break;
        case "list":
          elements.push(...this.listToDocx(node));
          break;
        case "blockquote":
          // Create synchronous blockquote for testing
          for (const child of node.children || []) {
            if (child.type === "paragraph") {
              elements.push(
                new Paragraph({
                  children: this.inlineNodesToRuns(child.children || []).map(
                    (run) =>
                      new TextRun({ ...this.getRunOptions(run), italics: true })
                  ),
                  indent: { left: 720 },
                  border: {
                    left: { style: BorderStyle.SINGLE, size: 12, color: "cccccc" },
                  },
                  spacing: { after: 60 },
                })
              );
            }
          }
          break;
        case "horizontalrule":
          elements.push(this.horizontalRuleToDocx());
          break;
        case "table":
          elements.push(this.tableToDocx(node));
          break;
        default:
          break;
      }
    }

    return elements;
  }

  /**
   * Generate a DOCX document buffer (public for testing)
   * @param markdown - Markdown content to convert
   * @param options - Export options
   * @returns Uint8Array containing the DOCX file data
   */
  async generateDocument(
    markdown: string,
    options: DOCXExportOptions = {}
  ): Promise<Uint8Array> {
    // Handle empty markdown
    if (!markdown || markdown.trim().length === 0) {
      const doc = new Document({
        creator: options.author || "Obsidian AI Assistant",
        title: options.title || "Untitled",
        description: "Exported from Obsidian AI Assistant",
        sections: [{ properties: {}, children: [] }],
      });
      return Packer.toBuffer(doc);
    }

    // Process mermaid diagrams
    const { processedMarkdown, mermaidImages } =
      await this.handleMermaidDiagrams(markdown);

    // Parse markdown to AST
    const ast = this.parseMarkdown(processedMarkdown);

    // Convert AST to DOCX document children
    const docChildren = await this.convertToDocx(ast, mermaidImages);

    // Create the DOCX document
    const doc = new Document({
      creator: options.author || "Obsidian AI Assistant",
      title: options.title || "Untitled",
      description: "Exported from Obsidian AI Assistant",
      sections: [
        {
          properties: {},
          children: docChildren,
        },
      ],
    });

    // Generate and return the buffer
    return Packer.toBuffer(doc);
  }
}
