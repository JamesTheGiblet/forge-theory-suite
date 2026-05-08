# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 2.0.x   | ✅ Yes             |
| < 2.0   | ❌ No              |

## Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability, please follow these steps:

### 🔒 For Security Issues

**DO NOT** create a public GitHub issue.

Instead, please email: **<security@gibletscreations.com>** (or your email)

Include:

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if you have one)

### Response Time

- **Initial Response:** Within 48 hours
- **Status Update:** Within 7 days
- **Fix Timeline:** Depends on severity (1-30 days)

### What to Expect

1. **Acknowledgment** - We'll confirm receipt of your report
2. **Assessment** - We'll investigate and assess the severity
3. **Fix** - We'll develop and test a fix
4. **Disclosure** - We'll coordinate disclosure timeline with you
5. **Credit** - We'll acknowledge your contribution (if desired)

## Security Best Practices

### For Users

- **Keep browser updated** - Use the latest version of your browser
- **Review code** - This is open-source; feel free to audit it
- **Incognito mode** - localStorage won't persist in private browsing
- **Export regularly** - Back up your data using export features
- **Clear data** - Use the "Clear" button to remove sensitive conversations

### For Developers

- **Validate input** - Always sanitize user input
- **XSS Prevention** - Escape HTML in user-generated content
- **localStorage limits** - Don't store sensitive data
- **HTTPS only** - Deploy only on HTTPS domains
- **CSP headers** - Implement Content Security Policy

## Known Security Considerations

### ✅ Safe

- No external API calls (privacy-first)
- No tracking or analytics
- Data stays in browser
- No cookies
- Open source code

### ⚠️ Be Aware

- **localStorage** is not encrypted
- **Browser extensions** can access localStorage
- **Shared computers** - Data persists across sessions
- **Export files** - Contain full conversation history

## Security Updates

Security updates will be released as patch versions and documented in [CHANGELOG.md](CHANGELOG.md).

Subscribe to releases to stay informed:

- Watch this repository
- Enable release notifications

---

**Thank you for helping keep Fluffy Bot / Cool Boy secure! 🔒**
