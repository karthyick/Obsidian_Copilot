import { NoteController } from "./noteController";
import { NoteContext, ChatMessage, LLMMessage } from "./types";
import { EditProtocol } from "./editProtocol";

/**
 * Builds context for AI requests
 */
export class ContextBuilder {
  private noteController: NoteController;

  // Maximum tokens to allow for note content (rough estimate: 4 chars = 1 token)
  private static readonly MAX_NOTE_TOKENS = 8000;
  private static readonly CHARS_PER_TOKEN = 4;
  private static readonly MAX_NOTE_CHARS =
    ContextBuilder.MAX_NOTE_TOKENS * ContextBuilder.CHARS_PER_TOKEN;

  constructor(noteController: NoteController) {
    this.noteController = noteController;
  }

  /**
   * Build the complete system prompt
   */
  public buildSystemPrompt(customPrompt?: string): string {
    if (customPrompt && customPrompt.trim()) {
      return customPrompt;
    }

    return this.getDefaultSystemPrompt();
  }

  /**
   * Get the default system prompt
   */
  private getDefaultSystemPrompt(): string {
    const markers = EditProtocol.getMarkers();

    return `You are an AI assistant integrated into Obsidian, a markdown note-taking application.

## Your Capabilities:
1. READ the currently active note (provided in context)
2. EDIT the note using structured edit commands
3. GENERATE Mermaid diagrams
4. ANSWER questions about the note content
5. HELP with writing, formatting, and organizing

## Edit Command Protocol:
When the user asks you to modify, update, edit, change, add to, or rewrite any part of the note, you MUST use edit commands.

Format:
${markers.start}
{"action": "action_name", "params": {...}}
${markers.end}

Available actions:
- replace_selection: Replace currently selected text
  params: {"text": "new text"}

- insert_at_cursor: Insert at cursor position
  params: {"text": "text to insert"}

- find_replace: Find and replace text
  params: {"find": "text to find", "replace": "replacement", "all": true/false}

- update_section: Replace content under a heading
  params: {"heading": "Section Name", "content": "new section content"}

- append: Add to end of note
  params: {"text": "text to append"}

- prepend: Add to beginning of note (after frontmatter)
  params: {"text": "text to prepend"}

- replace_all: Replace entire note content
  params: {"content": "complete new note content"}

- insert_after_heading: Insert content after a specific heading
  params: {"heading": "Heading Name", "text": "content to insert"}

- replace_range: Replace specific lines
  params: {"text": "new text", "startLine": 0, "endLine": 5}

## Important Rules:
1. ALWAYS use edit commands for modifications - never just show the text without the command
2. For Mermaid diagrams, use \`\`\`mermaid code blocks
3. Preserve existing formatting unless asked to change it
4. Be concise in explanations, thorough in edits
5. If unsure what to edit, ask for clarification
6. When replacing or updating, include the COMPLETE new content
7. For find_replace, use exact text matches

## Response Format:
- Explain what you're doing briefly
- Include the edit command block if making changes
- The edit command will be parsed and executed by the plugin

## Examples:

User: "Add a conclusion to my note"
Response: I'll add a conclusion section to your note.

${markers.start}
{"action": "append", "params": {"text": "## Conclusion\\n\\nIn summary, this note covers the key points discussed above."}}
${markers.end}

User: "Fix the typo in the word 'recieve'"
Response: I'll fix that typo for you.

${markers.start}
{"action": "find_replace", "params": {"find": "recieve", "replace": "receive", "all": true}}
${markers.end}

User: "Make the selected text bold"
Response: I'll make the selected text bold.

${markers.start}
{"action": "replace_selection", "params": {"text": "**your selected text**"}}
${markers.end}`;
  }

