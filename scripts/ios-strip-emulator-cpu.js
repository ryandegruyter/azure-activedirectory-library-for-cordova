#!/usr/bin/env node

const xcode = require('xcode')
const path = require('path')
const fs = require('fs')

module.exports = function (context) {

    const projectDir = path.resolve(context.opts.projectRoot + '/platforms/ios')
    const dirContent = fs.readdirSync(projectDir)
    const matchingProjectFiles = dirContent.filter(filePath => /.*\.xcodeproj/gi.test(filePath));
    const projectPath = projectDir + '/' + matchingProjectFiles[0] + '/project.pbxproj'

    const shellscriptPath = path.join(context.opts.projectRoot, '/plugins/cordova-plugin-ryco-adal/scripts/ios-strip-emu.txt');
    const shellscript = fs.readFileSync(shellscriptPath, "utf-8");
    const project = xcode.project(projectPath)

    project.parse(error => {
        if (error) console.log('failed to parse project', error)
        const options = {
            shellPath: '/bin/sh',
            shellScript: shellscript
        }
        console.log('PROJECT UUID: ', project.getFirstTarget().uuid);
        project.addBuildPhase(
            [],
            'PBXShellScriptBuildPhase',
            'Run script',
            project.getFirstTarget().uuid,
            options);
        
        fs.writeFileSync(projectPath, project.writeSync());
    })
}