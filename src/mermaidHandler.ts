import { MermaidBlock } from "./types";

/**
 * Handler for detecting and processing Mermaid diagrams in AI responses
 */
export class MermaidHandler {
  // Regex pattern to match mermaid code blocks
  private static readonly MERMAID_PATTERN = /```mermaid\n([\s\S]*?)```/g;

  // Valid Mermaid diagram types
  private static readonly DIAGRAM_TYPES = [
    "flowchart",
    "graph",
    "sequenceDiagram",
    "classDiagram",
    "stateDiagram",
    "stateDiagram-v2",
    "erDiagram",
    "gantt",
    "pie",
    "journey",
    "gitGraph",
    "mindmap",
    "timeline",
    "quadrantChart",
    "xychart-beta",
    "block-beta",
    "sankey-beta",
  ];

  /**
   * Extract all Mermaid blocks from text
   */
  public extractMermaidBlocks(text: string): MermaidBlock[] {
    const blocks: MermaidBlock[] = [];
    const pattern = new RegExp(MermaidHandler.MERMAID_PATTERN.source, "g");

    let match;
    while ((match = pattern.exec(text)) !== null) {
      blocks.push({
        code: match[1].trim(),
        startIndex: match.index,
        endIndex: match.index + match[0].length,
      });
    }

    return blocks;
  }

  /**
   * Check if text contains any Mermaid blocks
   */
  public hasMermaid(text: string): boolean {
    return MermaidHandler.MERMAID_PATTERN.test(text);
  }

  /**
   * Validate Mermaid syntax (basic validation)
   */
  public validateMermaid(code: string): {
    valid: boolean;
    diagramType: string | null;
    error: string | null;
  } {
    const trimmedCode = code.trim();

    if (!trimmedCode) {
      return {
        valid: false,
        diagramType: null,
        error: "Empty Mermaid code",
      };
    }

    // Check for valid diagram type
    const firstLine = trimmedCode.split("\n")[0].trim().toLowerCase();
    let diagramType: string | null = null;

    for (const type of MermaidHandler.DIAGRAM_TYPES) {
      if (firstLine.startsWith(type.toLowerCase())) {
        diagramType = type;
        break;
      }
    }

    if (!diagramType) {
      return {
        valid: false,
        diagramType: null,
        error: `Unknown diagram type. First line: "${firstLine}"`,
      };
    }

    // Basic syntax checks
    const openBrackets = (trimmedCode.match(/\[/g) || []).length;
    const closeBrackets = (trimmedCode.match(/\]/g) || []).length;
    const openParens = (trimmedCode.match(/\(/g) || []).length;
    const closeParens = (trimmedCode.match(/\)/g) || []).length;
    const openBraces = (trimmedCode.match(/\{/g) || []).length;
    const closeBraces = (trimmedCode.match(/\}/g) || []).length;

    if (openBrackets !== closeBrackets) {
      return {
        valid: false,
        diagramType,
        error: "Mismatched brackets []",
      };
    }

    if (openParens !== closeParens) {
      return {
        valid: false,
        diagramType,
        error: "Mismatched parentheses ()",
      };
    }

    if (openBraces !== closeBraces) {
      return {
        valid: false,
        diagramType,
        error: "Mismatched braces {}",
      };
    }

    return {
      valid: true,
      diagramType,
      error: null,
    };
  }

