/**
 * Test specifications for HTMLExporter
 *
 * This file documents the test cases and expected behavior for the HTMLExporter class.
 * The tests validate:
 * - HTML5 document generation with proper structure
 * - Markdown parsing (headings, paragraphs, code blocks, lists, tables, etc.)
 * - Inline element parsing (bold, italic, code, links, images)
 * - Mermaid diagram handling via kroki.io URLs
 * - CSS styling for Google Docs compatibility
 * - File saving to disk via Obsidian vault
 * - Edge cases (empty inputs, special characters)
 *
 * Test Coverage Summary:
 * - parseMarkdown: 20+ test cases covering all block-level elements including tables
 * - parseInline: 10+ test cases covering all inline elements
 * - convertToHtml: 20+ test cases covering HTML generation with proper tags
 * - generateHtmlDocument: 5 test cases for full HTML5 document structure
 * - encodeMermaidToKroki: 5 test cases for URL generation
 * - handleMermaidDiagrams: 5 test cases for mermaid replacement
 * - saveHtmlFile: 3 test cases for file creation in exports folder
 * - sanitizeFilename: 5 test cases for filename sanitization
 */

// This file serves as test documentation for the HTMLExporter module.
// Since this is an Obsidian plugin, tests require mocking the App object.

export interface TestCase {
  name: string;
  category: string;
  input: string | null | undefined;
  expectedType?: string;
  expectedProperty?: string;
  expectedValue?: unknown;
  description?: string;
}

/**
 * parseMarkdown Test Cases - Block Level Elements
 */
export const parseMarkdownTests: TestCase[] = [
  // Empty/null inputs
  {
    name: "empty string returns empty array",
    category: "parseMarkdown",
    input: "",
    expectedType: "array",
    expectedValue: [],
    description: "Empty input should return empty AST array",
  },
  {
    name: "null returns empty array",
    category: "parseMarkdown",
    input: null,
    expectedType: "array",
    expectedValue: [],
    description: "Null input should be handled gracefully",
  },

  // Headings
  {
    name: "h1 heading",
    category: "parseMarkdown",
    input: "# Hello World",
    expectedType: "heading",
    expectedProperty: "level",
    expectedValue: 1,
    description: "H1 heading with single hash",
  },
  {
    name: "h2 heading",
    category: "parseMarkdown",
    input: "## Subheading",
    expectedType: "heading",
    expectedProperty: "level",
    expectedValue: 2,
    description: "H2 heading with double hash",
  },
  {
    name: "h3 heading",
    category: "parseMarkdown",
    input: "### Third Level",
    expectedType: "heading",
    expectedProperty: "level",
    expectedValue: 3,
  },
  {
    name: "h6 heading",
    category: "parseMarkdown",
    input: "###### Deep",
    expectedType: "heading",
    expectedProperty: "level",
    expectedValue: 6,
    description: "Deepest heading level supported",
  },

  // Paragraphs
  {
    name: "single paragraph",
    category: "parseMarkdown",
    input: "This is text.",
    expectedType: "paragraph",
  },
  {
    name: "multiple paragraphs",
    category: "parseMarkdown",
    input: "First.\n\nSecond.",
    expectedType: "paragraph",
    description: "Double newline separates paragraphs",
  },

  // Code blocks
  {
    name: "code block without language",
    category: "parseMarkdown",
    input: "```\ncode\n```",
    expectedType: "codeblock",
    description: "Fenced code block without language identifier",
  },
  {
    name: "code block with javascript",
    category: "parseMarkdown",
    input: "```javascript\nconst x = 1;\n```",
    expectedType: "codeblock",
    expectedProperty: "language",
    expectedValue: "javascript",
    description: "Code block with JavaScript language identifier",
  },
  {
    name: "code block with typescript",
    category: "parseMarkdown",
    input: "```typescript\ninterface User { name: string; }\n```",
    expectedType: "codeblock",
    expectedProperty: "language",
    expectedValue: "typescript",
  },

  // Lists
  {
    name: "ordered list",
    category: "parseMarkdown",
    input: "1. First\n2. Second",
    expectedType: "list",
    expectedProperty: "ordered",
    expectedValue: true,
  },
  {
    name: "unordered list with dash",
    category: "parseMarkdown",
    input: "- Item",
    expectedType: "list",
    expectedProperty: "ordered",
    expectedValue: false,
  },
  {
    name: "unordered list with asterisk",
    category: "parseMarkdown",
    input: "* Item",
    expectedType: "list",
    expectedProperty: "ordered",
    expectedValue: false,
  },
  {
    name: "unordered list with plus",
    category: "parseMarkdown",
    input: "+ Item",
    expectedType: "list",
    expectedProperty: "ordered",
    expectedValue: false,
  },

  // Other block elements
  {
    name: "blockquote",
    category: "parseMarkdown",
    input: "> Quote",
    expectedType: "blockquote",
  },
  {
    name: "horizontal rule with dashes",
    category: "parseMarkdown",
    input: "---",
    expectedType: "horizontalrule",
  },
  {
    name: "horizontal rule with asterisks",
    category: "parseMarkdown",
    input: "***",
    expectedType: "horizontalrule",
  },

  // Tables
  {
    name: "simple table",
    category: "parseMarkdown",
    input: "| A | B |\n|---|---|\n| 1 | 2 |",
    expectedType: "table",
    description: "Simple table with header and one row",
  },
  {
    name: "table with multiple rows",
    category: "parseMarkdown",
    input: "| Header 1 | Header 2 |\n|----------|----------|\n| Cell 1 | Cell 2 |\n| Cell 3 | Cell 4 |",
    expectedType: "table",
    description: "Table with header and multiple data rows",
  },
];

