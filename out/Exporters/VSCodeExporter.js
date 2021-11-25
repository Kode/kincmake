"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VSCodeExporter = void 0;
const Exporter_1 = require("./Exporter");
const Platform_1 = require("../Platform");
const fs = require("fs-extra");
const path = require("path");
class VSCodeExporter extends Exporter_1.Exporter {
    constructor() {
        super();
    }
    configName(platform) {
        if (platform === Platform_1.Platform.Windows) {
            return 'Win32';
        }
        else if (platform === Platform_1.Platform.Linux) {
            return 'Linux';
        }
        else if (platform === Platform_1.Platform.OSX) {
            return 'Mac';
        }
        else {
            return 'unknown platform';
        }
    }
    compilerPath(platform) {
        if (platform === Platform_1.Platform.Windows) {
            return 'C:/Program Files (x86)/Microsoft Visual Studio/2019/Community/VC/Tools/MSVC/14.27.29110/bin/Hostx64/x64/cl.exe';
        }
        else if (platform === Platform_1.Platform.Linux) {
            return '/usr/bin/gcc';
        }
        else if (platform === Platform_1.Platform.OSX) {
            return '/usr/bin/clang';
        }
        else {
            return 'unknown platform';
        }
    }
    intelliSenseMode(platform) {
        if (platform === Platform_1.Platform.Windows) {
            return 'msvc-x64';
        }
        else if (platform === Platform_1.Platform.Linux) {
            return 'gcc-x64';
        }
        else if (platform === Platform_1.Platform.OSX) {
            return 'clang-x64';
        }
        else {
            return 'unknown platform';
        }
    }
    async exportSolution(project, from, to, platform, vrApi, options) {
        fs.ensureDirSync(path.join(from, '.vscode'));
        this.writeFile(path.join(from, '.vscode', 'c_cpp_properties.json'));
        const defines = [];
        for (const define of project.getDefines()) {
            defines.push(define.value);
        }
        const includes = [];
        for (const include of project.getIncludeDirs()) {
            if (path.isAbsolute(include)) {
                includes.push(include);
            }
            else {
                includes.push('${workspaceFolder}/' + include);
            }
        }
        const config = {
            name: this.configName(platform),
            includePath: includes,
            defines: defines,
            compilerPath: this.compilerPath(platform),
            cStandard: 'c11',
            cppStandard: 'c++17',
            intelliSenseMode: this.intelliSenseMode(platform)
        };
        if (platform === Platform_1.Platform.Windows) {
            config.windowsSdkVersion = '10.0.19041.0';
        }
        if (platform === Platform_1.Platform.OSX) {
            config.macFrameworkPath = ['/Applications/Xcode.app/Contents/Developer/Platforms/MacOSX.platform/Developer/SDKs/MacOSX.sdk/System/Library/Frameworks'];
        }
        const data = {
            configurations: [
                config
            ]
        };
        this.p(JSON.stringify(data, null, '\t'));
        this.closeFile();
        this.writeLaunchJson(project, from, to, platform, vrApi, options);
    }
    writeLaunchJson(project, from, to, platform, vrApi, options) {
        const launchJsonPath = path.join(from, '.vscode', 'launch.json');
        let data = {
            configurations: [],
            compounds: []
        };
        if (fs.existsSync(launchJsonPath)) {
            data = JSON.parse(fs.readFileSync(launchJsonPath, { encoding: 'utf8' }));
        }
        const configurations = [];
        for (let config of data.configurations) {
            if (!config.name.startsWith('Kinc:')) {
                configurations.push(config);
            }
        }
        this.writeFile(launchJsonPath);
        const kincConfig = {
            name: 'Kinc: Launch',
            type: platform === Platform_1.Platform.Windows ? 'cppvsdbg' : 'cppdbg',
            request: 'launch',
            program: this.program(project, platform),
            cwd: project.getDebugDir(),
            preLaunchTask: 'Kinc: Debug Build for ' + this.preLaunchTask(platform)
        };
        if (platform === Platform_1.Platform.Windows) {
            // kincConfig.symbolSearchPath = 'C:\\Symbols;C:\\SymbolDir2';
            kincConfig.externalConsole = true;
            kincConfig.logging = {
                moduleLoad: false,
                trace: true
            };
            // kincConfig.visualizerFile = '${workspaceFolder}/my.natvis';
        }
        else if (platform === Platform_1.Platform.OSX) {
            kincConfig.MIMode = 'lldb';
        }
        configurations.push(kincConfig);
        data.configurations = configurations;
        this.p(JSON.stringify(data, null, '\t'));
        this.closeFile();
    }
    program(project, platform) {
        if (platform === Platform_1.Platform.OSX) {
            return path.join(project.getBasedir(), 'build', 'build', 'Release', project.getSafeName() + '.app', 'Contents', 'MacOS', project.getSafeName());
        }
        else {
            return path.join(project.getDebugDir(), project.getSafeName() + (platform === Platform_1.Platform.Windows ? '.exe' : ''));
        }
    }
    preLaunchTask(platform) {
        if (platform === Platform_1.Platform.Windows) {
            return 'Windows';
        }
        else if (platform === Platform_1.Platform.OSX) {
            return 'macOS';
        }
        else if (platform === Platform_1.Platform.Linux) {
            return 'Linux';
        }
        else if (platform === Platform_1.Platform.FreeBSD) {
            return 'FreeBSD';
        }
        else {
            return 'Unknown';
        }
    }
}
exports.VSCodeExporter = VSCodeExporter;
//# sourceMappingURL=VSCodeExporter.js.map