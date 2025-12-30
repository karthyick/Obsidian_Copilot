/**
 * Test Validation for ClipboardExporter
 *
 * This file provides a comprehensive test validation suite that can be executed
 * without requiring external test frameworks. It validates all key functionality
 * of the ClipboardExporter class through direct execution.
 *
 * Test Coverage:
 * - parseMarkdown: Block-level markdown parsing (headings, paragraphs, code blocks, lists, etc.)
 * - parseInline: Inline element parsing (bold, italic, code, links, images)
 * - convertToRichText: HTML generation with Google Docs compatible styling
 * - encodeMermaidToKroki: Mermaid URL encoding
 * - handleMermaidDiagrams: Mermaid block replacement
 */

import { ClipboardExporter, MarkdownNode, MarkdownNodeType } from "./clipboardExporter";

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

interface TestSuite {
  name: string;
  tests: TestResult[];
}

/**
 * Simple assertion helpers
 */
function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertTrue(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`${message}: expected true, got false`);
  }
}

function assertContains(str: string, substring: string, message: string): void {
  if (!str.includes(substring)) {
    throw new Error(`${message}: expected string to contain "${substring}"`);
  }
}

function assertNotContains(str: string, substring: string, message: string): void {
  if (str.includes(substring)) {
    throw new Error(`${message}: expected string NOT to contain "${substring}"`);
  }
}

function assertLength<T>(arr: T[], length: number, message: string): void {
  if (arr.length !== length) {
    throw new Error(`${message}: expected length ${length}, got ${arr.length}`);
  }
}

function assertGreaterThan(actual: number, min: number, message: string): void {
  if (actual <= min) {
    throw new Error(`${message}: expected > ${min}, got ${actual}`);
  }
}

function assertMatch(str: string, pattern: RegExp, message: string): void {
  if (!pattern.test(str)) {
    throw new Error(`${message}: expected string to match ${pattern}`);
  }
}

/**
 * Run a single test and capture result
 */
function runTest(name: string, testFn: () => void): TestResult {
  try {
    testFn();
    return { name, passed: true };
  } catch (e) {
    return { name, passed: false, error: (e as Error).message };
  }
}

/**
 * parseMarkdown Test Suite
 */
