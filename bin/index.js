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
				addPattern,
				commitType,
				message
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
	if (!gitmoji) {
		const { addDefaults } = await inquirer.prompt([
			{
				type: 'confirm',
				name: 'addDefaults',
				message: `You don't have ${chalk.cyan(
					'gitmoji'
				)} config in your package.json. Add defaults? 🤝`,
				default: true
			}
		])
		if (!addDefaults) {
			process.exit(0)
		}

		const newPackageJson = {
			...packageJson,
			gitmoji: defaultConfig
		}
		await writeFileAsync(
			path.resolve(process.env.PWD, 'package.json'),
			JSON.stringify(newPackageJson, null, 2)
		)
		gitmoji = defaultConfig
	}

	const types = Object.keys(gitmoji)
	const args = parseArgs(gitmoji)
	const autoPush = process.env.SEXY_COMMITS_AUTO_PUSH && process.env.SEXY_COMMITS_AUTO_PUSH === '1'
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
			name: 'message',
			message: 'A short summary of what you changed:',
			when: !args.message
		},
		{
			type: 'confirm',
			name: 'push',
			message: 'Do you want to push the changes right away?',
			default: true,
			when: autoPush === undefined
		}
	])
	const input = Object.assign({ args, push: autoPush }, prompts)
	let commitMessage = `${input.commitType}: ${input.message.toLowerCase()}`
	try {
		await (input.addPattern === 'all'
			? execAsync('git add --all')
			: execAsync(`git add "*${input.addPattern}*"`))
		if (gitmoji[input.commitType]) {
			commitMessage += ` ${gitmoji[input.commitType][0]}`
		}

		await execAsync(`git commit -m "${commitMessage}" --no-verify`)
		if (input.push) {
			await execAsync('git pull')
			await execAsync('git push')
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