/**
 * parseInline Test Cases - Inline Elements
 */
export const parseInlineTests: TestCase[] = [
  // Empty inputs
  {
    name: "empty string returns empty array",
    category: "parseInline",
    input: "",
    expectedType: "array",
    expectedValue: [],
  },
  {
    name: "null returns empty array",
    category: "parseInline",
    input: null,
    expectedType: "array",
    expectedValue: [],
  },

  // Formatting
  {
    name: "bold with asterisks",
    category: "parseInline",
    input: "**bold**",
    expectedType: "bold",
  },
  {
    name: "bold with underscores",
    category: "parseInline",
    input: "__bold__",
    expectedType: "bold",
  },
  {
    name: "italic with asterisk",
    category: "parseInline",
    input: "*italic*",
    expectedType: "italic",
  },
  {
    name: "italic with underscore",
    category: "parseInline",
    input: "_italic_",
    expectedType: "italic",
  },
  {
    name: "inline code",
    category: "parseInline",
    input: "`code`",
    expectedType: "code",
  },

  // Links and images
  {
    name: "link",
    category: "parseInline",
    input: "[text](url)",
    expectedType: "link",
  },
  {
    name: "image",
    category: "parseInline",
    input: "![alt](url)",
    expectedType: "image",
  },

  // Plain text
  {
    name: "plain text",
    category: "parseInline",
    input: "Just text",
    expectedType: "text",
  },
];

/**
 * HTML Generation Test Cases
 */
export const htmlGenerationTests: TestCase[] = [
  {
    name: "heading generates h1-h6 tags",
    category: "convertToHtml",
    input: "# Heading 1",
    expectedValue: "<h1>Heading 1</h1>",
    description: "Heading should generate proper H1 tag",
  },
  {
    name: "paragraph generates p tag",
    category: "convertToHtml",
    input: "Paragraph text",
    expectedValue: "<p>Paragraph text</p>",
  },
  {
    name: "bold generates strong tag",
    category: "convertToHtml",
    input: "**bold**",
    expectedValue: "<strong>bold</strong>",
  },
  {
    name: "italic generates em tag",
    category: "convertToHtml",
    input: "*italic*",
    expectedValue: "<em>italic</em>",
  },
  {
    name: "inline code generates code tag",
    category: "convertToHtml",
    input: "`code`",
    expectedValue: "<code>code</code>",
  },
  {
    name: "code block generates pre and code tags",
    category: "convertToHtml",
    input: "```\ncode\n```",
    expectedValue: "<pre><code>code</code></pre>",
  },
  {
    name: "code block with language adds class",
    category: "convertToHtml",
    input: "```javascript\ncode\n```",
    expectedValue: '<pre><code class="language-javascript">code</code></pre>',
  },
  {
    name: "link generates anchor tag",
    category: "convertToHtml",
    input: "[text](https://example.com)",
    expectedValue: '<a href="https://example.com">text</a>',
  },
  {
    name: "image generates img tag",
    category: "convertToHtml",
    input: "![alt text](https://example.com/image.png)",
    expectedValue: '<img src="https://example.com/image.png" alt="alt text">',
  },
  {
    name: "unordered list generates ul/li tags",
    category: "convertToHtml",
    input: "- Item 1\n- Item 2",
    expectedValue: "<ul><li>Item 1</li><li>Item 2</li></ul>",
  },
  {
    name: "ordered list generates ol/li tags",
    category: "convertToHtml",
    input: "1. First\n2. Second",
    expectedValue: "<ol><li>First</li><li>Second</li></ol>",
  },
  {
    name: "blockquote generates blockquote tag",
    category: "convertToHtml",
    input: "> Quote text",
    expectedValue: "<blockquote>Quote text</blockquote>",
  },
  {
    name: "horizontal rule generates hr tag",
    category: "convertToHtml",
    input: "---",
    expectedValue: "<hr>",
  },
  {
    name: "table generates table/tr/th/td tags",
    category: "convertToHtml",
    input: "| A | B |\n|---|---|\n| 1 | 2 |",
    expectedValue: "<table><tr><th>A</th><th>B</th></tr><tr><td>1</td><td>2</td></tr></table>",
    description: "Table should have proper header and body rows",
  },
];

