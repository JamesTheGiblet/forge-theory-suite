# Contributing to Fluffy Bot / Cool Boy 🎭

First off, thanks for taking the time to contribute! 🎉

## How Can I Contribute?

### 🐛 Reporting Bugs

Before creating bug reports, please check the existing issues. When you create a bug report, include as many details as possible:

- **Use a clear and descriptive title**
- **Describe the exact steps to reproduce the problem**
- **Provide specific examples**
- **Describe the behavior you observed and what you expected**
- **Include screenshots if possible**
- **Note your browser and version**

### 💡 Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion:

- **Use a clear and descriptive title**
- **Provide a detailed description of the suggested enhancement**
- **Explain why this enhancement would be useful**
- **List some examples of where this enhancement could be used**

### 🔧 Pull Requests

1. **Fork the repo** and create your branch from `main`
2. **Make your changes**
3. **Test thoroughly** - make sure nothing breaks
4. **Update documentation** if needed
5. **Write clear commit messages**
6. **Submit your pull request**

#### Pull Request Guidelines

- Follow the existing code style
- Keep commits focused and atomic
- Write meaningful commit messages
- Update README.md if you add/change features
- Add yourself to CONTRIBUTORS.md

## Development Setup

```bash
# Clone your fork
git clone https://github.com/JamesTheGiblet/BuddAI-Lite.git
cd BuddAI-lite

# Create a branch
git checkout -b feature/my-new-feature

# Make changes and test by opening chatbot.html in browser

# Commit
git commit -m "Add amazing feature"

# Push
git push origin feature/my-new-feature
```

## Code Style

### JavaScript

- Use ES6+ features
- Use descriptive variable names
- Comment complex logic
- Keep functions focused and small
- Avoid global variables when possible

### CSS

- Use consistent naming conventions
- Group related styles
- Comment major sections
- Mobile-first responsive design

### JSON

- Use 2-space indentation
- Keep response arrays organized
- Add comments where helpful (in documentation)

## Adding New Features

### Adding New Domain Knowledge

Edit `technicalKnowledge` object in `chatbot.html`:

```javascript
const technicalKnowledge = {
    yourNewDomain: {
        topics: ["Topic 1", "Topic 2"],
        tools: ["Tool 1", "Tool 2"],
        // ... more categories
    }
};
```

### Adding Custom Responses

Edit `training-data.json`:

```json
{
  "customResponses": {
    "fluffy": {
      "new keyword": ["Response 1", "Response 2"]
    },
    "coolboy": {
      "new keyword": ["Response 1", "Response 2"]
    }
  }
}
```

### Adding New UI Components

1. Add HTML structure in appropriate section
2. Add CSS styling with clear class names
3. Add JavaScript functionality
4. Test across browsers
5. Ensure mobile responsiveness

## Testing

Before submitting:

1. **Test in multiple browsers** (Chrome, Firefox, Safari, Edge)
2. **Test on mobile** devices
3. **Test voice features** (if modified)
4. **Test localStorage** persistence
5. **Test export features**
6. **Verify no console errors**

## Documentation

When adding features:

- Update README.md
- Add usage examples
- Update FAQ if applicable
- Comment your code
- Update roadmap if it's a planned feature

## Community

- Be respectful and constructive
- Follow the [Code of Conduct](CODE_OF_CONDUCT.md)
- Help others in discussions
- Share your improvements

## Recognition

Contributors will be added to CONTRIBUTORS.md. Major contributors may be highlighted in README.md.

## Questions?

Feel free to open an issue with your question or reach out via:

- GitHub Discussions
- Email: <Gibletscreations@gmail.com>

---

**Thank you for contributing! 🙏**

Made with 💖 by the community
