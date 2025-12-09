import { NoteController } from "./noteController";
import { EditCommand, EditAction, EditCommandParams } from "./types";

/**
 * Parser and executor for AI edit commands
 */
export class EditProtocol {
  private noteController: NoteController;

  // Markers for edit commands in AI responses
  private static readonly EDIT_START = "<<<EDIT_START>>>";
  private static readonly EDIT_END = "<<<EDIT_END>>>";

  constructor(noteController: NoteController) {
    this.noteController = noteController;
  }

  /**
   * Parse edit commands from AI response text
   */
  public parseEditCommands(response: string): EditCommand[] {
    const commands: EditCommand[] = [];
    const pattern = new RegExp(
      `${EditProtocol.EDIT_START}\\s*([\\s\\S]*?)\\s*${EditProtocol.EDIT_END}`,
      "g"
    );

    let match;
    while ((match = pattern.exec(response)) !== null) {
      try {
        const jsonStr = match[1].trim();
        const parsed = JSON.parse(jsonStr);

        if (this.isValidEditCommand(parsed)) {
          commands.push(parsed as EditCommand);
        }
      } catch (error) {
        console.error("Failed to parse edit command:", error);
        // Continue to next match
      }
    }

    return commands;
  }

  /**
   * Check if a parsed object is a valid edit command
   */
  private isValidEditCommand(obj: unknown): obj is EditCommand {
    if (!obj || typeof obj !== "object") {
      return false;
    }

    const command = obj as Record<string, unknown>;

    if (!command.action || typeof command.action !== "string") {
      return false;
    }

    const validActions: EditAction[] = [
      "replace_selection",
      "insert_at_cursor",
      "replace_range",
      "find_replace",
      "update_section",
      "append",
      "prepend",
      "replace_all",
      "insert_after_heading",
    ];

    if (!validActions.includes(command.action as EditAction)) {
      return false;
    }

    if (!command.params || typeof command.params !== "object") {
      return false;
    }

    return true;
  }

