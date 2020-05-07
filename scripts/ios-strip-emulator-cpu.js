const xcode = require('xcode')
const path = require('path')
const fs = require('fs')

module.exports = function (context) {

  const projectDir = path.resolve(context.opts.projectRoot + '/platforms/ios')
  const dirContent = fs.readdirSync(projectDir)
  const matchingProjectFiles = dirContent.filter(filePath => /.*\.xcodeproj/gi.test(filePath) );
  const projectPath = projectDir + '/' + matchingProjectFiles[0] + '/project.pbxproj'

  const project = xcode.project(projectPath)

  project.parse(error => {
    if (error) console.error('failed to parse project', error)
    const options = {
      shellPath: '/bin/sh',
      shellScript: `
        echo "Target architectures: $ARCHS"

        APP_PATH="\${TARGET_BUILD_DIR}/\${WRAPPER_NAME}"
        
        find "$APP_PATH" -name '*.framework' -type d | while read -r FRAMEWORK
        do
        FRAMEWORK_EXECUTABLE_NAME=$(defaults read "$FRAMEWORK/Info.plist" CFBundleExecutable)
        FRAMEWORK_EXECUTABLE_PATH="$FRAMEWORK/$FRAMEWORK_EXECUTABLE_NAME"
        echo "Executable is $FRAMEWORK_EXECUTABLE_PATH"
        echo $(lipo -info "$FRAMEWORK_EXECUTABLE_PATH")
        
        FRAMEWORK_TMP_PATH="$FRAMEWORK_EXECUTABLE_PATH-tmp"
        
        # remove simulator's archs if location is not simulator's directory
        case "\${TARGET_BUILD_DIR}" in
        *"iphonesimulator")
            echo "No need to remove archs"
            ;;
        *)
            if $(lipo "$FRAMEWORK_EXECUTABLE_PATH" -verify_arch "i386") ; then
            lipo -output "$FRAMEWORK_TMP_PATH" -remove "i386" "$FRAMEWORK_EXECUTABLE_PATH"
            echo "i386 architecture removed"
            rm "$FRAMEWORK_EXECUTABLE_PATH"
            mv "$FRAMEWORK_TMP_PATH" "$FRAMEWORK_EXECUTABLE_PATH"
            fi
            if $(lipo "$FRAMEWORK_EXECUTABLE_PATH" -verify_arch "x86_64") ; then
            lipo -output "$FRAMEWORK_TMP_PATH" -remove "x86_64" "$FRAMEWORK_EXECUTABLE_PATH"
            echo "x86_64 architecture removed"
            rm "$FRAMEWORK_EXECUTABLE_PATH"
            mv "$FRAMEWORK_TMP_PATH" "$FRAMEWORK_EXECUTABLE_PATH"
            fi
            ;;
        esac
        
        echo "Completed for executable $FRAMEWORK_EXECUTABLE_PATH"
        echo $(lipo -info "$FRAMEWORK_EXECUTABLE_PATH")
        
        done
      `
    }
    // TODO: Only add if not there yet
    project.addBuildPhase(
      [],
      'PBXShellScriptBuildPhase',
      'Initialize Crashlytics',
      project.getFirstTarget().uuid,
      options)
    fs.writeFileSync(projectPath, project.writeSync());
  })
}