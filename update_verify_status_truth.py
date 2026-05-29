with open("scripts/verify-status-truth.ts", "r") as f:
    content = f.read()

# Replace rg with find since rg is not available
target = "const rawFiles = execSync('rg --files src test docs .github/workflows scripts').toString('utf8').trim();"
replacement = "const rawFiles = execSync('find src test docs .github/workflows scripts -type f').toString('utf8').trim();"

content = content.replace(target, replacement)

with open("scripts/verify-status-truth.ts", "w") as f:
    f.write(content)
