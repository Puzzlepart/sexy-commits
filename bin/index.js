#!/usr/bin/env node
"use strict";
const inquirer = require('inquirer')
inquirer.registerPrompt('autocomplete', require('inquirer-autocomplete-prompt'))
const path = require('path')
const util = require('util')
const { cyan, white, red } = require('chalk')
const log = console.log
const { gitmoji } = require('../../../package.json')
const child_process = require('child_process')
const exec = util.promisify(child_process.exec)

async function commit_changes() {
    const input = await inquirer.prompt([
        {
            type: 'autocomplete',
            name: 'commit_prefix',
            message: 'What did you do?',
            source: async (_a, input) => {
                const types = Object.keys(gitmoji)
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
            message: 'Enter a commit message:'
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