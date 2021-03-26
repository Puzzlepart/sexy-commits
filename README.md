<!-- ⚠️ This README has been generated from the file(s) "README" ⚠️--><p align="center">
  <b>Sexy commits using gitmoji.dev</b></br>
  <sub><sub>
</p>

<br />


[![version](https://img.shields.io/badge/version-0.0.11-green.svg)](https://semver.org)

Sexy commits using your config from `package.json`.

For now it needs both `commitlint.rules.type-enum` and `gitmoji` for the emoji mapping.

```json
{
  "commitlint": {
    "extends": [
      "@commitlint/config-conventional"
    ],
    "rules": {
      "type-enum": [
        2,
        "always",
        [
          "build",
          "ci",
          "chore"
        ]
      ]
    }
  },
  "gitmoji": {
    "build": [
      "🏗️",
      "Make architectural changes"
    ],
    "ci": [
      "👷",
      "Add or update CI build system"
    ],
    "chore": [
      "💄",
      "Boring chores"
    ]
  }
}
```