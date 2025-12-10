# Obsidian AI Assistant

A powerful AI chatbot plugin for Obsidian with multi-provider support and full note editing capabilities. Features a beautiful glassmorphism UI design.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Obsidian](https://img.shields.io/badge/Obsidian-1.0.0+-purple)
![License](https://img.shields.io/badge/license-MIT-green)

## Features

### Multi-Provider Support
- **AWS Bedrock** - Claude Sonnet 4, Claude 3.5, Claude 3 Opus/Haiku, and more
- **Google Gemini** - Gemini 2.0 Flash, Gemini 1.5 Pro/Flash
- **Groq** - Llama 3.3 70B, Mixtral, Gemma (ultra-fast inference)

### Intelligent Note Editing
The AI can directly edit your notes using natural language commands:
- Replace selected text
- Insert at cursor position
- Find and replace text
- Update specific sections
- Append/prepend content
- Insert after headings

### Transform Prompts
One-click document transformation into professional formats:
- **Pyramid** - Barbara Minto's Pyramid Principle structure
- **COIN** - Context, Observation, Impact, Next Steps
- **Business** - Executive summary format
- **Management** - Crispy management briefing style
- **Developer** - Technical documentation format
- **Cosmos** - Creative cosmic perspective
- **Cringe** - Fun, over-the-top style

### Rich Features
- **Real-time streaming** - Watch responses appear as they're generated
- **Context awareness** - Automatically includes active note content for relevant responses
- **Note references** - Tag multiple notes with `@` to provide additional context
- **Mermaid diagrams** - AI-generated diagrams are automatically sanitized for Obsidian compatibility
- **Conversation memory** - Last 10 messages maintained for context continuity
- **Copy to clipboard** - One-click copy for any message
- **Retry responses** - Regenerate any AI response with one click
- **Smart error handling** - User-friendly error messages with troubleshooting hints

### Beautiful UI
- Glassmorphism design with backdrop blur effects
- Gradient backgrounds with subtle glows
- Animated Apply Edit button for visibility
- Dark and light theme support
- Responsive layout

## Installation

### From Obsidian Community Plugins (Coming Soon)
1. Open Obsidian Settings
2. Go to Community Plugins
3. Search for "AI Assistant"
4. Click Install, then Enable

### Manual Installation
1. Download the latest release from [GitHub Releases](https://github.com/karthyick/Obsidian_Copilot/releases)
2. Extract the files to your vault's plugins folder: `<vault>/.obsidian/plugins/ai-assistant/`
3. Ensure you have these files in the folder:
   - `main.js`
   - `manifest.json`
   - `styles.css`
4. Restart Obsidian
5. Enable the plugin in Settings > Community Plugins

### From Source
```bash
git clone https://github.com/karthyick/Obsidian_Copilot.git
cd Obsidian_Copilot
npm install
npm run build
```
Copy `main.js`, `manifest.json`, and `styles.css` to your vault's plugins folder.

## Configuration

### AWS Bedrock Setup
1. Go to Settings > AI Assistant
2. Select "AWS Bedrock" as the provider
3. Enter your AWS credentials:
   - **Access Key ID** - Your AWS access key
   - **Secret Access Key** - Your AWS secret key
   - **Session Token** (optional) - For temporary credentials
   - **Region** - AWS region (e.g., us-east-1)
4. Select your preferred model
5. Click "Test Connection" to verify

**Required AWS Permissions:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream"
      ],
      "Resource": "*"
    }
  ]
}
```

### Google Gemini Setup
1. Get an API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Select "Google Gemini" as the provider
3. Enter your API key
4. Select a model (auto-fetched from API)
5. Test the connection

### Groq Setup
1. Get an API key from [GroqCloud](https://console.groq.com/keys)
2. Select "Groq" as the provider
3. Enter your API key
4. Select a model (auto-fetched from API)
5. Test the connection

## Usage

### Opening the Chat Panel
- Click the robot icon in the left ribbon
- Or use the command palette: "AI Assistant: Open Chat"

### Basic Chat
Simply type your question and press Enter or click Send. The AI will respond with context from your active note (if enabled).

### Referencing Notes
Use `@` to reference additional notes for context:
1. Type `@` in the input field
2. Search and select notes from the dropdown
3. Selected notes appear as tags above the input
4. The AI will use their content to answer your questions

### Editing Notes
Ask the AI to edit your notes naturally:
- "Add a summary section at the end"
- "Replace the introduction with a better version"
- "Fix the typos in the selected text"
- "Insert a table of contents after the title"

When the AI suggests edits, an **Apply Edit** button will appear (pulsing green). Click it to apply the changes to your note.

### Context Toggle
Use the toggle switch to enable/disable automatic context inclusion:
- **ON** - AI sees your active note's content
- **OFF** - AI responds without note context

### Transform Prompts
Transform your entire document into professional formats:
1. Click the **Transform** card on the welcome screen
2. Select a format (Pyramid, Business, Management, etc.)
3. Click **Done** - the transform tag appears in the input area
4. Optionally add custom instructions
5. Press Send - the AI will restructure your document

Transform prompts use specialized system prompts optimized for each format, ensuring high-quality output.

### Mermaid Diagrams
Ask the AI to create diagrams:
- "Create a flowchart showing the user registration process"
- "Make a sequence diagram for the API call flow"

The AI will generate Mermaid code that's automatically sanitized for Obsidian compatibility.

## Settings

| Setting | Description | Default |
|---------|-------------|---------|
| Provider | AI service to use | AWS Bedrock |
| Model | Specific model for the provider | Varies |
| Max Tokens | Maximum response length | 8192 |
| Temperature | Response creativity (0-1) | 0.7 |
| System Prompt | Custom instructions for the AI | Empty |
| Auto Include Context | Include active note in requests | Enabled |
| Stream Responses | Show responses as they generate | Enabled |
| Excluded Notes | Notes to never include in context | Empty |

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Enter` | Send message |
| `Shift+Enter` | New line in message |
| `@` | Open note reference picker |

