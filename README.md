<!-- ⚠️ This README has been generated from the file(s) "README" ⚠️--><p align="center">
  <img src="logo.png" alt="Logo" width="323" height="113" />
</p> <p align="center">
  <b>Sexy commits using gitmoji.dev and inquirer-autocomplete-prompt</b></br>
  <sub><sub>
</p>

<br />


[![version](https://img.shields.io/badge/version-0.2.2-green.svg)](https://semver.org)

Sexy commits using your config from `package.json`.

Uses `gitmoji` mapping config from your `package.json` and `inquirer` to prompt you for what you did and a prief explanation (used as commit message).

```json
{
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


[![-----------------------------------------------------](https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/rainbow.png)](#this-is-how-it-works)

## ➤ This is how it works

### Add npm script

Add npm script `commit` that runs `sexy-commits`.

```json
{
  "scripts": {
    "commit": "sexy-commits"
  }
}
```


### Run the script

```shell
npm run commit
```



### Select what you did

![image-20210326144343892](assets/image-20210326144343892.png)

### Enter a short summary

![image-20210326144354677](assets/image-20210326144354677.png)

### With arguments

You can also call run `sexy-commits`with args.

```shelll
npm run commit [add] [type] [messaee]
```


Where **[add]** is what do add - either `all`or a pattern, and **[type]** is what kind of change you did (depends on your `gitmoji` config).

#### Example 1

You did a **fix** and want to commit **all changes**:

```shell
npm run commit all fix
```



#### Example 2

You did a **style** adjustment and want to commit only what's in the **theme** folder.

```shell
npm run commit style theme "updated dark theme"
```



### NSFW

Don't want that ASCII lady? Set **SEXY_COMMITS_NSFW** to **1** in your environment file.

![image-20210329114241281](assets/image-20210329114241281.png)