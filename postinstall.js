"use strict";
const fs = require('fs')
const path = require('path')
const packageJson = require('./package.json')

packageJson.scripts['commit'] = 'sexy-commits'

fs.writeFile(
    path.resolve(__dirname, './package.json'),
    JSON.stringify(packageJson, null, 2),
    () => {
        //
    }
)