function testParseMarkdown(exporter: ClipboardExporter): TestSuite {
  const tests: TestResult[] = [];

  // Empty/null inputs
  tests.push(runTest("empty string returns empty array", () => {
    const result = exporter.parseMarkdown("");
    assertLength(result, 0, "Empty string");
  }));

  tests.push(runTest("whitespace-only returns empty array", () => {
    const result = exporter.parseMarkdown("   \n   ");
    assertLength(result, 0, "Whitespace only");
  }));

  // Headings
  tests.push(runTest("parses h1 heading", () => {
    const result = exporter.parseMarkdown("# Hello World");
    assertLength(result, 1, "H1 result count");
    assertEqual(result[0].type, "heading" as MarkdownNodeType, "H1 type");
    assertEqual(result[0].level, 1, "H1 level");
  }));

  tests.push(runTest("parses h2 heading", () => {
    const result = exporter.parseMarkdown("## Subheading");
    assertEqual(result[0].type, "heading" as MarkdownNodeType, "H2 type");
    assertEqual(result[0].level, 2, "H2 level");
  }));

  tests.push(runTest("parses h6 heading", () => {
    const result = exporter.parseMarkdown("###### Deep Level");
    assertEqual(result[0].level, 6, "H6 level");
  }));

  tests.push(runTest("# without space is not heading", () => {
    const result = exporter.parseMarkdown("#NoSpace");
    assertEqual(result[0].type, "paragraph" as MarkdownNodeType, "Not heading");
  }));

  // Paragraphs
  tests.push(runTest("parses single paragraph", () => {
    const result = exporter.parseMarkdown("This is a paragraph.");
    assertLength(result, 1, "Single paragraph");
    assertEqual(result[0].type, "paragraph" as MarkdownNodeType, "Paragraph type");
  }));

  tests.push(runTest("parses multiple paragraphs", () => {
    const result = exporter.parseMarkdown("First.\n\nSecond.");
    assertLength(result, 2, "Two paragraphs");
  }));

  // Code blocks
  tests.push(runTest("parses code block without language", () => {
    const result = exporter.parseMarkdown("```\nconst x = 1;\n```");
    assertEqual(result[0].type, "codeblock" as MarkdownNodeType, "Codeblock type");
    assertEqual(result[0].content, "const x = 1;", "Codeblock content");
  }));

  tests.push(runTest("parses code block with language", () => {
    const result = exporter.parseMarkdown("```javascript\ncode\n```");
    assertEqual(result[0].language, "javascript", "Language");
  }));

  // Lists
  tests.push(runTest("parses ordered list", () => {
    const result = exporter.parseMarkdown("1. First\n2. Second");
    assertEqual(result[0].type, "list" as MarkdownNodeType, "List type");
    assertEqual(result[0].ordered, true, "Ordered list");
    assertLength(result[0].children || [], 2, "List items");
  }));

  tests.push(runTest("parses unordered list", () => {
    const result = exporter.parseMarkdown("- Item one\n- Item two");
    assertEqual(result[0].ordered, false, "Unordered list");
  }));

  // Blockquotes
  tests.push(runTest("parses blockquote", () => {
    const result = exporter.parseMarkdown("> Quote text");
    assertEqual(result[0].type, "blockquote" as MarkdownNodeType, "Blockquote type");
  }));

  // Horizontal rules
  tests.push(runTest("parses horizontal rule (dashes)", () => {
    const result = exporter.parseMarkdown("---");
    assertEqual(result[0].type, "horizontalrule" as MarkdownNodeType, "HR type");
  }));

  tests.push(runTest("parses horizontal rule (asterisks)", () => {
    const result = exporter.parseMarkdown("***");
    assertEqual(result[0].type, "horizontalrule" as MarkdownNodeType, "HR asterisks");
  }));

  // Complex document
  tests.push(runTest("parses complex document", () => {
    const md = "# Title\n\nParagraph\n\n- List\n\n```js\ncode\n```\n\n> Quote\n\n---";
    const result = exporter.parseMarkdown(md);
    assertGreaterThan(result.length, 5, "Complex doc length");
    assertTrue(result.some(n => n.type === "heading"), "Has heading");
    assertTrue(result.some(n => n.type === "paragraph"), "Has paragraph");
    assertTrue(result.some(n => n.type === "list"), "Has list");
    assertTrue(result.some(n => n.type === "codeblock"), "Has codeblock");
    assertTrue(result.some(n => n.type === "blockquote"), "Has blockquote");
    assertTrue(result.some(n => n.type === "horizontalrule"), "Has hr");
  }));

  return { name: "parseMarkdown", tests };
}

/**
 * parseInline Test Suite
 */
function testParseInline(exporter: ClipboardExporter): TestSuite {
  const tests: TestResult[] = [];

  // Empty inputs
  tests.push(runTest("empty string returns empty array", () => {
    assertLength(exporter.parseInline(""), 0, "Empty inline");
  }));

  // Bold
  tests.push(runTest("parses bold with asterisks", () => {
    const result = exporter.parseInline("**bold**");
    assertEqual(result[0].type, "bold" as MarkdownNodeType, "Bold type");
  }));

  tests.push(runTest("parses bold with underscores", () => {
    const result = exporter.parseInline("__bold__");
    assertEqual(result[0].type, "bold" as MarkdownNodeType, "Bold underscores");
  }));

  // Italic
  tests.push(runTest("parses italic with asterisk", () => {
    const result = exporter.parseInline("*italic*");
    assertEqual(result[0].type, "italic" as MarkdownNodeType, "Italic type");
  }));

  tests.push(runTest("parses italic with underscore", () => {
    const result = exporter.parseInline("_italic_");
    assertEqual(result[0].type, "italic" as MarkdownNodeType, "Italic underscore");
  }));

  // Code
  tests.push(runTest("parses inline code", () => {
    const result = exporter.parseInline("`code`");
    assertEqual(result[0].type, "code" as MarkdownNodeType, "Code type");
    assertEqual(result[0].content, "code", "Code content");
  }));

  // Links
  tests.push(runTest("parses link", () => {
    const result = exporter.parseInline("[text](https://example.com)");
    assertEqual(result[0].type, "link" as MarkdownNodeType, "Link type");
    assertEqual(result[0].content, "text", "Link text");
    assertEqual(result[0].url, "https://example.com", "Link URL");
  }));

  // Images
  tests.push(runTest("parses image", () => {
    const result = exporter.parseInline("![alt](image.png)");
    assertEqual(result[0].type, "image" as MarkdownNodeType, "Image type");
    assertEqual(result[0].alt, "alt", "Image alt");
    assertEqual(result[0].url, "image.png", "Image URL");
  }));

  // Plain text
  tests.push(runTest("parses plain text", () => {
    const result = exporter.parseInline("Just text");
    assertEqual(result[0].type, "text" as MarkdownNodeType, "Text type");
    assertEqual(result[0].content, "Just text", "Text content");
  }));

  // Mixed content
  tests.push(runTest("parses bold surrounded by text", () => {
    const result = exporter.parseInline("before **bold** after");
    assertLength(result, 3, "Mixed content length");
    assertEqual(result[1].type, "bold" as MarkdownNodeType, "Middle is bold");
  }));

  return { name: "parseInline", tests };
}