  /**
   * Sanitize Mermaid node labels by removing special characters that break Obsidian rendering
   * Obsidian's Mermaid renderer is VERY strict about special characters in node labels
   */
  public sanitizeMermaidCode(code: string): string {
    const lines = code.split('\n');
    const sanitizedLines: string[] = [];

    for (const line of lines) {
      let sanitizedLine = line;

      // Match node definitions with labels in brackets [], parentheses (), or braces {}
      // Pattern: nodeId[label], nodeId(label), nodeId{label}, nodeId([label]), nodeId[[label]], etc.
      const nodePatterns = [
        /(\w+)\s*\[([^\]]+)\]/g,      // A[label]
        /(\w+)\s*\(([^)]+)\)/g,       // A(label)
        /(\w+)\s*\{([^}]+)\}/g,       // A{label}
        /(\w+)\s*\[\[([^\]]+)\]\]/g,  // A[[label]]
        /(\w+)\s*\[\(([^)]+)\)\]/g,   // A[(label)]
        /(\w+)\s*\(\[([^\]]+)\]\)/g,  // A([label])
        /(\w+)\s*\(\(([^)]+)\)\)/g,   // A((label))
        /(\w+)\s*\[\{([^}]+)\}\]/g,   // A[{label}]
      ];

      for (const pattern of nodePatterns) {
        sanitizedLine = sanitizedLine.replace(pattern, (match, nodeId, label) => {
          const cleanLabel = this.sanitizeNodeLabel(label);
          // Preserve the original bracket type
          const bracketStart = match.indexOf(nodeId) + nodeId.length;
          const brackets = match.substring(bracketStart).replace(label, cleanLabel);
          return nodeId + brackets;
        });
      }

      // Also sanitize edge labels |label|
      sanitizedLine = sanitizedLine.replace(/\|([^|]+)\|/g, (match, label) => {
        return `|${this.sanitizeNodeLabel(label)}|`;
      });

      sanitizedLines.push(sanitizedLine);
    }

    return sanitizedLines.join('\n');
  }

  /**
   * Sanitize a single node label - remove or replace problematic characters
   */
  private sanitizeNodeLabel(label: string): string {
    let clean = label;

    // Remove backticks completely
    clean = clean.replace(/`/g, '');

    // Replace colons with hyphens or remove
    clean = clean.replace(/:\s*/g, ' - ');
    clean = clean.replace(/:/g, ' ');

    // Replace quotes with nothing
    clean = clean.replace(/["']/g, '');

    // Replace parentheses with spaces
    clean = clean.replace(/[()]/g, ' ');

    // Replace brackets with spaces
    clean = clean.replace(/[[\]]/g, ' ');

    // Replace braces with spaces
    clean = clean.replace(/[{}]/g, ' ');

    // Replace other problematic characters
    clean = clean.replace(/[;|<>&@#$%^*+=\\]/g, ' ');

    // Clean up multiple spaces
    clean = clean.replace(/\s+/g, ' ').trim();

    return clean;
  }

  /**
   * Format Mermaid code for insertion into a note (with sanitization)
   */
  public formatForInsertion(code: string): string {
    const sanitizedCode = this.sanitizeMermaidCode(code);
    const trimmedCode = sanitizedCode.trim();
    return `\`\`\`mermaid\n${trimmedCode}\n\`\`\``;
  }

  /**
   * Format Mermaid code for insertion (legacy method without sanitization)
   */
  public formatForInsertionRaw(code: string): string {
    const trimmedCode = code.trim();
    return `\`\`\`mermaid\n${trimmedCode}\n\`\`\``;
  }

  /**
   * Extract just the Mermaid code strings from text (sanitized for Obsidian compatibility)
   */
  public extractMermaidCode(text: string): string[] {
    const blocks = this.extractMermaidBlocks(text);
    return blocks.map((block) => this.sanitizeMermaidCode(block.code));
  }

  /**
   * Extract Mermaid code strings without sanitization (raw)
   */
  public extractMermaidCodeRaw(text: string): string[] {
    const blocks = this.extractMermaidBlocks(text);
    return blocks.map((block) => block.code);
  }

  /**
   * Get the diagram type from Mermaid code
   */
  public getDiagramType(code: string): string | null {
    const firstLine = code.trim().split("\n")[0].trim().toLowerCase();

    for (const type of MermaidHandler.DIAGRAM_TYPES) {
      if (firstLine.startsWith(type.toLowerCase())) {
        return type;
      }
    }

    return null;
  }

  /**
   * Create a simple flowchart template
   */
  public createFlowchartTemplate(
    title: string,
    nodes: Array<{ id: string; label: string }>,
    edges: Array<{ from: string; to: string; label?: string }>
  ): string {
    const lines: string[] = [`flowchart TD`];

    // Add nodes
    for (const node of nodes) {
      lines.push(`    ${node.id}[${node.label}]`);
    }

    // Add edges
    for (const edge of edges) {
      const label = edge.label ? `|${edge.label}|` : "";
      lines.push(`    ${edge.from} -->${label} ${edge.to}`);
    }

    return lines.join("\n");
  }

  /**
   * Create a simple sequence diagram template
   */
  public createSequenceTemplate(
    participants: string[],
    messages: Array<{ from: string; to: string; message: string; type?: string }>
  ): string {
    const lines: string[] = [`sequenceDiagram`];

    // Add participants
    for (const participant of participants) {
      lines.push(`    participant ${participant}`);
    }

    // Add messages
    for (const msg of messages) {
      const arrow = msg.type === "async" ? "->>" : "->>";
      lines.push(`    ${msg.from}${arrow}${msg.to}: ${msg.message}`);
    }

    return lines.join("\n");
  }

  /**
   * Create a simple class diagram template
   */
  public createClassTemplate(
    classes: Array<{
      name: string;
      attributes?: string[];
      methods?: string[];
    }>,
    relationships: Array<{
      from: string;
      to: string;
      type: "inheritance" | "composition" | "aggregation" | "association";
    }>
  ): string {
    const lines: string[] = [`classDiagram`];

    // Add classes
    for (const cls of classes) {
      lines.push(`    class ${cls.name} {`);
      if (cls.attributes) {
        for (const attr of cls.attributes) {
          lines.push(`        ${attr}`);
        }
      }
      if (cls.methods) {
        for (const method of cls.methods) {
          lines.push(`        ${method}()`);
        }
      }
      lines.push(`    }`);
    }

    // Add relationships
    const relationshipSymbols: Record<string, string> = {
      inheritance: "<|--",
      composition: "*--",
      aggregation: "o--",
      association: "--",
    };

    for (const rel of relationships) {
      const symbol = relationshipSymbols[rel.type] || "--";
      lines.push(`    ${rel.from} ${symbol} ${rel.to}`);
    }

    return lines.join("\n");
  }

  /**
   * Create a pie chart template
   */
  public createPieTemplate(
    title: string,
    data: Array<{ label: string; value: number }>
  ): string {
    const lines: string[] = [`pie title ${title}`];

    for (const item of data) {
      lines.push(`    "${item.label}" : ${item.value}`);
    }

    return lines.join("\n");
  }

  /**
   * Create a gantt chart template
   */
  public createGanttTemplate(
    title: string,
    sections: Array<{
      name: string;
      tasks: Array<{ name: string; duration: string; after?: string }>;
    }>
  ): string {
    const lines: string[] = [
      `gantt`,
      `    title ${title}`,
      `    dateFormat YYYY-MM-DD`,
    ];

    for (const section of sections) {
      lines.push(`    section ${section.name}`);
      for (const task of section.tasks) {
        const after = task.after ? `, after ${task.after}` : "";
        lines.push(`    ${task.name} :${after} ${task.duration}`);
      }
    }

    return lines.join("\n");
  }

  /**
   * Replace Mermaid blocks in text with placeholders
   */
  public replaceMermaidWithPlaceholders(
    text: string
  ): { text: string; blocks: MermaidBlock[] } {
    const blocks = this.extractMermaidBlocks(text);
    let modifiedText = text;
    let offset = 0;

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      const placeholder = `[MERMAID_DIAGRAM_${i}]`;
      const originalLength = block.endIndex - block.startIndex;

      modifiedText =
        modifiedText.substring(0, block.startIndex - offset) +
        placeholder +
        modifiedText.substring(block.endIndex - offset);

      offset += originalLength - placeholder.length;
    }

    return { text: modifiedText, blocks };
  }

  /**
   * Get supported diagram types
   */
  public static getSupportedDiagramTypes(): string[] {
    return [...MermaidHandler.DIAGRAM_TYPES];
  }
}