  /**
   * Build context message including note content
   */
  public async buildContextMessage(
    userMessage: string,
    includeNoteContext: boolean
  ): Promise<string> {
    if (!includeNoteContext) {
      return userMessage;
    }

    const noteContext = await this.noteController.getNoteContext();
    if (!noteContext) {
      return userMessage;
    }

    const contextParts: string[] = [];

    // Add note information
    contextParts.push("=== CURRENT NOTE CONTEXT ===");
    contextParts.push(`Path: ${noteContext.path}`);

    // Add frontmatter if present
    if (noteContext.frontmatter) {
      contextParts.push("\nFrontmatter:");
      contextParts.push("```yaml");
      contextParts.push(JSON.stringify(noteContext.frontmatter, null, 2));
      contextParts.push("```");
    }

    // Add note content (potentially truncated)
    contextParts.push("\nNote Content:");
    contextParts.push("```markdown");
    contextParts.push(this.truncateContent(noteContext.content));
    contextParts.push("```");

    // Add selection info if present
    if (noteContext.selection && noteContext.selectionRange) {
      contextParts.push(
        `\nUser Selection (Lines ${noteContext.selectionRange.startLine + 1}-${noteContext.selectionRange.endLine + 1}):`
      );
      contextParts.push("```");
      contextParts.push(noteContext.selection);
      contextParts.push("```");
    }

    // Add cursor info
    if (noteContext.cursorPosition) {
      contextParts.push(
        `\nCursor Position: Line ${noteContext.cursorPosition.line + 1}, Column ${noteContext.cursorPosition.ch + 1}`
      );
    }

    contextParts.push("=== END CONTEXT ===\n");
    contextParts.push("User Request:");
    contextParts.push(userMessage);

    return contextParts.join("\n");
  }

  /**
   * Truncate content if it exceeds the maximum length
   */
  private truncateContent(content: string): string {
    if (content.length <= ContextBuilder.MAX_NOTE_CHARS) {
      return content;
    }

    const halfLength = Math.floor(ContextBuilder.MAX_NOTE_CHARS / 2);
    const firstHalf = content.substring(0, halfLength);
    const secondHalf = content.substring(content.length - halfLength);

    return `${firstHalf}\n\n[...truncated ${content.length - ContextBuilder.MAX_NOTE_CHARS} characters...]\n\n${secondHalf}`;
  }

  /**
   * Convert chat history to LLM message format
   */
  public convertToLLMMessages(
    chatHistory: ChatMessage[],
    currentMessage: string,
    includeContext: boolean
  ): LLMMessage[] {
    const messages: LLMMessage[] = [];

    // Add chat history (excluding the current message)
    for (const msg of chatHistory) {
      messages.push({
        role: msg.role,
        content: msg.content,
      });
    }

    // The current message will be added by the caller after context is built
    return messages;
  }

  /**
   * Build messages for a new conversation turn
   */
  public async buildMessages(
    chatHistory: ChatMessage[],
    userMessage: string,
    includeNoteContext: boolean
  ): Promise<LLMMessage[]> {
    const messages: LLMMessage[] = [];

    // Add previous messages
    for (const msg of chatHistory) {
      messages.push({
        role: msg.role,
        content: msg.content,
      });
    }

    // Build and add the current user message with context
    const contextMessage = await this.buildContextMessage(
      userMessage,
      includeNoteContext
    );

    messages.push({
      role: "user",
      content: contextMessage,
    });

    return messages;
  }

  /**
   * Get a summary of the current note context for display
   */
  public async getContextSummary(): Promise<string | null> {
    const noteContext = await this.noteController.getNoteContext();
    if (!noteContext) {
      return null;
    }

    const parts: string[] = [];
    parts.push(`📄 ${noteContext.basename}`);

    if (noteContext.selection) {
      const lineInfo =
        noteContext.selectionRange
          ? ` (L${noteContext.selectionRange.startLine + 1}-${noteContext.selectionRange.endLine + 1})`
          : "";
      parts.push(`📝 Selection${lineInfo}`);
    }

    const wordCount = noteContext.content.split(/\s+/).length;
    parts.push(`${wordCount} words`);

    return parts.join(" • ");
  }

  /**
   * Check if note context is available
   */
  public async hasNoteContext(): Promise<boolean> {
    return this.noteController.hasActiveNote();
  }

  /**
   * Estimate token count for a string (rough estimate)
   */
  public estimateTokens(text: string): number {
    return Math.ceil(text.length / ContextBuilder.CHARS_PER_TOKEN);
  }

  /**
   * Get the maximum recommended message length
   */
  public getMaxMessageLength(): number {
    return ContextBuilder.MAX_NOTE_CHARS;
  }
}