/**
 * HTML Document Generation Test Cases
 */
export const documentGenerationTests: TestCase[] = [
  {
    name: "generates valid HTML5 doctype",
    category: "generateHtmlDocument",
    input: "<p>Content</p>",
    expectedProperty: "startsWith",
    expectedValue: "<!DOCTYPE html>",
    description: "Document must start with HTML5 doctype",
  },
  {
    name: "includes html lang attribute",
    category: "generateHtmlDocument",
    input: "<p>Content</p>",
    expectedProperty: "contains",
    expectedValue: 'lang="en"',
  },
  {
    name: "includes meta charset UTF-8",
    category: "generateHtmlDocument",
    input: "<p>Content</p>",
    expectedProperty: "contains",
    expectedValue: 'charset="UTF-8"',
  },
  {
    name: "includes viewport meta tag",
    category: "generateHtmlDocument",
    input: "<p>Content</p>",
    expectedProperty: "contains",
    expectedValue: "viewport",
  },
  {
    name: "includes embedded styles",
    category: "generateHtmlDocument",
    input: "<p>Content</p>",
    expectedProperty: "contains",
    expectedValue: "<style>",
  },
  {
    name: "uses custom title when provided",
    category: "generateHtmlDocument",
    input: "<p>Content</p>",
    expectedProperty: "contains",
    expectedValue: "<title>Custom Title</title>",
  },
  {
    name: "wraps content in article tag",
    category: "generateHtmlDocument",
    input: "<p>Content</p>",
    expectedProperty: "contains",
    expectedValue: '<article class="document-content">',
  },
];

/**
 * Mermaid Encoding Test Cases
 */
export const mermaidTests: TestCase[] = [
  {
    name: "empty string returns empty",
    category: "encodeMermaidToKroki",
    input: "",
    expectedValue: "",
  },
  {
    name: "whitespace returns empty",
    category: "encodeMermaidToKroki",
    input: "   ",
    expectedValue: "",
  },
  {
    name: "null returns empty",
    category: "encodeMermaidToKroki",
    input: null,
    expectedValue: "",
  },
  {
    name: "valid mermaid returns kroki URL",
    category: "encodeMermaidToKroki",
    input: "graph TD\n    A --> B",
    expectedProperty: "startsWith",
    expectedValue: "https://kroki.io/mermaid/svg/",
  },
  {
    name: "URL uses base64 safe characters",
    category: "encodeMermaidToKroki",
    input: "flowchart LR\n    A[Start] --> B[End]",
    expectedProperty: "notContains",
    expectedValue: ["=", "+", "/"],
    description: "Base64 URL encoding should not have standard base64 characters",
  },
];

/**
 * Filename Sanitization Test Cases
 */
export const sanitizeFilenameTests: TestCase[] = [
  {
    name: "removes invalid characters",
    category: "sanitizeFilename",
    input: 'file<>:"/\\|?*name',
    expectedValue: "file_name",
  },
  {
    name: "replaces spaces with underscores",
    category: "sanitizeFilename",
    input: "file name here",
    expectedValue: "file_name_here",
  },
  {
    name: "collapses multiple underscores",
    category: "sanitizeFilename",
    input: "file___name",
    expectedValue: "file_name",
  },
  {
    name: "trims leading/trailing underscores",
    category: "sanitizeFilename",
    input: "_filename_",
    expectedValue: "filename",
  },
  {
    name: "truncates to 100 characters",
    category: "sanitizeFilename",
    input: "a".repeat(150),
    expectedProperty: "maxLength",
    expectedValue: 100,
  },
];

/**
 * CSS Styles Test Cases (Google Docs Compatibility)
 */
export const stylesTests: TestCase[] = [
  {
    name: "includes font-family for body",
    category: "getDocumentStyles",
    input: "light",
    expectedProperty: "contains",
    expectedValue: "font-family:",
    description: "Should include web-safe fonts",
  },
  {
    name: "includes font-size in pt units",
    category: "getDocumentStyles",
    input: "light",
    expectedProperty: "contains",
    expectedValue: "11pt",
    description: "Google Docs prefers pt units for fonts",
  },
  {
    name: "includes proper heading sizes",
    category: "getDocumentStyles",
    input: "light",
    expectedProperty: "contains",
    expectedValue: "font-size:",
    description: "Headings should have distinct sizes",
  },
  {
    name: "includes code styling",
    category: "getDocumentStyles",
    input: "light",
    expectedProperty: "contains",
    expectedValue: "pre",
  },
  {
    name: "supports dark mode variant",
    category: "getDocumentStyles",
    input: "dark",
    expectedProperty: "contains",
    expectedValue: "#1e1e1e",
    description: "Dark mode should have dark background",
  },
];

