# Contributing to Praximous

First off, thank you for considering contributing to Praximous! It's people like you that make Praximous a powerful and community-driven platform. Every contribution is appreciated, from reporting a typo to submitting a new feature.

This document provides guidelines for contributing to the project. Please feel free to propose changes to this document in a pull request.

## Code of Conduct

Praximous and its community are governed by the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## How Can I Contribute?

### Reporting Bugs

If you find a bug, please ensure it hasn't already been reported by searching on GitHub under **Issues**.

If you're unable to find an open issue addressing the problem, [open a new one](https://github.com/JamesTheGiblet/praximous_mvp_scaffold/issues/new). Be sure to include a **title and clear description**, as much relevant information as possible, and a **code sample or an executable test case** demonstrating the expected behavior that is not occurring.

### Suggesting Enhancements

If you have an idea for a new feature or an improvement to an existing one, please [open an issue](https://github.com/JamesTheGiblet/praximous_mvp_scaffold/issues/new) to start a discussion. This allows us to coordinate efforts and ensure the proposed change aligns with the project's goals.

## Your First Code Contribution

Unsure where to begin contributing to Praximous? You can start by looking through `good-first-issue` and `help-wanted` issues:

- **Good first issues** - issues which should only require a few lines of code, and a test or two.
- **Help wanted issues** - issues which should be a bit more involved than `good-first-issue` issues.

### Development Setup

To get your development environment set up, please follow the **Quickstart** guide in the main README.md. This will guide you through cloning the repository, setting up your `.env` file, and launching the application with Docker.

A typical setup workflow is:

1. Fork the `praximous_mvp_scaffold` repository on GitHub.
2. Clone your fork locally:

    ```bash
    git clone https://github.com/YOUR_USERNAME/praximous_mvp_scaffold.git
    ```

3. Follow the setup steps in `README.md` to get the application running.
4. Create a new branch for your changes:

    ```bash
    git checkout -b feature/my-awesome-feature
    ```

### Pull Request Process

1. **Make your changes** in your local repository.

2. **Follow the Coding Style**:
    - For general Python code, we aim for clean, readable code. We recommend using an autoformatter like `black`.
    - For new Smart Skills, please adhere to the conventions outlined in the Skill Development Guide.

3. **Add Tests**: If you add new functionality, please add corresponding tests. If you fix a bug, add a test that demonstrates the bug was fixed.

4. **Update Documentation**: If your changes affect the user-facing functionality, API, or configuration, please update the relevant documentation in the `docs/` directory.

5. **Ensure all tests pass**. You can run tests within the Docker environment if needed.

6. **Use Conventional Commits**. We follow the Conventional Commits specification. This helps us automate changelogs and versioning. Your commit messages should be structured as follows:

    ```text
    <type>[optional scope]: <description>

    [optional body]

    [optional footer(s)]
    ```

    Common types include:
    - `feat`: A new feature
    - `fix`: A bug fix
    - `docs`: Documentation only changes
    - `style`: Changes that do not affect the meaning of the code (white-space, formatting, etc)
    - `refactor`: A code change that neither fixes a bug nor adds a feature
    - `test`: Adding missing tests or correcting existing tests
    - `chore`: Changes to the build process or auxiliary tools and libraries

    **Example:**

    ```text
    feat(skills): add new weather skill

    This commit introduces a new Smart Skill that can fetch current weather
    conditions from an external API. It requires a WEATHER_API_KEY to be set
    in the .env file.
    ```

7. **Push your branch** to your fork on GitHub:

    ```bash
    git push origin feature/my-awesome-feature
    ```

8. **Open a Pull Request** against the `main` branch of the `JamesTheGiblet/praximous_mvp_scaffold` repository. Provide a clear description of the changes and link to any relevant issues.

Once your PR is submitted, a project maintainer will review it. We may suggest some changes or improvements. We'll do our best to provide timely feedback.

Thank you for your contribution!
