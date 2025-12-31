/**
 * ExportModal - Modal dialog for selecting export format
 * Provides options for clipboard, HTML, and DOCX export
 */

import { App, Modal, Notice, TFile } from "obsidian";
import { ClipboardExporter } from "../exporters/clipboardExporter";
import { HTMLExporter } from "../exporters/htmlExporter";
import { DOCXExporter } from "../exporters/docxExporter";
import { HTMLExportStyles } from "../types";

/**
 * Export format options
 */
export type ExportFormat = "clipboard" | "html" | "docx";

/**
 * Export Modal for selecting export format and executing export
 */
export class ExportModal extends Modal {
  private markdown: string;
  private filename: string;
  private selectedFormat: ExportFormat = "clipboard";
  private htmlExportStyles?: HTMLExportStyles;

  constructor(
    app: App,
    markdown: string,
    filename: string,
    htmlExportStyles?: HTMLExportStyles
  ) {
    super(app);
    this.markdown = markdown;
    this.filename = filename;
    this.htmlExportStyles = htmlExportStyles;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("export-modal");

    // Modal title
    contentEl.createEl("h2", { text: "Export document" });

    // Description
    contentEl.createEl("p", {
      text: "Select an export format for your document.",
      cls: "export-modal-description setting-item-description",
    });

    // Format selection container
    const formatContainer = contentEl.createDiv({ cls: "export-format-container" });

    // Clipboard option
    const clipboardOption = this.createFormatOption(
      formatContainer,
      "clipboard",
      "Copy to clipboard",
      "Copy as rich text (HTML) for pasting into Google Docs, Word, etc."
    );

    // HTML option
    const htmlOption = this.createFormatOption(
      formatContainer,
      "html",
      "Export to HTML",
      "Save as a standalone HTML file with embedded styles."
    );

    // DOCX option
    const docxOption = this.createFormatOption(
      formatContainer,
      "docx",
      "Export to DOCX",
      "Save as a Microsoft Word document."
    );

    // Set initial selection
    this.updateSelection(clipboardOption, "clipboard");

    // Add click handlers
    clipboardOption.addEventListener("click", () => {
      this.updateSelection(clipboardOption, "clipboard");
      this.clearSelection([htmlOption, docxOption]);
    });
    htmlOption.addEventListener("click", () => {
      this.updateSelection(htmlOption, "html");
      this.clearSelection([clipboardOption, docxOption]);
    });
    docxOption.addEventListener("click", () => {
      this.updateSelection(docxOption, "docx");
      this.clearSelection([clipboardOption, htmlOption]);
    });

    // Button container
    const buttonContainer = contentEl.createDiv({ cls: "modal-button-container" });

    // Cancel button
    const cancelBtn = buttonContainer.createEl("button", {
      text: "Cancel",
    });
    cancelBtn.addEventListener("click", () => this.close());

    // Export button
    const exportBtn = buttonContainer.createEl("button", {
      text: "Export",
      cls: "mod-cta",
    });
    exportBtn.addEventListener("click", () => void this.executeExport());
  }

  onClose(): void {
    const { contentEl } = this;
    contentEl.empty();
  }

  /**
   * Create a format option element
   */
  private createFormatOption(
    container: HTMLElement,
    format: ExportFormat,
    title: string,
    description: string
  ): HTMLElement {
    const option = container.createDiv({ cls: "export-format-option setting-item" });
    option.dataset.format = format;

    const radioContainer = option.createDiv({ cls: "export-radio-container" });
    const radio = radioContainer.createEl("input", {
      type: "radio",
      cls: "export-radio",
    });
    radio.name = "export-format";
    radio.value = format;
    if (format === "clipboard") {
      radio.checked = true;
    }

    const textContainer = option.createDiv({ cls: "setting-item-info" });
    textContainer.createEl("div", { text: title, cls: "setting-item-name" });
    textContainer.createEl("div", {
      text: description,
      cls: "setting-item-description",
    });

    return option;
  }

  /**
   * Update selection state
   */
  private updateSelection(element: HTMLElement, format: ExportFormat): void {
    this.selectedFormat = format;
    element.addClass("is-selected");
    const radio = element.querySelector("input[type='radio']") as HTMLInputElement;
    if (radio) {
      radio.checked = true;
    }
  }

  /**
   * Clear selection from elements
   */
  private clearSelection(elements: HTMLElement[]): void {
    for (const el of elements) {
      el.removeClass("is-selected");
      const radio = el.querySelector("input[type='radio']") as HTMLInputElement;
      if (radio) {
        radio.checked = false;
      }
    }
  }

  /**
   * Execute the selected export action
   */
  private async executeExport(): Promise<void> {
    try {
      new Notice(`Exporting as ${this.selectedFormat.toUpperCase()}...`);

      switch (this.selectedFormat) {
        case "clipboard":
          await this.exportToClipboard();
          break;
        case "html":
          await this.exportToHtml();
          break;
        case "docx":
          await this.exportToDocx();
          break;
      }

      this.close();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      new Notice(`Export failed: ${errorMessage}`);
      // Error already shown via Notice - no console logging in production
    }
  }

  /**
   * Export to clipboard
   */
  private async exportToClipboard(): Promise<void> {
    const exporter = new ClipboardExporter();
    await exporter.exportToClipboard(this.markdown);
    new Notice("Copied to clipboard as rich text");
  }

  /**
   * Export to HTML file
   */
  private async exportToHtml(): Promise<void> {
    const exporter = new HTMLExporter(this.app, this.htmlExportStyles);
    await exporter.exportToHtml(this.markdown, this.filename, {
      title: this.filename,
    });
    // Notice is shown by HTMLExporter
  }

  /**
   * Export to DOCX file
   */
  private async exportToDocx(): Promise<void> {
    const exporter = new DOCXExporter(this.app);
    await exporter.exportToDocx(this.markdown, this.filename, {
      title: this.filename,
    });
    // Notice is shown by DOCXExporter
  }
}

/**
 * Open export modal for the active file
 */
export async function openExportModal(
  app: App,
  htmlExportStyles?: HTMLExportStyles
): Promise<void> {
  const activeFile = app.workspace.getActiveFile();

  if (!activeFile || !(activeFile instanceof TFile)) {
    new Notice("No active file to export");
    return;
  }

  if (activeFile.extension !== "md") {
    new Notice("Only markdown files can be exported");
    return;
  }

  const markdown = await app.vault.read(activeFile);
  const filename = activeFile.basename;

  const modal = new ExportModal(app, markdown, filename, htmlExportStyles);
  modal.open();
}
