#!/usr/bin/env node
"use strict";
const inquirer = require('inquirer')
inquirer.registerPrompt('autocomplete', require('inquirer-autocomplete-prompt'))
const util = require('util')
const { cyan, white, red } = require('chalk')
const log = console.log
const fs = require('fs')
const packageJson = require('../../../package.json')
const { gitmoji: default_config } = require('./default_config.json')
const child_process = require('child_process')
const exec = util.promisify(child_process.exec)
const writeFileAsync = util.promisify(fs.writeFile)

async function commit_changes() {
    let { gitmoji } = packageJson
    if (!gitmoji) {
        const { add_defaults } = await inquirer.prompt([
            {
                type: 'input',
                name: 'add_defaults',
                message: `You don\'t have ${cyan(gitmoji)} config in your package.json. Add defaults?`,
                default: true
            }
        ])
        if (!add_defaults) {
            process.exit(0)
        }
        await writeFileAsync('../../../package.json', JSON.stringify({
            ...packageJson,
            gitmoji: default_config
        }, null, 2))
        gitmoji = default_config
    }
    const input = await inquirer.prompt([
        {
            type: 'autocomplete',
            name: 'commit_prefix',
            message: 'What did you do?',
            source: async (_a, input) => {
                const types = Object.keys(packageJson.gitmoji)
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
        },
        {
            type: 'input',
            name: 'commit_message',
            message: 'A short summary of what you changed:'
        },
        {
            type: 'confirm',
            name: 'push',
            message: 'Do you want to push the changes right away?',
            default: true
        }
    ])
    let commit_message = `${input.commit_prefix}: ${input.commit_message.toLowerCase()}`
    try {
        await exec('git add --all')
        if (gitmoji[input.commit_prefix]) {
            commit_message += ` ${gitmoji[input.commit_prefix][0]}`
        }
        await exec(`git commit -m "${commit_message}" --no-verify`)
        if (input.push) {
            await exec('git pull')
            await exec('git push')
        }
        log(cyan(`\nSuccesfully commited changes with message:\n\n${white(commit_message)}\n`))
    } catch (error) {
        log(red('An error occured commiting your changes.'))
    } finally {
        process.exit(0)
    }
}

commit_changes()