## Troubleshooting

### "Authentication Failed"
- Verify your API key is correct
- Check if the key has expired
- Ensure the key has proper permissions

### "Model Access Denied"
- The model may require special access
- Try selecting a different model
- Check your API subscription tier

### "Rate Limit Exceeded"
- Wait a moment before trying again
- Consider upgrading your API plan
- Reduce request frequency

### "Network Error"
- Check your internet connection
- Verify the API endpoint is accessible
- Check if a firewall is blocking requests

### Edits Not Applying
- Make sure you have a note open in edit mode
- Click on the note before clicking Apply Edit
- Check if the text to find actually exists

## Architecture

```
src/
├── main.ts              # Plugin entry point
├── chatView.ts          # Chat UI component
├── settings.ts          # Settings tab
├── types.ts             # TypeScript interfaces
├── llmServiceManager.ts # Service orchestration
├── bedrockService.ts    # AWS Bedrock integration
├── geminiService.ts     # Google Gemini integration
├── groqService.ts       # Groq integration
├── modelFetcher.ts      # Dynamic model fetching
├── contextBuilder.ts    # Prompt construction
├── transformPrompts.ts  # Transform prompt templates
├── noteController.ts    # Note read/write operations
├── editProtocol.ts      # Edit command parsing
└── mermaidHandler.ts    # Diagram processing
```

## Privacy & Security

- **API keys are stored locally** in your Obsidian vault's config
- **No data is sent to third parties** except your chosen AI provider
- **Note content is only sent** when context is enabled
- **Conversation history** is session-only, not persisted to disk

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## Support

- **Issues**: [GitHub Issues](https://github.com/karthyick/Obsidian_Copilot/issues)
- **Discussions**: [GitHub Discussions](https://github.com/karthyick/Obsidian_Copilot/discussions)

## License

MIT License - see [LICENSE](LICENSE) for details.

## Author

**KR** - [@karthyick](https://github.com/karthyick)

---

Made with love for the Obsidian community