  /**
   * Execute a single edit command
   */
  public async executeCommand(command: EditCommand): Promise<{
    success: boolean;
    message: string;
  }> {
    const { action, params } = command;

    try {
      switch (action) {
        case "replace_selection":
          return this.executeReplaceSelection(params);

        case "insert_at_cursor":
          return this.executeInsertAtCursor(params);

        case "replace_range":
          return this.executeReplaceRange(params);

        case "find_replace":
          return this.executeFindReplace(params);

        case "update_section":
          return this.executeUpdateSection(params);

        case "append":
          return this.executeAppend(params);

        case "prepend":
          return this.executePrepend(params);

        case "replace_all":
          return this.executeReplaceAll(params);

        case "insert_after_heading":
          return this.executeInsertAfterHeading(params);

        default:
          return {
            success: false,
            message: `Unknown action: ${action}`,
          };
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Execute multiple commands in sequence
   */
  public async executeCommands(
    commands: EditCommand[]
  ): Promise<Array<{ command: EditCommand; success: boolean; message: string }>> {
    const results: Array<{
      command: EditCommand;
      success: boolean;
      message: string;
    }> = [];

    for (const command of commands) {
      const result = await this.executeCommand(command);
      results.push({
        command,
        success: result.success,
        message: result.message,
      });

      // Stop on first failure
      if (!result.success) {
        break;
      }
    }

    return results;
  }

  // ============================================
  // COMMAND EXECUTORS
  // ============================================

  private executeReplaceSelection(params: EditCommandParams): {
    success: boolean;
    message: string;
  } {
    const text = params.text ?? params.content ?? "";

    if (!this.noteController.hasSelection()) {
      return {
        success: false,
        message: "No text selected to replace",
      };
    }

    const result = this.noteController.replaceSelection(text);
    return {
      success: result,
      message: result ? "Selection replaced" : "Failed to replace selection",
    };
  }

  private executeInsertAtCursor(params: EditCommandParams): {
    success: boolean;
    message: string;
  } {
    const text = params.text ?? params.content ?? "";

    if (!this.noteController.hasActiveNote()) {
      return {
        success: false,
        message: "No active note",
      };
    }

    const result = this.noteController.insertAtCursor(text);
    return {
      success: result,
      message: result ? "Text inserted at cursor" : "Failed to insert text",
    };
  }

  private executeReplaceRange(params: EditCommandParams): {
    success: boolean;
    message: string;
  } {
    const text = params.text ?? params.content ?? "";
    const startLine = params.startLine;
    const endLine = params.endLine;

    if (startLine === undefined || endLine === undefined) {
      return {
        success: false,
        message: "Start and end lines are required for replace_range",
      };
    }

    // Get the line lengths to determine the full range
    const editor = this.noteController.getActiveEditor();
    if (!editor) {
      return {
        success: false,
        message: "No active editor",
      };
    }

    const endLineLength = editor.getLine(endLine)?.length ?? 0;

    const result = this.noteController.replaceRange(
      text,
      startLine,
      0,
      endLine,
      endLineLength
    );

    return {
      success: result,
      message: result
        ? `Replaced lines ${startLine}-${endLine}`
        : "Failed to replace range",
    };
  }

  private async executeFindReplace(params: EditCommandParams): Promise<{
    success: boolean;
    message: string;
  }> {
    const find = params.find;
    const replace = params.replace ?? "";
    const replaceAll = params.all ?? false;

    if (!find) {
      return {
        success: false,
        message: "Find text is required for find_replace",
      };
    }

    const count = await this.noteController.findAndReplace(
      find,
      replace,
      replaceAll
    );

    if (count === 0) {
      return {
        success: false,
        message: `Text "${find}" not found`,
      };
    }

    return {
      success: true,
      message: `Replaced ${count} occurrence(s)`,
    };
  }

  private async executeUpdateSection(params: EditCommandParams): Promise<{
    success: boolean;
    message: string;
  }> {
    const heading = params.heading;
    const content = params.content ?? params.text ?? "";

    if (!heading) {
      return {
        success: false,
        message: "Heading is required for update_section",
      };
    }

    const result = await this.noteController.updateSection(heading, content);

    return {
      success: result,
      message: result
        ? `Updated section "${heading}"`
        : `Section "${heading}" not found`,
    };
  }

  private async executeAppend(params: EditCommandParams): Promise<{
    success: boolean;
    message: string;
  }> {
    const text = params.text ?? params.content ?? "";

    const result = await this.noteController.appendToNote(text);

    return {
      success: result,
      message: result ? "Content appended to note" : "Failed to append content",
    };
  }

  private async executePrepend(params: EditCommandParams): Promise<{
    success: boolean;
    message: string;
  }> {
    const text = params.text ?? params.content ?? "";

    const result = await this.noteController.prependToNote(text);

    return {
      success: result,
      message: result ? "Content prepended to note" : "Failed to prepend content",
    };
  }

  private async executeReplaceAll(params: EditCommandParams): Promise<{
    success: boolean;
    message: string;
  }> {
    const content = params.content ?? params.text ?? "";

    const result = await this.noteController.replaceEntireContent(content);

    return {
      success: result,
      message: result ? "Note content replaced" : "Failed to replace content",
    };
  }

  private async executeInsertAfterHeading(params: EditCommandParams): Promise<{
    success: boolean;
    message: string;
  }> {
    const heading = params.heading;
    const text = params.text ?? params.content ?? "";

    if (!heading) {
      return {
        success: false,
        message: "Heading is required for insert_after_heading",
      };
    }

    const result = await this.noteController.insertAfterHeading(heading, text);

    return {
      success: result,
      message: result
        ? `Content inserted after "${heading}"`
        : `Heading "${heading}" not found`,
    };
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Check if response contains edit commands
   */
  public hasEditCommands(response: string): boolean {
    return (
      response.includes(EditProtocol.EDIT_START) &&
      response.includes(EditProtocol.EDIT_END)
    );
  }

  /**
   * Extract the display text (without edit command blocks) from a response
   */
  public getDisplayText(response: string): string {
    const pattern = new RegExp(
      `${EditProtocol.EDIT_START}[\\s\\S]*?${EditProtocol.EDIT_END}`,
      "g"
    );

    return response.replace(pattern, "").trim();
  }

  /**
   * Generate a preview of what changes will be made
   */
  public generatePreview(command: EditCommand): string {
    const { action, params } = command;

    switch (action) {
      case "replace_selection":
        return `Replace selection with: "${this.truncate(params.text ?? params.content ?? "")}"`;

      case "insert_at_cursor":
        return `Insert at cursor: "${this.truncate(params.text ?? params.content ?? "")}"`;

      case "replace_range":
        return `Replace lines ${params.startLine}-${params.endLine}`;

      case "find_replace":
        return `Replace "${params.find}" with "${params.replace}"${params.all ? " (all occurrences)" : ""}`;

      case "update_section":
        return `Update section "${params.heading}"`;

      case "append":
        return `Append to note: "${this.truncate(params.text ?? params.content ?? "")}"`;

      case "prepend":
        return `Prepend to note: "${this.truncate(params.text ?? params.content ?? "")}"`;

      case "replace_all":
        return "Replace entire note content";

      case "insert_after_heading":
        return `Insert after "${params.heading}": "${this.truncate(params.text ?? params.content ?? "")}"`;

      default:
        return `Unknown action: ${action}`;
    }
  }

  /**
   * Truncate text for display
   */
  private truncate(text: string, maxLength: number = 50): string {
    if (text.length <= maxLength) {
      return text;
    }
    return text.substring(0, maxLength) + "...";
  }

  /**
   * Get the edit command markers for documentation
   */
  public static getMarkers(): { start: string; end: string } {
    return {
      start: EditProtocol.EDIT_START,
      end: EditProtocol.EDIT_END,
    };
  }
}