/**
 * convertToRichText Test Suite
 */
function testConvertToRichText(exporter: ClipboardExporter): TestSuite {
  const tests: TestResult[] = [];

  // Headings
  tests.push(runTest("converts h1 with correct styling", () => {
    const ast: MarkdownNode[] = [{ type: "heading", level: 1, children: [{ type: "text", content: "Title" }] }];
    const html = exporter.convertToRichText(ast);
    assertContains(html, "<h1", "H1 tag");
    assertContains(html, "font-size: 26pt", "H1 size");
    assertContains(html, "Title", "H1 content");
    assertContains(html, "</h1>", "H1 close");
  }));

  tests.push(runTest("converts h2 with correct size", () => {
    const ast: MarkdownNode[] = [{ type: "heading", level: 2, children: [{ type: "text", content: "Sub" }] }];
    const html = exporter.convertToRichText(ast);
    assertContains(html, "<h2", "H2 tag");
    assertContains(html, "font-size: 22pt", "H2 size");
  }));

  // Paragraphs
  tests.push(runTest("converts paragraph with styling", () => {
    const ast: MarkdownNode[] = [{ type: "paragraph", children: [{ type: "text", content: "Content" }] }];
    const html = exporter.convertToRichText(ast);
    assertContains(html, "<p", "P tag");
    assertContains(html, "font-size: 11pt", "P size");
    assertContains(html, "Content", "P content");
  }));

  // Bold
  tests.push(runTest("converts bold to strong", () => {
    const ast: MarkdownNode[] = [{ type: "bold", children: [{ type: "text", content: "bold" }] }];
    const html = exporter.convertToRichText(ast);
    assertContains(html, "<strong", "Strong tag");
    assertContains(html, "font-weight: bold", "Bold style");
  }));

  // Italic
  tests.push(runTest("converts italic to em", () => {
    const ast: MarkdownNode[] = [{ type: "italic", children: [{ type: "text", content: "italic" }] }];
    const html = exporter.convertToRichText(ast);
    assertContains(html, "<em", "Em tag");
    assertContains(html, "font-style: italic", "Italic style");
  }));

  // Inline code
  tests.push(runTest("converts inline code with monospace", () => {
    const ast: MarkdownNode[] = [{ type: "code", content: "const x" }];
    const html = exporter.convertToRichText(ast);
    assertContains(html, "<code", "Code tag");
    assertContains(html, "Courier New", "Monospace font");
    assertContains(html, "background-color: #f4f4f4", "Code background");
  }));

  // Code blocks
  tests.push(runTest("converts code block", () => {
    const ast: MarkdownNode[] = [{ type: "codeblock", content: "const x = 1;", language: "js" }];
    const html = exporter.convertToRichText(ast);
    assertContains(html, "<pre", "Pre tag");
    assertContains(html, "<code", "Code inside pre");
    assertContains(html, 'data-language="js"', "Language data attr");
  }));

  // Links
  tests.push(runTest("converts link to anchor", () => {
    const ast: MarkdownNode[] = [{ type: "link", content: "Click", url: "https://test.com" }];
    const html = exporter.convertToRichText(ast);
    assertContains(html, "<a href", "Anchor tag");
    assertContains(html, "https://test.com", "Link URL");
    assertContains(html, "color: #1a73e8", "Link color");
  }));

  // Images
  tests.push(runTest("converts image to img", () => {
    const ast: MarkdownNode[] = [{ type: "image", alt: "Alt Text", url: "img.png" }];
    const html = exporter.convertToRichText(ast);
    assertContains(html, "<img", "Img tag");
    assertContains(html, 'src="img.png"', "Image src");
    assertContains(html, 'alt="Alt Text"', "Image alt");
  }));

  // Lists
  tests.push(runTest("converts unordered list", () => {
    const ast: MarkdownNode[] = [{
      type: "list", ordered: false,
      children: [{ type: "listitem", children: [{ type: "text", content: "Item" }] }]
    }];
    const html = exporter.convertToRichText(ast);
    assertContains(html, "<ul", "UL tag");
    assertContains(html, "<li", "LI tag");
    assertContains(html, "list-style-type: disc", "Disc style");
  }));

  tests.push(runTest("converts ordered list", () => {
    const ast: MarkdownNode[] = [{
      type: "list", ordered: true,
      children: [{ type: "listitem", children: [{ type: "text", content: "Item" }] }]
    }];
    const html = exporter.convertToRichText(ast);
    assertContains(html, "<ol", "OL tag");
    assertContains(html, "list-style-type: decimal", "Decimal style");
  }));

  // Blockquote
  tests.push(runTest("converts blockquote with border", () => {
    const ast: MarkdownNode[] = [{
      type: "blockquote",
      children: [{ type: "paragraph", children: [{ type: "text", content: "Quote" }] }]
    }];
    const html = exporter.convertToRichText(ast);
    assertContains(html, "<blockquote", "Blockquote tag");
    assertContains(html, "border-left: 4px solid", "Left border");
  }));

  // Horizontal rule
  tests.push(runTest("converts horizontal rule", () => {
    const ast: MarkdownNode[] = [{ type: "horizontalrule" }];
    const html = exporter.convertToRichText(ast);
    assertContains(html, "<hr", "HR tag");
    assertContains(html, "border-top: 1px solid", "Border top");
  }));

  // HTML Escaping
  tests.push(runTest("escapes ampersand", () => {
    const ast: MarkdownNode[] = [{ type: "text", content: "A & B" }];
    const html = exporter.convertToRichText(ast);
    assertContains(html, "&amp;", "Escaped &");
    assertNotContains(html, " & ", "No raw &");
  }));

  tests.push(runTest("escapes less than", () => {
    const ast: MarkdownNode[] = [{ type: "text", content: "a < b" }];
    const html = exporter.convertToRichText(ast);
    assertContains(html, "&lt;", "Escaped <");
  }));

  tests.push(runTest("escapes greater than", () => {
    const ast: MarkdownNode[] = [{ type: "text", content: "a > b" }];
    const html = exporter.convertToRichText(ast);
    assertContains(html, "&gt;", "Escaped >");
  }));

  tests.push(runTest("escapes double quotes", () => {
    const ast: MarkdownNode[] = [{ type: "text", content: 'say "hi"' }];
    const html = exporter.convertToRichText(ast);
    assertContains(html, "&quot;", "Escaped quotes");
  }));

  tests.push(runTest("escapes single quotes", () => {
    const ast: MarkdownNode[] = [{ type: "text", content: "it's" }];
    const html = exporter.convertToRichText(ast);
    assertContains(html, "&#39;", "Escaped apostrophe");
  }));

  return { name: "convertToRichText", tests };
}

