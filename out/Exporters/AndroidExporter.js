"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Exporter_1 = require("./Exporter");
const Project_1 = require("../Project");
const Architecture_1 = require("../Architecture");
const Options_1 = require("../Options");
const Icon = require("../Icon");
const fs = require("fs-extra");
const path = require("path");
class AndroidExporter extends Exporter_1.Exporter {
    constructor() {
        super();
    }
    async exportSolution(project, from, to, platform, vr) {
        let safename = project.getName().replace(/ /g, '-');
        this.safename = safename;
        let targetOptions = {
            package: 'tech.kode.kore',
            installLocation: "internalOnly",
            versionCode: 1,
            versionName: '1.0',
            screenOrientation: 'sensor',
            permissions: new Array(),
            disableStickyImmersiveMode: false,
            dependencies: ""
        };
        if (project.targetOptions != null && project.targetOptions.android != null) {
            const userOptions = project.targetOptions.android;
            for (let key in userOptions) {
                if (userOptions[key] != null) {
                    targetOptions[key] = userOptions[key];
                }
            }
        }
        let cflags = '';
        for (let flag of project.cFlags)
            cflags += flag + ' ';
        let cppflags = '';
        for (let flag of project.cppFlags)
            cppflags += flag + ' ';
        const indir = path.join(__dirname, '..', '..', 'Data', 'android');
        const outdir = path.join(to.toString(), safename);
        fs.copySync(path.join(indir, 'gitignore'), path.join(outdir, '.gitignore'));
        fs.copySync(path.join(indir, 'build.gradle'), path.join(outdir, 'build.gradle'));
        fs.copySync(path.join(indir, 'gradle.properties'), path.join(outdir, 'gradle.properties'));
        fs.copySync(path.join(indir, 'gradlew'), path.join(outdir, 'gradlew'));
        fs.copySync(path.join(indir, 'gradlew.bat'), path.join(outdir, 'gradlew.bat'));
        fs.copySync(path.join(indir, 'settings.gradle'), path.join(outdir, 'settings.gradle'));
        fs.copySync(path.join(indir, 'app', 'gitignore'), path.join(outdir, 'app', '.gitignore'));
        let gradle = fs.readFileSync(path.join(indir, 'app', 'build.gradle'), { encoding: 'utf8' });
        gradle = gradle.replace(/{package}/g, targetOptions.package);
        gradle = gradle.replace(/{versionCode}/g, targetOptions.versionCode.toString());
        gradle = gradle.replace(/{versionName}/g, targetOptions.versionName);
        let arch = '';
        switch (Options_1.Options.architecture) {
            case Architecture_1.Architecture.Default:
                arch = '';
                break;
            case Architecture_1.Architecture.Arm7:
                arch = 'armeabi-v7a';
                break;
            case Architecture_1.Architecture.Arm8:
                arch = 'arm64-v8a';
                break;
            case Architecture_1.Architecture.X86:
                arch = 'x86';
                break;
            case Architecture_1.Architecture.X86_64:
                arch = 'x86_64';
                break;
            default: throw 'Unknown architecture ' + Options_1.Options.architecture;
        }
        if (Options_1.Options.architecture !== Architecture_1.Architecture.Default) {
            arch = `ndk {abiFilters '${arch}'}`;
        }
        gradle = gradle.replace(/{architecture}/g, arch);
        gradle = gradle.replace(/{cflags}/g, cflags);
        cppflags = '-frtti -fexceptions ' + cppflags;
        if (project.cpp11) {
            cppflags = '-std=c++11 ' + cppflags;
        }
        gradle = gradle.replace(/{cppflags}/g, cppflags);
        let javasources = '';
        for (let dir of project.getJavaDirs()) {
            javasources += '\'' + path.relative(path.join(outdir, 'app'), path.resolve(from, dir)).replace(/\\/g, '/') + '\', ';
        }
        javasources += '\'' + path.relative(path.join(outdir, 'app'), path.join(Project_1.Project.koreDir.toString(), 'Backends', 'System', 'Android', 'Java-Sources')).replace(/\\/g, '/') + '\'';
        gradle = gradle.replace(/{javasources}/g, javasources);
        gradle = gradle.replace(/{dependencies}/g, targetOptions.dependencies);
        fs.writeFileSync(path.join(outdir, 'app', 'build.gradle'), gradle, { encoding: 'utf8' });
        let cmake = fs.readFileSync(path.join(indir, 'app', 'CMakeLists.txt'), { encoding: 'utf8' });
        let debugDefines = '';
        for (const def of project.getDefines()) {
            if (!def.config || def.config.toLowerCase() === 'debug') {
                debugDefines += ' -D' + def.value;
            }
        }
        cmake = cmake.replace(/{debug_defines}/g, debugDefines);
        let releaseDefines = '';
        for (const def of project.getDefines()) {
            if (!def.config || def.config.toLowerCase() === 'release') {
                releaseDefines += ' -D' + def.value;
            }
        }
        cmake = cmake.replace(/{release_defines}/g, releaseDefines);
        let includes = '';
        for (let inc of project.getIncludeDirs()) {
            includes += '  "' + path.resolve(inc).replace(/\\/g, '/') + '"\n';
        }
        cmake = cmake.replace(/{includes}/g, includes);
        let files = '';
        for (let file of project.getFiles()) {
            if (file.file.endsWith('.c') || file.file.endsWith('.cc') || file.file.endsWith('.cpp') || file.file.endsWith('.h')) {
                files += '  "' + path.resolve(file.file).replace(/\\/g, '/') + '"\n';
            }
        }
        cmake = cmake.replace(/{files}/g, files);
        let libraries1 = '';
        let libraries2 = '';
        for (let lib of project.getLibs()) {
            libraries1 += 'find_library(' + lib + '-lib ' + lib + ')\n';
            libraries2 += '  ${' + lib + '-lib}\n';
        }
        cmake = cmake.replace(/{libraries1}/g, libraries1).replace(/{libraries2}/g, libraries2);
        // prevent overwriting CMakeLists.txt if it has not changed
        const cmakePath = path.join(outdir, 'app', 'CMakeLists.txt');
        if (!fs.existsSync(cmakePath)) {
            fs.writeFileSync(cmakePath, cmake, { encoding: 'utf8' });
        }
        else {
            const file = fs.readFileSync(cmakePath, 'utf8');
            if (file !== cmake)
                fs.writeFileSync(cmakePath, cmake, { encoding: 'utf8' });
        }
        fs.copySync(path.join(indir, 'app', 'proguard-rules.pro'), path.join(outdir, 'app', 'proguard-rules.pro'));
        fs.ensureDirSync(path.join(outdir, 'app', 'src'));
        // fs.emptyDirSync(path.join(outdir, 'app', 'src'));
        fs.ensureDirSync(path.join(outdir, 'app', 'src', 'main'));
        let manifest = fs.readFileSync(path.join(indir, 'main', 'AndroidManifest.xml'), { encoding: 'utf8' });
        manifest = manifest.replace(/{package}/g, targetOptions.package);
        manifest = manifest.replace(/{installLocation}/g, targetOptions.installLocation);
        manifest = manifest.replace(/{versionCode}/g, targetOptions.versionCode.toString());
        manifest = manifest.replace(/{versionName}/g, targetOptions.versionName);
        manifest = manifest.replace(/{screenOrientation}/g, targetOptions.screenOrientation);
        manifest = manifest.replace(/{permissions}/g, targetOptions.permissions.map((p) => { return '\n\t<uses-permission android:name="' + p + '"/>'; }).join(''));
        manifest = manifest.replace(/{metadata}/g, targetOptions.disableStickyImmersiveMode ? '\n\t\t<meta-data android:name="disableStickyImmersiveMode" android:value="true"/>' : '');
        fs.ensureDirSync(path.join(outdir, 'app', 'src', 'main'));
        fs.writeFileSync(path.join(outdir, 'app', 'src', 'main', 'AndroidManifest.xml'), manifest, { encoding: 'utf8' });
        let strings = fs.readFileSync(path.join(indir, 'main', 'res', 'values', 'strings.xml'), { encoding: 'utf8' });
        strings = strings.replace(/{name}/g, project.getName());
        fs.ensureDirSync(path.join(outdir, 'app', 'src', 'main', 'res', 'values'));
        fs.writeFileSync(path.join(outdir, 'app', 'src', 'main', 'res', 'values', 'strings.xml'), strings, { encoding: 'utf8' });
        fs.ensureDirSync(path.join(outdir, 'app', 'src', 'main', 'res', 'mipmap-hdpi'));
        Icon.exportPng(project.icon, path.resolve(to, safename, 'app', 'src', 'main', 'res', 'mipmap-hdpi', 'ic_launcher.png'), 72, 72, undefined, from);
        fs.ensureDirSync(path.join(outdir, 'app', 'src', 'main', 'res', 'mipmap-mdpi'));
        Icon.exportPng(project.icon, path.resolve(to, safename, 'app', 'src', 'main', 'res', 'mipmap-mdpi', 'ic_launcher.png'), 48, 48, undefined, from);
        fs.ensureDirSync(path.join(outdir, 'app', 'src', 'main', 'res', 'mipmap-xhdpi'));
        Icon.exportPng(project.icon, path.resolve(to, safename, 'app', 'src', 'main', 'res', 'mipmap-xhdpi', 'ic_launcher.png'), 96, 96, undefined, from);
        fs.ensureDirSync(path.join(outdir, 'app', 'src', 'main', 'res', 'mipmap-xxhdpi'));
        Icon.exportPng(project.icon, path.resolve(to, safename, 'app', 'src', 'main', 'res', 'mipmap-xxhdpi', 'ic_launcher.png'), 144, 144, undefined, from);
        fs.ensureDirSync(path.join(outdir, 'app', 'src', 'main', 'res', 'mipmap-xxxhdpi'));
        Icon.exportPng(project.icon, path.resolve(to, safename, 'app', 'src', 'main', 'res', 'mipmap-xxxhdpi', 'ic_launcher.png'), 192, 192, undefined, from);
        fs.copySync(path.join(indir, 'gradle', 'wrapper', 'gradle-wrapper.jar'), path.join(outdir, 'gradle', 'wrapper', 'gradle-wrapper.jar'));
        fs.copySync(path.join(indir, 'gradle', 'wrapper', 'gradle-wrapper.properties'), path.join(outdir, 'gradle', 'wrapper', 'gradle-wrapper.properties'));
        fs.copySync(path.join(indir, 'idea', 'gradle.xml'), path.join(outdir, '.idea', 'gradle.xml'));
        fs.copySync(path.join(indir, 'idea', 'misc.xml'), path.join(outdir, '.idea', 'misc.xml'));
        fs.copySync(path.join(indir, 'idea', 'runConfigurations.xml'), path.join(outdir, '.idea', 'runConfigurations.xml'));
        fs.copySync(path.join(indir, 'idea', 'codeStyles', 'Project.xml'), path.join(outdir, '.idea', 'codeStyles', 'Project.xml'));
        if (project.getDebugDir().length > 0)
            fs.copySync(path.resolve(from, project.getDebugDir()), path.resolve(to, safename, 'app', 'src', 'main', 'assets'));
    }
}
exports.AndroidExporter = AndroidExporter;
//# sourceMappingURL=AndroidExporter.js.map