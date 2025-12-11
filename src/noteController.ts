import {
  App,
  Editor,
  MarkdownView,
  TFile,
  parseYaml,
} from "obsidian";
import { NoteContext, EditorPosition, EditorRange } from "./types";

/**
 * Controller for reading and writing to Obsidian notes
 */
export class NoteController {
  private app: App;
  private lastActiveMarkdownView: MarkdownView | null = null;
  private lastActiveFile: TFile | null = null;

  constructor(app: App) {
    this.app = app;

    // Track the last active markdown view
    this.app.workspace.on("active-leaf-change", (leaf) => {
      if (leaf) {
        const view = leaf.view;
        if (view instanceof MarkdownView && view.file) {
          this.lastActiveMarkdownView = view;
          this.lastActiveFile = view.file;
        }
      }
    });
  }

  // ============================================
  // READ OPERATIONS
  // ============================================

  /**
   * Get the currently active note file
   * Falls back to last active file if current view isn't a markdown view
   */
  public getActiveNote(): TFile | null {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (view?.file) {
      return view.file;
    }
    // Fall back to last active file (e.g., when AI panel is focused)
    return this.lastActiveFile;
  }

  /**
   * Get the active markdown view
   * Falls back to last active view if current view isn't a markdown view
   */
  public getActiveMarkdownView(): MarkdownView | null {
    const currentView = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (currentView) {
      return currentView;
    }
    // Fall back to last active markdown view
    // But verify it's still valid (the leaf might have been closed)
    if (this.lastActiveMarkdownView) {
      // Check if the view is still attached and has a file
      try {
        if (this.lastActiveMarkdownView.file && this.lastActiveMarkdownView.editor) {
          return this.lastActiveMarkdownView;
        }
      } catch {
        // View might have been destroyed
        this.lastActiveMarkdownView = null;
      }
    }
    return null;
  }

  /**
   * Get the editor from the active view
   */
  public getActiveEditor(): Editor | null {
    const view = this.getActiveMarkdownView();
    return view?.editor ?? null;
  }

  /**
   * Force refresh the last active view by finding any open markdown view
   */
  public refreshLastActiveView(): void {
    const leaves = this.app.workspace.getLeavesOfType("markdown");
    for (const leaf of leaves) {
      if (leaf.view instanceof MarkdownView && leaf.view.file) {
        this.lastActiveMarkdownView = leaf.view;
        this.lastActiveFile = leaf.view.file;
        break;
      }
    }
  }

  /**
   * Get the full content of the active note
   */
  public async getActiveNoteContent(): Promise<string> {
    const file = this.getActiveNote();
    if (!file) {
      return "";
    }

    try {
      return await this.app.vault.read(file);
    } catch {
      return "";
    }
  }

  /**
   * Get the path of the active note
   */
  public getActiveNotePath(): string {
    const file = this.getActiveNote();
    return file?.path ?? "";
  }

  /**
   * Get the basename of the active note (without extension)
   */
  public getActiveNoteBasename(): string {
    const file = this.getActiveNote();
    return file?.basename ?? "";
  }

  /**
   * Get the frontmatter/metadata of the active note
   */
  public async getActiveNoteMetadata(): Promise<Record<string, unknown> | null> {
    const content = await this.getActiveNoteContent();
    if (!content) {
      return null;
    }

    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) {
      return null;
    }