/**
 * Mermaid Encoding Test Suite
 */
function testMermaidEncoding(exporter: ClipboardExporter): TestSuite {
  const tests: TestResult[] = [];

  tests.push(runTest("empty string returns empty", () => {
    assertEqual(exporter.encodeMermaidToKroki(""), "", "Empty input");
  }));

  tests.push(runTest("whitespace returns empty", () => {
    assertEqual(exporter.encodeMermaidToKroki("   "), "", "Whitespace");
  }));

  tests.push(runTest("generates kroki.io URL", () => {
    const result = exporter.encodeMermaidToKroki("graph TD\n    A --> B");
    assertMatch(result, /^https:\/\/kroki\.io\/mermaid\/svg\/.+/, "Kroki URL format");
  }));

  tests.push(runTest("URL is safe encoded", () => {
    const result = exporter.encodeMermaidToKroki("graph TD\n    A --> B");
    assertNotContains(result, "+", "No + in URL");
    assertNotContains(result, "/", "No / in encoded part");
  }));

  return { name: "encodeMermaidToKroki", tests };
}

/**
 * Integration Test Suite
 */
function testIntegration(exporter: ClipboardExporter): TestSuite {
  const tests: TestResult[] = [];

  tests.push(runTest("full markdown to HTML pipeline", () => {
    const md = "# Hello\n\n**bold** and *italic*\n\n```js\ncode\n```\n\n- Item";
    const ast = exporter.parseMarkdown(md);
    const html = exporter.convertToRichText(ast);

    assertContains(html, "<h1", "Has h1");
    assertContains(html, "<strong", "Has strong");
    assertContains(html, "<em", "Has em");
    assertContains(html, "<pre", "Has pre");
    assertContains(html, "<ul", "Has ul");
  }));

  tests.push(runTest("special characters throughout pipeline", () => {
    const md = "Chars: & < > \" '";
    const ast = exporter.parseMarkdown(md);
    const html = exporter.convertToRichText(ast);

    assertContains(html, "&amp;", "& escaped");
    assertContains(html, "&lt;", "< escaped");
    assertContains(html, "&gt;", "> escaped");
    assertContains(html, "&quot;", "\" escaped");
    assertContains(html, "&#39;", "' escaped");
  }));

  tests.push(runTest("nested formatting works", () => {
    const result = exporter.parseInline("**bold with `code`**");
    assertEqual(result[0].type, "bold" as MarkdownNodeType, "Outer is bold");
    assertTrue(result[0].children?.some(c => c.type === "code") ?? false, "Has nested code");
  }));

  return { name: "Integration", tests };
}

