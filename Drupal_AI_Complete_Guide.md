# Complete Guide to Drupal AI: Modules, Providers, Recipes & Everything You Need to Know

## Overview

Drupal AI represents a revolutionary advancement in content management, integrating artificial intelligence capabilities directly into the Drupal ecosystem. This comprehensive guide covers everything you need to know about Drupal AI, from core modules to advanced implementations.

## Table of Contents

1. [Core AI Module](#core-ai-module)
2. [AI Providers](#ai-providers)
3. [AI Modules Ecosystem](#ai-modules-ecosystem)
4. [AI Recipes and Workflows](#ai-recipes-and-workflows)
5. [Implementation Examples](#implementation-examples)
6. [Vector Databases & RAG](#vector-databases--rag)
7. [Content Generation & Automation](#content-generation--automation)
8. [Cost Considerations](#cost-considerations)
9. [Installation & Setup](#installation--setup)
10. [Community Resources](#community-resources)

---

## Core AI Module

### The Main AI Module
The **AI (Artificial Intelligence)** module is the cornerstone of Drupal's AI ecosystem. Think of it as a "Swiss Army knife for AI in Drupal" that provides:

- **Provider Abstraction Layer**: Supports multiple AI providers through a unified API
- **AI Assistants Framework**: Create chatbots and AI assistants
- **Content Integration**: Seamless integration with Drupal's content management
- **Configuration Management**: Advanced settings for AI workflows

**Current Status**: The module is under active development. Use the `1.0.x-dev` version for latest features.

### Key Submodules

#### AI Explorer
- Admin interface for testing text generation
- Ideal for prompt testing and experimentation
- Access at: `/admin/config/ai/explorers`

#### AI Search (Experimental)
- Semantic search capabilities
- LLM chatbot for content exploration
- Retrieval Augmented Generation (RAG) support
- Vector database integration (Milvus, Zilliz, Pinecone)

#### AI Automators
- Workflow automation using AI
- Chain multiple AI tools together
- No-code AI implementation
- Integration with ECA (Event, Condition, Actions) module

#### AI Agents
- Site building and administration assistance
- Drupal configuration management via AI
- AI-powered content type creation
- View generation and management

#### AI Content
- Content generation and editing
- AI-powered content enhancement
- Bulk content operations

#### AI Chatbot
- Embeddable chatbot functionality
- RAG-powered content assistance
- Customizable chat interfaces

---

## AI Providers

The Drupal AI ecosystem supports numerous AI providers, each with specific capabilities:

### Free Providers

#### amazee.ai (Recommended for Beginners)
- **Cost**: FREE
- **Setup**: Only requires email address
- **Features**: Privacy-focused, GDPR-compliant
- **Benefits**: No API key management required
- **Best for**: Testing and small-scale implementations

### Commercial Providers

#### OpenAI
- **Models**: GPT-4, GPT-3.5, DALL-E, Whisper
- **Capabilities**: Text generation, image creation, speech-to-text
- **API Types**: Legacy keys vs. Project API keys
- **Cost**: Pay-per-use (typically $1 for extensive testing)

#### Anthropic
- **Models**: Claude series
- **Strengths**: Longer context windows, safety-focused

#### Google Gemini
- **Models**: Various Gemini variants
- **Integration**: Through separate provider modules

#### Others
- **Groq**: Fast inference
- **Hugging Face**: Open-source models
- **Ollama**: Local LLM execution
- **Mistral**: European AI provider
- **AWS Bedrock**: Enterprise AI services
- **ElevenLabs**: Voice synthesis
- **Deepgram**: Speech recognition
- **DeepL**: Translation services

---

## AI Modules Ecosystem

### Core Modules for Installation

```bash
composer require drupal/ai drupal/ai_agents drupal/unstructured

# Enable required modules
drush en ai ai_content provider_openai ai_agents ai_assistant_api ai_content_types ai_views ai_chatbot unstructured
```

### Specialized Modules

#### Provider Modules
- `provider_openai` - OpenAI integration
- `provider_anthropic` - Anthropic Claude
- `auphonic` - Audio processing
- `elevenlabs_field` - Voice synthesis

#### Vector Database Providers
- `vdb_provider_milvus` - Milvus vector database
- `vdb_provider_pinecone` - Pinecone integration

#### Content Enhancement
- `ai_content_creator` - Basic content generation
- `content_ai` - Advanced content AI features
- `openai_image` - AI image generation field widget

#### Search & RAG
- `vertex_ai_search` - Google Vertex AI Search
- `ai_search` - Semantic search capabilities

### Third-Party Modules

#### Varbase AI
- **Repository**: [Vardot/varbase_ai](https://github.com/Vardot/varbase_ai)
- **Purpose**: AI recipes for Varbase distribution
- **Features**: Pre-configured AI workflows for editorial teams

#### Community Modules
- **DrupalGPT**: Website chatbot conversion
- **OpenAI Image Generator**: Field widget for AI images
- **DeepAI Integration**: Node generation with DeepAI

---

## AI Recipes and Workflows

### Workflows of AI Platform
The [Workflows of AI](https://workflows-of-ai.com/) platform showcases dozens of practical AI implementations:

#### Content Creation Workflows
- **Video to Article**: Convert videos to full articles
- **Audio Transcription**: MP3 to text with summarization
- **Image to Text**: Generate articles from images
- **PDF Processing**: Create FAQs from documents

#### Media Enhancement
- **Background Removal**: Automated image processing
- **Image Upscaling**: Quality enhancement
- **Audio Normalization**: Consistent audio levels
- **Video Editing**: AI-powered video cutting

#### Content Management
- **Auto-Tagging**: Generate taxonomy terms
- **Content Categorization**: Automatic classification
- **Sentiment Analysis**: Content mood detection
- **Fact Checking**: Automated content verification

#### Advanced Workflows
- **RAG Chatbots**: Knowledge base integration
- **Multi-language Support**: Content translation
- **SEO Optimization**: Automated metadata generation
- **Accessibility**: Alt-text generation

### ECA Integration

The Event, Condition, Actions (ECA) module enables visual workflow creation:

#### Available AI Actions
- ChatGPT Completion
- Text Completion
- Speech to Text
- Text-to-Speech
- Content Moderation
- Text Embedding Generation

#### Example Workflow
```
Event: Node Save
Condition: Summary field is empty
Action: Generate summary from body text using AI
Result: Auto-populated summary field
```

---

## Implementation Examples

### RAG (Retrieval-Augmented Generation) Implementation

#### Tech Stack
- **CMS**: Drupal
- **Vector Database**: Milvus (open-source) or Zilliz (cloud)
- **LLM**: OpenAI (or other providers)
- **Search**: Search API integration

#### Setup Process
1. **Install Vector Database Provider**
   ```bash
   cp web/modules/contrib/ai/vdb_providers/vdb_provider_milvus/docs/docker-compose-examples/ddev-example.docker-compose.milvus.yaml .ddev/docker-compose.milvus.yaml
   ```

2. **Configure Search API Server**
   - Database: `db1`
   - Collection: `collection1`
   - Similarity Metric: Cosine similarity

3. **Set Up Content Indexing**
   - Fields: Rendered HTML, creation date, content type, title
   - Chunk size: 500 max_tokens
   - Overlap: 100 max_tokens

4. **Configure AI Search Backend**
   - Embeddings: OpenAI text-embedding-3-small
   - Vector Database: Milvus DB
   - Dimensions: 1536

### Chatbot Implementation

```php
// Example chatbot configuration
$assistant_config = [
  'label' => 'Drupal Site Building Helper',
  'description' => 'AI assistant for site building tasks',
  'prompt' => 'You are an assistant helping with Drupal site administration',
  'agents' => ['all_enabled'],
];
```

### Content Generation Examples

#### Automatic Summary Generation
```yaml
# ECA Model example
events:
  - entity:content:presave
conditions:
  - field_summary: empty
actions:
  - ai_generate_summary:
      source_field: body
      target_field: field_summary
      provider: openai
```

---

## Vector Databases & RAG

### Supported Vector Databases

#### Milvus
- **Type**: Open-source
- **Hosting**: Local or cloud (Zilliz)
- **Benefits**: High performance, free local deployment
- **Use case**: Development and production

#### Pinecone
- **Type**: Cloud service
- **Benefits**: Managed service, scalable
- **Use case**: Production environments

#### ChromaDB
- **Type**: Open-source
- **Benefits**: Lightweight, easy setup
- **Use case**: Small to medium implementations

### RAG Benefits

1. **Reduced Hallucinations**: AI responses grounded in your content
2. **Contextual Accuracy**: Responses based on your specific data
3. **Multilingual Search**: Find content regardless of query language
4. **Semantic Understanding**: Context-aware search results

### RAG Implementation Workflow

1. **Content Chunking**: Break content into searchable segments
2. **Embedding Generation**: Convert chunks to vector representations
3. **Vector Storage**: Store in specialized database
4. **Query Processing**: Convert user queries to vectors
5. **Similarity Search**: Find relevant content chunks
6. **Response Generation**: Use chunks to inform AI responses

---

## Content Generation & Automation

### AI Content Creator Module
- **Purpose**: Basic content generation
- **Limitation**: Requires legacy OpenAI keys
- **Status**: Needs updates for current models

### Advanced Content Workflows

#### Automated Content Enhancement
- **Meta tag generation**: SEO optimization
- **Alt-text creation**: Accessibility compliance
- **Summary generation**: Content snippets
- **Translation**: Multi-language support

#### Content Moderation
- **NSFW Detection**: Automated content filtering
- **Fact Checking**: Accuracy verification
- **Sentiment Analysis**: Content tone assessment
- **Compliance Checking**: Regulatory adherence

### Content Pipeline Examples

#### Blog Post Generation
1. **Input**: Keywords or topics
2. **Processing**: AI content generation
3. **Enhancement**: SEO optimization, image generation
4. **Review**: Quality control and editing
5. **Publication**: Automated or manual approval

#### Media Processing
1. **Upload**: Audio/video content
2. **Transcription**: Speech-to-text conversion
3. **Summarization**: Key points extraction
4. **Tagging**: Automatic categorization
5. **Enhancement**: Metadata generation

---

## Cost Considerations

### Free Options
- **amazee.ai**: Completely free provider
- **Ollama**: Local LLM execution (no API costs)
- **Open-source models**: Via Hugging Face

### Paid Providers
- **OpenAI**: ~$1 for extensive testing, pay-per-use
- **Anthropic**: Similar pricing to OpenAI
- **Google Gemini**: Competitive pricing
- **AWS Bedrock**: Enterprise pricing

### Cost Optimization Strategies
1. **Use free providers for development**
2. **Implement caching for repeated queries**
3. **Optimize prompt length and frequency**
4. **Use local models for suitable tasks**
5. **Monitor usage with provider dashboards**

---

## Installation & Setup

### Prerequisites
- Drupal 10+
- Composer
- API keys for chosen providers
- Key module for secure API key storage

### Basic Installation

```bash
# Install core modules
composer require drupal/ai drupal/ai_agents drupal/key

# Enable modules
drush en ai ai_content provider_openai key

# Configure API keys
# Navigate to: /admin/config/system/key
# Add OpenAI key with Authentication type
```

### Provider Configuration

#### OpenAI Setup
1. **Create API Key**: OpenAI platform → API keys
2. **Store Securely**: Use Key module
3. **Configure Provider**: `/admin/config/ai/providers`
4. **Test Connection**: Use AI Explorer

#### amazee.ai Setup
1. **No API key required**
2. **Signup with email**
3. **Automatic configuration**
4. **Immediate usage**

### Advanced Configuration

#### AI Assistant Creation
```php
// Assistant configuration
$assistant = [
  'label' => 'Content Helper',
  'prompt' => 'You help with content creation and editing',
  'agents' => ['content_generation', 'seo_optimization'],
  'advanced_mode' => TRUE,
];
```

#### ECA Workflow Setup
1. **Install ECA module**
2. **Create workflow diagram**
3. **Configure AI actions**
4. **Test and deploy**

---

## Community Resources

### Official Resources
- **Drupal.org Project**: [drupal.org/project/ai](https://drupal.org/project/ai)
- **Documentation**: Available on project page
- **Issue Queue**: Bug reports and feature requests

### Community Channels
- **Drupal Slack**: #ai channel
- **YouTube**: AI module tutorials and demos
- **Workflows of AI**: Practical examples and tutorials

### Key Contributors
- **Marcus Johansson**: Lead developer, workflow examples
- **Scott Euser**: RAG implementation tutorials
- **Kevin Quillen**: ECA integration examples

### Learning Resources
- **Drupal at your Fingertips**: Comprehensive AI chapter
- **DrupalCon Presentations**: Latest AI developments
- **Community Blogs**: Implementation experiences

### Getting Help
- **Drupal Slack**: Real-time community support
- **Stack Overflow**: Technical questions
- **Drupal.org Forums**: General discussions
- **GitHub Issues**: Module-specific problems

---

## Future Developments

### Planned Features
- **Enhanced AI Agents**: More sophisticated site building assistance
- **Improved RAG**: Better semantic search capabilities
- **Advanced Workflows**: More complex automation possibilities
- **Performance Optimization**: Faster processing and lower costs

### Emerging Trends
- **Multi-modal AI**: Combined text, image, and audio processing
- **Edge AI**: Local processing capabilities
- **Specialized Models**: Domain-specific AI implementations
- **Enterprise Features**: Advanced governance and compliance tools

### Contributing
The Drupal AI ecosystem thrives on community contributions:
- **Code Contributions**: Module development and improvements
- **Documentation**: Tutorials and implementation guides
- **Testing**: Bug reports and feature validation
- **Workflow Sharing**: Community example implementations

---

## Conclusion

Drupal AI represents a significant advancement in content management, offering unprecedented automation and intelligence capabilities. From simple content generation to complex RAG implementations, the ecosystem provides tools for organizations of all sizes.

**Key Takeaways:**
1. **Start with amazee.ai** for cost-free experimentation
2. **Use the AI module** as your foundation
3. **Implement RAG** for advanced search capabilities
4. **Leverage ECA** for visual workflow creation
5. **Join the community** for support and inspiration

The future of content management is AI-augmented, and Drupal is positioned at the forefront of this transformation. Whether you're a developer, content creator, or site administrator, Drupal AI offers tools to enhance your workflow and improve your user experience.

---

*This guide represents the current state of Drupal AI as of 2024. The ecosystem is rapidly evolving, so check official documentation and community resources for the latest updates.*