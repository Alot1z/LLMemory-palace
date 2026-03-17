# Task: CI/CD + NPM Publish

**Scope:**
- `.github/workflows/test.yml` - Run tests on push/PR
- `.github/workflows/publish.yml` - Auto-publish on tag
- Update `package.json` for npm publish

**Acceptance:**
- Tests run on node 18, 20, 22
- Publish workflow triggers on v* tags
- package.json has correct publish config