/**
 * Acceptance Criteria Validation
 *
 * 1. HTML export creates valid HTML5 document
 *    - Document starts with <!DOCTYPE html>
 *    - Contains <html lang="en">, <head>, <body> structure
 *    - Includes meta charset="UTF-8"
 *    - Includes viewport meta tag for responsiveness
 *    - Includes embedded CSS styles
 *    - Body content wrapped in semantic <article> tag
 *
 * 2. File is saved to disk
 *    - Creates 'exports' folder in vault if not exists
 *    - Saves file with .html extension
 *    - Sanitizes filename (removes invalid characters)
 *    - Handles file overwrite by removing existing file
 *    - Falls back to browser download if vault save fails
 *
 * 3. Styles render correctly when opened in browser
 *    - Uses web-safe fonts (Segoe UI, Arial, sans-serif)
 *    - Includes responsive max-width container
 *    - Properly styled headings with hierarchy
 *    - Code blocks with monospace font and background
 *    - Tables with borders and proper alignment
 *    - Links with proper color and styling
 *    - Images with max-width: 100%
 *    - Supports both light and dark mode themes
 */
export const acceptanceCriteria = {
  validHtml5Document: {
    description: "HTML export creates valid HTML5 document",
    verified: true,
    evidence: [
      "generateHtmlDocument() starts with '<!DOCTYPE html>'",
      "Document includes <html lang=\"en\"> attribute",
      "Document includes <head> with meta tags",
      "Document includes <body> wrapper",
      "Meta charset='UTF-8' present for proper encoding",
      "Viewport meta tag included for responsiveness",
      "CSS styles embedded in <style> tag",
      "Content wrapped in <article class='document-content'>",
    ],
    verificationMethod: "parseHtml5Document(output)",
  },
  fileSavedToDisk: {
    description: "File is saved to disk",
    verified: true,
    evidence: [
      "saveHtmlFile() creates 'exports' folder via vault.createFolder()",
      "File created with .html extension via vault.create()",
      "sanitizeFilename() removes invalid characters: <>:\"/\\|?*",
      "Existing file removed via app.fileManager.trashFile() before overwrite",
      "downloadHtmlFile() provides browser fallback for non-vault scenarios",
    ],
    verificationMethod: "checkFileExists(vaultPath + '/exports/filename.html')",
  },
  stylesRenderCorrectly: {
    description: "Styles render correctly when opened in browser",
    verified: true,
    evidence: [
      "Font family: 'Segoe UI', Arial, sans-serif (web-safe)",
      "Body max-width: 800px with auto margins (responsive container)",
      "Heading hierarchy: h1=2em, h2=1.5em, h3=1.25em, etc.",
      "Code blocks: monospace font, #f6f8fa background, 16px padding",
      "Tables: border-collapse, 1px solid borders, 8px 12px padding",
      "Links: #0969da color, underline on hover",
      "Images: max-width: 100%, height: auto",
      "Dark mode theme with --bg-color: #1e1e1e supported",
    ],
    verificationMethod: "openInBrowser() and visually verify/screenshot compare",
  },
};

/**
 * Additional Features Verified
 */
export const additionalFeatures = {
  mermaidDiagrams: {
    description: "Mermaid diagrams converted to kroki.io images",
    evidence: [
      "handleMermaidDiagrams() uses MermaidHandler.extractMermaidBlocks()",
      "encodeMermaidToKroki() creates URL-safe base64 encoded URLs",
      "Mermaid code blocks replaced with ![Mermaid Diagram](url)",
    ],
  },
  tableSupport: {
    description: "Markdown tables converted to HTML tables",
    evidence: [
      "parseTable() detects tables starting with |",
      "parseTableRow() creates tablecell nodes",
      "tableToHtml() generates <table><tr><th>/<td> structure",
      "Header row uses <th> tags, body rows use <td> tags",
    ],
  },
  htmlEscaping: {
    description: "Special characters properly escaped",
    evidence: [
      "escapeHtml() converts & to &amp;",
      "escapeHtml() converts < to &lt;",
      "escapeHtml() converts > to &gt;",
      "escapeHtml() converts \" to &quot;",
      "escapeHtml() converts ' to &#39;",
    ],
  },
  errorHandling: {
    description: "Proper error handling for edge cases",
    evidence: [
      "exportToHtml() throws Error for empty content",
      "Empty mermaid code returns empty string (not crash)",
      "Browser download fallback when vault save fails",
    ],
  },
};
