#!/usr/bin/env node
'use strict'
require('dotenv').config()
const inquirer = require('inquirer')
inquirer.registerPrompt('autocomplete', require('inquirer-autocomplete-prompt'))
const { promisify } = require('util')
const chalk = require('chalk')
const log = console.log
const fs = require('fs')
const path = require('path')
const packageJson = require(process.env.PWD + '/package.json')
const { gitmoji: defaultConfig } = require('./defaultConfig.json')
const { exec } = require('child_process')
const execAsync = promisify(exec)
const writeFileAsync = promisify(fs.writeFile)
const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')
const argv = yargs(hideBin(process.argv)).argv
const _ = require('lodash')

/**
 * Parse args using `argv`
 *
 * @param gitmoji - Gitmoji config
 *
 * @returns `addPattern`, `commitType` and `message`
 */
function parseArgs(gitmoji) {
	try {
		const types = Object.keys(gitmoji)
		const [addPattern, commitType, ...message_] = argv._
		const message = message_.join(' ')
		if (!commitType || types.includes(commitType)) {
			return {
				..._.omit(argv, ['_', '$0']),
				addPattern,
				commitType,
				message,
			}
		}

		const commitType_ = types.find((key) => {
			const alias = gitmoji[key][2]
			return alias && Boolean(alias.includes(commitType))
		})
		if (!commitType_) {
			log(
				chalk.yellow(
					`Commit type ${chalk.cyan(commitType)} not found in your ${chalk.cyan(
						'gitmoji'
					)} config 😞`
				)
			)
			process.exit(0)
		}

		return {
			..._.omit(argv, ['_', '$0']),
			addPattern,
			commitType: commitType_,
			message
		}
	} catch {
		log(chalk.yellow("We couldn't parse your arguments 😞"))
		return {}
	}
}

/**
 * Commit changes using arguments and prompts
 */
async function run() {
	let { gitmoji } = packageJson
	if (!gitmoji && fs.existsSync(path.resolve(process.cwd(), '.gitmoji.json'))) {
		gitmoji = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), '.gitmoji.json'), 'utf8'))
	}
	if (!gitmoji) {
		const { addDefaults, jsonFile } = await inquirer.prompt([
			{
				type: 'confirm',
				name: 'addDefaults',
				message: `You don't have ${chalk.cyan(
					'gitmoji'
				)} config in your package.json. Add defaults? 🤝`,
				default: true
			},
			{
				type: 'confirm',
				name: 'jsonFile',
				message: `Do you want to use a ${chalk.cyan(
					'.gitmoji.json'
				)} file instead?`,
				when: (answers) => !answers.addDefaults
			}
		])
		if (!addDefaults && !jsonFile) {
			process.exit(0)
		}

		if (jsonFile) {
			await writeFileAsync(
				path.resolve(process.cwd(), '.gitmoji.json'),
				JSON.stringify(defaultConfig, null, 2)
			)
		} else {
			const newPackageJson = {
				...packageJson,
				gitmoji: defaultConfig
			}
			await writeFileAsync(
				path.resolve(process.env.PWD, 'package.json'),
				JSON.stringify(newPackageJson, null, 2)
			)
		}
		gitmoji = defaultConfig
	}

	const types = Object.keys(gitmoji)
	const args = parseArgs(gitmoji)
	const autoPush = process.env.SEXY_COMMITS_AUTO_PUSH === '1'
	const issueRef = process.env.SEXY_COMMITS_ISSUE_REF
	const fixesIssue = process.env.SEXY_COMMITS_FIXES_ISSUE === '1'
	const skipCiTag = process.env.SEXY_COMMITS_SKIP_CI_TAG
	const includeDetails = process.env.SEXY_COMMITS_INCLUDE_DETAILS === '1'
	const prompts = await inquirer.prompt([
		{
			type: 'input',
			name: 'addPattern',
			message: 'What changes do you want to include?',
			default: 'all',
			when: !args.addPattern
		},
		{
			type: 'autocomplete',
			name: 'commitType',
			message: 'What did you do?',
			source: async (_a, input) => {
				return types
					.filter((type) =>
						type.toLowerCase().includes((input || '').toLowerCase())
					)
					.map((type) => ({
						value: type,
						name: gitmoji[type].join('\t')
					}))
			},
			when: !args.commitType
		},
		{
			type: 'input',
			name: 'issueRef',
			message: 'Do you want to reference an issue in the commit message?',
			when: !args.issueRef && !issueRef && process.env.SEXY_COMMITS_NO_ISSUE_REF !== '1'
		},
		{
			type: 'confirm',
			name: 'fixesIssue',
			message: (answers) =>
				`Do you want to automatically close #${answers.issueRef} when the commit is pushed?`,
			when: (answers) => Boolean(answers.issueRef) || issueRef || args.issueRef
		},
		{
			type: 'input',
			name: 'message',
			message: 'A short summary of what you changed:',
			when: !args.message
		},
		{
			type: 'input',
			name: 'details',
			message: 'Any additional details you want to include in the commit message:',
			when: !args.details && includeDetails
		},
		{
			type: 'confirm',
			name: 'skipCi',
			message: 'Do you want to skip CI for this commit?',
			default: false,
			when: Boolean(skipCiTag)
		},
		{
			type: 'confirm',
			name: 'push',
			message: 'Do you want to push the changes right away?',
			default: true,
			when: !autoPush
		}
	])
	const mergedInput = Object.assign({
		...args,
		push: autoPush,
		issueRef,
		fixesIssue
	}, prompts)
	let commitMessage = `${mergedInput.commitType}: ${mergedInput.message.toLowerCase()}`
	try {
		if (process.env.SEXY_COMMITS_LINT_CMD) {
			try {
				console.log('')
				log(chalk.magenta('Linting your changes with the command specified in your .env file...'))
				await execAsync(process.env.SEXY_COMMITS_LINT_CMD)
			}
			catch {
				log(chalk.red('An error occured while linting your changes.'))
			}
		}
		await (mergedInput.addPattern === 'all'
			? execAsync('git add --all')
			: execAsync(`git add "*${mergedInput.addPattern}*"`))
		if (gitmoji[mergedInput.commitType]) {
			commitMessage += ` ${gitmoji[mergedInput.commitType][0]}`
		}

		if (mergedInput.issueRef) {
			if (mergedInput.fixesIssue) {
				commitMessage += ` (closes #${mergedInput.issueRef})`
			} else {
				commitMessage += ` #${mergedInput.issueRef}`
			}
		}

		if (mergedInput.skipCi) {
			commitMessage += ` [${skipCiTag}]`
		}

		let commitCmd = `git commit -m "${commitMessage}"`

		if (mergedInput.details) {
			commitCmd += ` -m "${mergedInput.details}"`
		}

		commitCmd += ' --no-verify'

		if (mergedInput.amend) {
			commitCmd += ' --amend'
		}
		await execAsync(commitCmd)
		if (mergedInput.push) {
			await execAsync('git pull')
			await execAsync('git push')
			if (mergedInput.tags) {
				await execAsync('git push --tags')
			}
		}

		log(
			chalk.cyan(
				`\nSuccesfully commited changes with message:\n\n${chalk.white(
					commitMessage
				)}\n`
			)
		)
	} catch {
		log(chalk.red('An error occuchalk.red commiting your changes.'))
	} finally {
		process.exit(0)
	}
}

run()
