#!/usr/bin/env node
"use strict";
require('dotenv').config()
const inquirer = require('inquirer')
inquirer.registerPrompt('autocomplete', require('inquirer-autocomplete-prompt'))
const util = require('util')
const { cyan, white, red } = require('chalk')
const log = console.log
const fs = require('fs')
const path = require('path')
const packageJson = require('../../../package.json')
const { gitmoji: default_config } = require('./default_config.json')
const child_process = require('child_process')
const exec = util.promisify(child_process.exec)
const writeFileAsync = util.promisify(fs.writeFile)
const readFileAsync = util.promisify(fs.readFile)
const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')
const argv = yargs(hideBin(process.argv)).argv

async function commit_changes() {
    if (process.env.SEXY_COMMITS_NSFW !== '1') {
        log(cyan(await readFileAsync(path.resolve(__dirname, 'banner.txt'))).toString())
    }
    const [
        add_changes,
        commit_prefix,
        commit_message
    ] = argv._
    let { gitmoji } = packageJson
    if (!gitmoji) {
        const { add_defaults } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'add_defaults',
                message: `You don\'t have ${cyan('gitmoji')} config in your package.json. Add defaults?`,
                default: true
            }
        ])
        if (!add_defaults) {
            process.exit(0)
        }
        const newPackageJson = {
            ...packageJson,
            gitmoji: default_config
        }
        await writeFileAsync(
            path.resolve(__dirname, '../../../package.json'),
            JSON.stringify(newPackageJson, null, 2)
        )
        gitmoji = default_config
    }
    const types = Object.keys(gitmoji)
    const input = await inquirer.prompt([
        {
            type: 'input',
            name: 'add_changes',
            message: 'What changes do you want to include?',
            default: 'all',
            when: !add_changes
        },
        {
            type: 'autocomplete',
            name: 'commit_prefix',
            message: 'What did you do?',
            source: async (_a, input) => {
                return types
                    .filter(
                        (type) =>
                            type.toLowerCase().indexOf((input || '').toLowerCase()) !== -1
                    )
                    .map((type) => ({
                        value: type,
                        name: gitmoji[type].join('\t')
                    }))
            },
            when: !types.includes(commit_prefix)
        },
        {
            type: 'input',
            name: 'commit_message',
            message: 'A short summary of what you changed:',
            when: !commit_message
        },
        {
            type: 'confirm',
            name: 'push',
            message: 'Do you want to push the changes right away?',
            default: true
        }
    ])
    let mergedInput = Object.assign({ add_changes, commit_prefix }, input)
    let commit_message_with_prefix = `${mergedInput.commit_prefix}: ${mergedInput.commit_message.toLowerCase()}`
    try {
        if (mergedInput.add_changes === 'all') await exec('git add --all')
        else await exec(`git add "*${mergedInput.add_changes}*"`)
        if (gitmoji[mergedInput.commit_prefix]) {
            commit_message_with_prefix += ` ${gitmoji[mergedInput.commit_prefix][0]}`
        }
        await exec(`git commit -m "${commit_message_with_prefix}" --no-verify`)
        if (mergedInput.push) {
            await exec('git pull')
            await exec('git push')
        }
        log(cyan(`\nSuccesfully commited changes with message:\n\n${white(commit_message_with_prefix)}\n`))
    } catch (error) {
        log(red('An error occured commiting your changes.'))
    } finally {
        process.exit(0)
    }
}

commit_changes()