    try {
      return parseYaml(frontmatterMatch[1]) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  /**
   * Get the currently selected text
   */
  public getSelection(): string {
    const editor = this.getActiveEditor();
    if (!editor) {
      return "";
    }

    return editor.getSelection();
  }

  /**
   * Get the current cursor position
   */
  public getCursorPosition(): EditorPosition | null {
    const editor = this.getActiveEditor();
    if (!editor) {
      return null;
    }

    const cursor = editor.getCursor();
    return { line: cursor.line, ch: cursor.ch };
  }

  /**
   * Get the selection range
   */
  public getSelectionRange(): EditorRange | null {
    const editor = this.getActiveEditor();
    if (!editor) {
      return null;
    }

    const from = editor.getCursor("from");
    const to = editor.getCursor("to");

    // Check if there's actually a selection
    if (from.line === to.line && from.ch === to.ch) {
      return null;
    }

    return {
      from: { line: from.line, ch: from.ch },
      to: { line: to.line, ch: to.ch },
    };
  }

  /**
   * Get the visible range of lines in the editor
   */
  public getVisibleRange(): { start: number; end: number } | null {
    const editor = this.getActiveEditor();
    if (!editor) {
      return null;
    }

    // Use cursor position as a reference point for visible area
    const cursor = editor.getCursor();
    const lineCount = editor.lineCount();

    // Estimate visible range around cursor (approximately 30 lines visible)
    const visibleLines = 30;
    const halfVisible = Math.floor(visibleLines / 2);
    const startLine = Math.max(0, cursor.line - halfVisible);
    const endLine = Math.min(lineCount - 1, cursor.line + halfVisible);

    return { start: startLine, end: endLine };
  }

  /**
   * Get complete note context for AI requests
   */
  public async getNoteContext(): Promise<NoteContext | null> {
    const file = this.getActiveNote();
    if (!file) {
      return null;
    }

    const content = await this.getActiveNoteContent();
    const frontmatter = await this.getActiveNoteMetadata();
    const selection = this.getSelection();
    const selectionRange = this.getSelectionRange();
    const cursorPosition = this.getCursorPosition();

    return {
      path: file.path,
      basename: file.basename,
      content,
      frontmatter,
      selection: selection || null,
      selectionRange: selectionRange
        ? {
            startLine: selectionRange.from.line,
            endLine: selectionRange.to.line,
            startCh: selectionRange.from.ch,
            endCh: selectionRange.to.ch,
          }
        : null,
      cursorPosition,
    };
  }

  // ============================================
  // WRITE OPERATIONS
  // ============================================

  /**
   * Insert text at the current cursor position
   */
  public insertAtCursor(text: string): boolean {
    const editor = this.getActiveEditor();
    if (!editor) {
      return false;
    }

    const cursor = editor.getCursor();
    editor.replaceRange(text, cursor);
    return true;
  }

  /**
   * Replace the current selection with new text
   */
  public replaceSelection(text: string): boolean {
    const editor = this.getActiveEditor();
    if (!editor) {
      return false;
    }

    editor.replaceSelection(text);
    return true;
  }

  /**
   * Replace text in a specific range
   */
  public replaceRange(
    text: string,
    startLine: number,
    startCh: number,
    endLine: number,
    endCh: number
  ): boolean {
    const editor = this.getActiveEditor();
    if (!editor) {
      return false;
    }

    editor.replaceRange(
      text,
      { line: startLine, ch: startCh },
      { line: endLine, ch: endCh }
    );
    return true;
  }

  /**
   * Append text to the end of the note
   */
  public appendToNote(text: string): boolean {
    const editor = this.getActiveEditor();
    if (!editor) {
      return false;
    }

    const lineCount = editor.lineCount();
    const lastLine = lineCount - 1;
    const lastLineLength = editor.getLine(lastLine).length;

    // Add newline if the note doesn't end with one
    const prefix = lastLineLength > 0 ? "\n\n" : "\n";
    editor.replaceRange(prefix + text, { line: lastLine, ch: lastLineLength });
    return true;
  }

  /**
   * Prepend text to the beginning of the note (after frontmatter if present)
   */
  public prependToNote(text: string): boolean {
    const editor = this.getActiveEditor();
    if (!editor) {
      return false;
    }

    const content = editor.getValue();
    const frontmatterMatch = content.match(/^---\n[\s\S]*?\n---\n?/);

    let insertLine = 0;
    if (frontmatterMatch) {
      // Count lines in frontmatter
      insertLine = frontmatterMatch[0].split("\n").length - 1;
    }

    editor.replaceRange(text + "\n\n", { line: insertLine, ch: 0 });
    return true;
  }

  /**
   * Replace the entire content of the note
   */
  public replaceEntireContent(text: string): boolean {
    const editor = this.getActiveEditor();
    if (!editor) {
      return false;
    }

    const lineCount = editor.lineCount();
    const lastLine = lineCount - 1;
    const lastLineLength = editor.getLine(lastLine).length;

    editor.replaceRange(
      text,
      { line: 0, ch: 0 },
      { line: lastLine, ch: lastLineLength }
    );
    return true;
  }

  /**
   * Insert a heading at the cursor position
   */
  public insertHeading(text: string, level: number): boolean {
    const prefix = "#".repeat(Math.min(Math.max(level, 1), 6));
    return this.insertAtCursor(`${prefix} ${text}\n\n`);
  }

  /**
   * Insert a code block at the cursor position
   */
  public insertCodeBlock(code: string, language: string = ""): boolean {
    const block = `\`\`\`${language}\n${code}\n\`\`\`\n`;
    return this.insertAtCursor(block);
  }

  /**
   * Insert a Mermaid diagram block
   */
  public insertMermaid(code: string): boolean {
    return this.insertCodeBlock(code, "mermaid");
  }

  // ============================================
  // SMART EDIT OPERATIONS
  // ============================================

  /**
   * Find and replace text in the note
   */
  public findAndReplace(
    find: string,
    replace: string,
    replaceAll: boolean = false
  ): number {
    const editor = this.getActiveEditor();
    if (!editor) {
      return 0;
    }

    const content = editor.getValue();
    let count = 0;

    if (replaceAll) {
      const regex = new RegExp(this.escapeRegex(find), "g");
      const matches = content.match(regex);
      count = matches?.length ?? 0;

      if (count > 0) {
        const newContent = content.replace(regex, replace);
        this.replaceEntireContent(newContent);
      }
    } else {
      const index = content.indexOf(find);
      if (index !== -1) {
        const newContent =
          content.substring(0, index) +
          replace +
          content.substring(index + find.length);
        this.replaceEntireContent(newContent);
        count = 1;
      }
    }

    return count;
  }

  /**
   * Find a heading in the note and return its line number
   */
  private findHeadingLine(heading: string): number {
    const editor = this.getActiveEditor();
    if (!editor) {
      return -1;
    }

    const content = editor.getValue();
    const lines = content.split("\n");
    const normalizedHeading = heading.replace(/^#+\s*/, "").trim().toLowerCase();

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith("#")) {
        const lineHeading = line.replace(/^#+\s*/, "").trim().toLowerCase();
        if (lineHeading === normalizedHeading) {
          return i;
        }
      }
    }

    return -1;
  }

  /**
   * Find the end of a section (line before next heading or end of file)
   */
  private findSectionEnd(startLine: number): number {
    const editor = this.getActiveEditor();
    if (!editor) {
      return -1;
    }

    const lineCount = editor.lineCount();
    const startHeadingLevel = this.getHeadingLevel(editor.getLine(startLine));

    for (let i = startLine + 1; i < lineCount; i++) {
      const line = editor.getLine(i);
      if (line.startsWith("#")) {
        const level = this.getHeadingLevel(line);
        if (level <= startHeadingLevel) {
          return i - 1;
        }
      }
    }

    return lineCount - 1;
  }

  /**
   * Get the heading level from a line
   */
  private getHeadingLevel(line: string): number {
    const match = line.match(/^(#+)/);
    return match ? match[1].length : 0;
  }

  /**
   * Insert content after a specific heading
   */
  public insertAfterHeading(heading: string, text: string): boolean {
    const editor = this.getActiveEditor();
    if (!editor) {
      return false;
    }

    const headingLine = this.findHeadingLine(heading);
    if (headingLine === -1) {
      return false;
    }

    // Insert after the heading line
    const insertLine = headingLine + 1;
    editor.replaceRange("\n" + text + "\n", { line: insertLine, ch: 0 });
    return true;
  }

  /**
   * Update the content of a section under a heading
   */
  public updateSection(heading: string, newContent: string): boolean {
    const editor = this.getActiveEditor();
    if (!editor) {
      return false;
    }

    const headingLine = this.findHeadingLine(heading);
    if (headingLine === -1) {
      return false;
    }

    const sectionEnd = this.findSectionEnd(headingLine);
    const headingText = editor.getLine(headingLine);

    // Replace from heading line to section end
    this.replaceRange(
      headingText + "\n\n" + newContent + "\n",
      headingLine,
      0,
      sectionEnd,
      editor.getLine(sectionEnd).length
    );

    return true;
  }

  /**
   * Append content to a specific section
   */
  public appendToSection(heading: string, text: string): boolean {
    const editor = this.getActiveEditor();
    if (!editor) {
      return false;
    }

    const headingLine = this.findHeadingLine(heading);
    if (headingLine === -1) {
      return false;
    }

    const sectionEnd = this.findSectionEnd(headingLine);
    const lastLineLength = editor.getLine(sectionEnd).length;

    editor.replaceRange("\n\n" + text, { line: sectionEnd, ch: lastLineLength });
    return true;
  }

  /**
   * Escape special regex characters
   */
  private escapeRegex(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Check if there's an active note
   */
  public hasActiveNote(): boolean {
    return this.getActiveNote() !== null;
  }

  /**
   * Check if there's a selection in the editor
   */
  public hasSelection(): boolean {
    return this.getSelection().length > 0;
  }

  /**
   * Focus the editor
   */
  public focusEditor(): void {
    const view = this.getActiveMarkdownView();
    if (view) {
      view.editor.focus();
    }
  }

  /**
   * Scroll to a specific line
   */
  public scrollToLine(line: number): void {
    const editor = this.getActiveEditor();
    if (editor) {
      editor.scrollIntoView({ from: { line, ch: 0 }, to: { line, ch: 0 } }, true);
    }
  }

  /**
   * Set cursor position
   */
  public setCursor(line: number, ch: number): void {
    const editor = this.getActiveEditor();
    if (editor) {
      editor.setCursor({ line, ch });
    }
  }

  /**
   * Select a range of text
   */
  public setSelection(
    fromLine: number,
    fromCh: number,
    toLine: number,
    toCh: number
  ): void {
    const editor = this.getActiveEditor();
    if (editor) {
      editor.setSelection(
        { line: fromLine, ch: fromCh },
        { line: toLine, ch: toCh }
      );
    }
  }
}