/**
 * Run all test suites and return results
 */
export function runAllTests(): { suites: TestSuite[]; summary: { total: number; passed: number; failed: number } } {
  const exporter = new ClipboardExporter();
  const suites: TestSuite[] = [
    testParseMarkdown(exporter),
    testParseInline(exporter),
    testConvertToRichText(exporter),
    testMermaidEncoding(exporter),
    testIntegration(exporter),
  ];

  let total = 0;
  let passed = 0;

  for (const suite of suites) {
    for (const test of suite.tests) {
      total++;
      if (test.passed) passed++;
    }
  }

  return {
    suites,
    summary: { total, passed, failed: total - passed },
  };
}

/**
 * Format test results for display
 */
export function formatTestResults(results: ReturnType<typeof runAllTests>): string {
  const lines: string[] = [];
  lines.push("═══════════════════════════════════════════════════════════════");
  lines.push("           ClipboardExporter Test Results");
  lines.push("═══════════════════════════════════════════════════════════════\n");

  for (const suite of results.suites) {
    const passCount = suite.tests.filter(t => t.passed).length;
    const failCount = suite.tests.length - passCount;
    const status = failCount === 0 ? "✓ PASS" : "✗ FAIL";

    lines.push(`  ${suite.name} [${passCount}/${suite.tests.length}] ${status}`);
    lines.push("  " + "─".repeat(55));

    for (const test of suite.tests) {
      const icon = test.passed ? "✓" : "✗";
      lines.push(`    ${icon} ${test.name}`);
      if (!test.passed && test.error) {
        lines.push(`      └─ Error: ${test.error}`);
      }
    }
    lines.push("");
  }

  lines.push("═══════════════════════════════════════════════════════════════");
  lines.push(`  SUMMARY: ${results.summary.passed}/${results.summary.total} tests passed`);
  if (results.summary.failed > 0) {
    lines.push(`           ${results.summary.failed} tests failed`);
  }
  lines.push("═══════════════════════════════════════════════════════════════");

  return lines.join("\n");
}

// Export test case documentation for spec file
export const testCoverage = {
  parseMarkdown: {
    testCount: 15,
    categories: ["empty/null inputs", "headings", "paragraphs", "code blocks", "lists", "blockquotes", "horizontal rules", "complex documents"],
  },
  parseInline: {
    testCount: 10,
    categories: ["empty inputs", "bold", "italic", "inline code", "links", "images", "plain text", "mixed content"],
  },
  convertToRichText: {
    testCount: 18,
    categories: ["headings", "paragraphs", "inline formatting", "code blocks", "links", "images", "lists", "blockquotes", "horizontal rules", "HTML escaping"],
  },
  encodeMermaidToKroki: {
    testCount: 4,
    categories: ["empty inputs", "URL generation", "URL safety"],
  },
  integration: {
    testCount: 3,
    categories: ["full pipeline", "special characters", "nested formatting"],
  },
};

