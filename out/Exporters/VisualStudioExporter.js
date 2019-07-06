"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Exporter_1 = require("./Exporter");
const GraphicsApi_1 = require("../GraphicsApi");
const Icon = require("../Icon");
const Platform_1 = require("../Platform");
const Project_1 = require("../Project");
const Options_1 = require("../Options");
const VisualStudioVersion_1 = require("../VisualStudioVersion");
const Configuration_1 = require("../Configuration");
const VrApi_1 = require("../VrApi");
const log = require("../log");
const fs = require("fs-extra");
const path = require("path");
const uuid = require('uuid');
function isGitPath(aPath) {
    return aPath.indexOf('/.git/') >= 0 || aPath.indexOf('\\.git\\') >= 0 || aPath.endsWith('/.git') || aPath.endsWith('\\.git');
}
function getDirFromString(file, base) {
    file = file.replace(/\\/g, '/');
    if (file.indexOf('/') >= 0) {
        let dir = file.substr(0, file.lastIndexOf('/'));
        return path.join(base, path.relative(base, dir)).replace(/\\/g, '/');
    }
    else {
        return base;
    }
}
function getDir(file) {
    return getDirFromString(file.file, file.projectName);
}
function contains(array, element) {
    for (let arrayelement of array) {
        if (arrayelement === element)
            return true;
    }
    return false;
}
function valueOf(str) {
    if (str === 'Debug')
        return Configuration_1.Configuration.Debug;
    if (str === 'CodeAnalysis')
        return Configuration_1.Configuration.CodeAnalysis;
    if (str === 'Profile')
        return Configuration_1.Configuration.Profile;
    if (str === 'Profile_FastCap')
        return Configuration_1.Configuration.Profile_FastCap;
    if (str === 'Release')
        return Configuration_1.Configuration.Release;
    if (str === 'Release_LTCG')
        return Configuration_1.Configuration.Release_LTCG;
    throw 'Unknown configuration';
}
function getShaderLang() {
    if (Options_1.Options.graphicsApi === GraphicsApi_1.GraphicsApi.OpenGL)
        return 'glsl';
    if (Options_1.Options.graphicsApi === GraphicsApi_1.GraphicsApi.Direct3D9)
        return 'd3d9';
    if (Options_1.Options.graphicsApi === GraphicsApi_1.GraphicsApi.Direct3D11 || Options_1.Options.graphicsApi === GraphicsApi_1.GraphicsApi.Direct3D12 || Options_1.Options.graphicsApi === GraphicsApi_1.GraphicsApi.Default)
        return 'd3d11';
    if (Options_1.Options.graphicsApi === GraphicsApi_1.GraphicsApi.Vulkan)
        return 'spirv';
    throw new Error('Unexpected graphics API');
}
class VisualStudioExporter extends Exporter_1.Exporter {
    constructor() {
        super();
        if (this.overrideVisualStudioVersion() !== null) {
            Options_1.Options.visualStudioVersion = this.overrideVisualStudioVersion();
        }
    }
    overrideVisualStudioVersion() {
        return null;
    }
    getDebugDir(from, project) {
        let debugDir = project.getDebugDir();
        if (path.isAbsolute(debugDir)) {
            debugDir = debugDir.replace(/\//g, '\\');
        }
        else {
            debugDir = path.resolve(from, debugDir).replace(/\//g, '\\');
        }
        return debugDir;
    }
    exportUserFile(from, to, project, platform) {
        if (project.getDebugDir() === '')
            return;
        this.writeFile(path.resolve(to, project.getName() + '.vcxproj.user'));
        this.p('<?xml version="1.0" encoding="utf-8"?>');
        this.p('<Project ToolsVersion="' + this.toolsVersion() + '" xmlns="http://schemas.microsoft.com/developer/msbuild/2003">');
        this.p('<PropertyGroup>', 1);
        if (platform === Platform_1.Platform.Windows) {
            this.p('<LocalDebuggerWorkingDirectory>' + this.getDebugDir(from, project) + '</LocalDebuggerWorkingDirectory>', 2);
            this.p('<DebuggerFlavor>WindowsLocalDebugger</DebuggerFlavor>', 2);
            // java.io.File baseDir = new File(project.getBasedir());
            // p("<LocalDebuggerCommandArguments>\"SOURCEDIR=" + baseDir.getAbsolutePath() + "\" \"KTSOURCEDIR=" + baseDir.getAbsolutePath() + "\\Kt\"</LocalDebuggerCommandArguments>", 2);
        }
        else {
            this.userPropertyGroup(this.getDebugDir(from, project), 2);
        }
        this.p('</PropertyGroup>', 1);
        this.p('</Project>');
        this.closeFile();
    }
    userPropertyGroup(debugDir, indent) {
    }
    writeProjectDeclarations(project, solutionUuid) {
        this.p('Project("{' + solutionUuid.toUpperCase() + '}") = "' + project.getName() + '", "' + project.getName() + '.vcxproj", "{' + project.getUuid().toString().toUpperCase() + '}"');
        if (project.getSubProjects().length > 0) {
            this.p('ProjectSection(ProjectDependencies) = postProject', 1);
            for (let proj of project.getSubProjects()) {
                this.p('{' + proj.getUuid().toString().toUpperCase() + '} = {' + proj.getUuid().toString().toUpperCase() + '}', 2);
            }
            this.p('EndProjectSection', 1);
        }
        this.p('EndProject');
        for (let proj of project.getSubProjects())
            this.writeProjectDeclarations(proj, solutionUuid);
    }
    getConfigs(platform) {
        if (platform === Platform_1.Platform.WindowsApp) {
            return ['Debug', 'Release'];
        }
        else {
            return ['Debug', 'Develop', 'Release'];
        }
    }
    getSystems(platform) {
        if (platform === Platform_1.Platform.WindowsApp) {
            return ['ARM', 'x64', 'Win32'];
        }
        else {
            return ['x64', 'Win32'];
        }
    }
    GetSys(platform) {
        return this.getSystems(platform)[0];
    }
    writeProjectBuilds(project, platform) {
        for (let config of this.getConfigs(platform)) {
            for (let system of this.getSystems(platform)) {
                this.p('{' + project.getUuid().toString().toUpperCase() + '}.' + config + '|' + this.renameSystem(system) + '.ActiveCfg = ' + config + '|' + system, 2);
                this.p('{' + project.getUuid().toString().toUpperCase() + '}.' + config + '|' + this.renameSystem(system) + '.Build.0 = ' + config + '|' + system, 2);
                if (platform === Platform_1.Platform.WindowsApp || platform === Platform_1.Platform.XboxOne) {
                    this.p('{' + project.getUuid().toString().toUpperCase() + '}.' + config + '|' + this.renameSystem(system) + '.Deploy.0 = ' + config + '|' + system, 2);
                }
            }
        }
        for (let proj of project.getSubProjects())
            this.writeProjectBuilds(proj, platform);
    }
    renameSystem(system) {
        if (system === 'Win32') {
            return 'x86';
        }
        else {
            return system;
        }
    }
    async exportSolution(project, from, to, platform, vrApi, options) {
        this.exportCLion(project, from, to, platform, vrApi, options);
        this.writeFile(path.resolve(to, project.getName() + '.sln'));
        if (Options_1.Options.visualStudioVersion === VisualStudioVersion_1.VisualStudioVersion.VS2019) {
            this.p('Microsoft Visual Studio Solution File, Format Version 12.00');
            this.p('# Visual Studio Version 16');
            this.p('VisualStudioVersion = 16.0.28729.10');
            this.p('MinimumVisualStudioVersion = 10.0.40219.1');
        }
        else if (Options_1.Options.visualStudioVersion === VisualStudioVersion_1.VisualStudioVersion.VS2017) {
            this.p('Microsoft Visual Studio Solution File, Format Version 12.00');
            this.p('# Visual Studio 15');
            this.p('VisualStudioVersion = 15.0.26228.4');
            this.p('MinimumVisualStudioVersion = 10.0.40219.1');
        }
        else if (Options_1.Options.visualStudioVersion === VisualStudioVersion_1.VisualStudioVersion.VS2015) {
            this.p('Microsoft Visual Studio Solution File, Format Version 12.00');
            this.p('# Visual Studio 14');
            this.p('VisualStudioVersion = 14.0.25420.1');
            this.p('MinimumVisualStudioVersion = 10.0.40219.1');
        }
        else if (Options_1.Options.visualStudioVersion === VisualStudioVersion_1.VisualStudioVersion.VS2013) {
            this.p('Microsoft Visual Studio Solution File, Format Version 12.00');
            this.p('# Visual Studio 2013');
            this.p('VisualStudioVersion = 12.0.21005.1');
            this.p('MinimumVisualStudioVersion = 10.0.40219.1');
        }
        else if (Options_1.Options.visualStudioVersion === VisualStudioVersion_1.VisualStudioVersion.VS2012) {
            this.p('Microsoft Visual Studio Solution File, Format Version 12.00');
            this.p('# Visual Studio 2012');
        }
        else {
            this.p('Microsoft Visual Studio Solution File, Format Version 11.00');
            this.p('# Visual Studio 2010');
        }
        const solutionUuid = uuid.v4();
        this.writeProjectDeclarations(project, solutionUuid);
        this.p('Global');
        this.p('GlobalSection(SolutionConfigurationPlatforms) = preSolution', 1);
        for (let config of this.getConfigs(platform)) {
            for (let system of this.getSystems(platform)) {
                this.p(config + '|' + this.renameSystem(system) + ' = ' + config + '|' + this.renameSystem(system), 2);
            }
        }
        this.p('EndGlobalSection', 1);
        this.p('GlobalSection(ProjectConfigurationPlatforms) = postSolution', 1);
        this.writeProjectBuilds(project, platform);
        this.p('EndGlobalSection', 1);
        this.p('GlobalSection(SolutionProperties) = preSolution', 1);
        this.p('HideSolutionNode = FALSE', 2);
        this.p('EndGlobalSection', 1);
        this.postSolution();
        this.p('EndGlobal');
        this.closeFile();
        await this.exportProject(from, to, project, platform, project.isCmd(), options.noshaders);
        this.exportFilters(from, to, project, platform);
        this.exportUserFile(from, to, project, platform);
        if (platform === Platform_1.Platform.WindowsApp) {
            this.exportManifest(to, project);
            const white = 0xffffffff;
            Icon.exportPng(project.icon, path.resolve(to, 'Logo.scale-100.png'), 150, 150, white, from);
            Icon.exportPng(project.icon, path.resolve(to, 'SmallLogo.scale-100.png'), 44, 44, white, from);
            Icon.exportPng(project.icon, path.resolve(to, 'StoreLogo.scale-100.png'), 50, 50, white, from);
            Icon.exportPng(project.icon, path.resolve(to, 'SplashScreen.scale-100.png'), 620, 300, white, from);
            Icon.exportPng(project.icon, path.resolve(to, 'WideLogo.scale-100.png'), 310, 150, white, from);
        }
        else if (platform === Platform_1.Platform.Windows) {
            this.exportResourceScript(to);
            Icon.exportIco(project.icon, path.resolve(to, 'icon.ico'), from);
        }
        else {
            this.additionalFiles(fs, Icon, from, to, project);
        }
    }
    postSolution() {
    }
    additionalFiles(fs, Icon, from, to, project) {
    }
    exportManifest(to, project) {
        this.writeFile(path.resolve(to, 'Package.appxmanifest'));
        this.p('<?xml version="1.0" encoding="utf-8"?>');
        this.p('<Package xmlns="http://schemas.microsoft.com/appx/manifest/foundation/windows10" xmlns:mp="http://schemas.microsoft.com/appx/2014/phone/manifest" xmlns:uap="http://schemas.microsoft.com/appx/manifest/uap/windows10" IgnorableNamespaces="uap mp">');
        this.p('<Identity Name="b2714d6a-f52b-4943-b735-9b5777019bc9" Publisher="CN=Robert" Version="1.0.0.0" />', 1);
        this.p('<mp:PhoneIdentity PhoneProductId="b2714d6a-f52b-4943-b735-9b5777019bc9" PhonePublisherId="00000000-0000-0000-0000-000000000000"/>', 1);
        this.p('<Properties>', 1);
        this.p('<DisplayName>' + project.getName() + '</DisplayName>', 2);
        this.p('<PublisherDisplayName>Robert</PublisherDisplayName>', 2);
        this.p('<Logo>StoreLogo.png</Logo>', 2);
        this.p('</Properties>', 1);
        this.p('<Dependencies>', 1);
        this.p('<TargetDeviceFamily Name="Windows.Universal" MinVersion="10.0.0.0" MaxVersionTested="10.0.0.0" />', 2);
        this.p('</Dependencies>', 1);
        this.p('<Resources>', 1);
        this.p('<Resource Language="x-generate"/>', 2);
        this.p('</Resources>', 1);
        this.p('<Applications>', 1);
        this.p('<Application Id="App" Executable="$targetnametoken$.exe" EntryPoint="' + project.getName() + '.App">', 2);
        this.p('<uap:VisualElements DisplayName="' + project.getName() + '" Square150x150Logo="Logo.png" Square44x44Logo="SmallLogo.png" Description="' + project.getName() + '" BackgroundColor="#464646">', 3);
        this.p('<uap:SplashScreen Image="SplashScreen.png" />', 4);
        this.p('</uap:VisualElements>', 3);
        this.p('</Application>', 2);
        this.p('</Applications>', 1);
        this.p('<Capabilities>', 1);
        this.p('<Capability Name="internetClient" />', 2);
        if (Options_1.Options.vrApi === VrApi_1.VrApi.HoloLens) {
            this.p('<DeviceCapability  Name="microphone" />', 3);
            this.p('<DeviceCapability  Name="webcam" />', 3);
        }
        this.p('</Capabilities>', 1);
        this.p('</Package>');
        this.closeFile();
    }
    exportResourceScript(to) {
        this.writeFile(path.resolve(to, 'resources.rc'));
        this.p('107       ICON         "icon.ico"');
        this.closeFile();
    }
    exportAssetPathFilter(assetPath, dirs, assets) {
        if (isGitPath(assetPath))
            return;
        let dir = getDirFromString(path.join(assetPath, 'whatever'), 'Deployment').trim();
        if (!contains(dirs, dir)) {
            dirs.push(dir);
        }
        let paths = fs.readdirSync(assetPath);
        for (let p of paths) {
            if (fs.statSync(path.join(assetPath, p)).isDirectory())
                this.exportAssetPathFilter(path.join(assetPath, p), dirs, assets);
            else
                assets.push(path.join(assetPath, p).replace(/\//g, '\\'));
        }
    }
    exportFilters(from, to, project, platform) {
        for (let proj of project.getSubProjects())
            this.exportFilters(from, to, proj, platform);
        this.writeFile(path.resolve(to, project.getName() + '.vcxproj.filters'));
        this.p('<?xml version="1.0" encoding="utf-8"?>');
        this.p('<Project ToolsVersion="' + this.toolsVersion() + '" xmlns="http://schemas.microsoft.com/developer/msbuild/2003">');
        // sort(project.getFiles());
        let lastdir = '';
        let dirs = [];
        for (let file of project.getFiles()) {
            let dir = getDir(file);
            if (dir !== lastdir) {
                let subdir = dir;
                while (subdir.indexOf('/') >= 0) {
                    subdir = subdir.substr(0, subdir.lastIndexOf('/'));
                    if (!contains(dirs, subdir))
                        dirs.push(subdir);
                }
                dirs.push(dir);
                lastdir = dir;
            }
        }
        let assets = [];
        if (platform === Platform_1.Platform.WindowsApp || platform === Platform_1.Platform.XboxOne)
            this.exportAssetPathFilter(path.resolve(from, project.getDebugDir()), dirs, assets);
        this.p('<ItemGroup>', 1);
        for (let dir of dirs) {
            this.p('<Filter Include="' + dir.replace(/\//g, '\\') + '">', 2);
            this.p('<UniqueIdentifier>{' + uuid.v4().toString().toUpperCase() + '}</UniqueIdentifier>', 3);
            this.p('</Filter>', 2);
        }
        if (platform === Platform_1.Platform.WindowsApp) {
            this.p('<Filter Include="Package">', 2);
            this.p('<UniqueIdentifier>{' + uuid.v4().toString().toUpperCase() + '}</UniqueIdentifier>', 3);
            this.p('</Filter>', 2);
        }
        this.p('</ItemGroup>', 1);
        if (platform === Platform_1.Platform.WindowsApp) {
            this.p('<ItemGroup>', 1);
            this.p('<AppxManifest Include="Package.appxmanifest">', 2);
            this.p('<Filter>Package</Filter>', 3);
            this.p('</AppxManifest>', 2);
            this.p('</ItemGroup>', 1);
            const images = ['Logo.scale-100.png', 'SmallLogo.scale-100.png', 'StoreLogo.scale-100.png', 'SplashScreen.scale-100.png', 'WideLogo.scale-100.png'];
            for (let image of images) {
                this.p('<ItemGroup>', 1);
                this.p('<Image Include="' + image + '">', 2);
                this.p('<Filter>Package</Filter>', 3);
                this.p('</Image>', 2);
                this.p('</ItemGroup>', 1);
            }
        }
        lastdir = '';
        this.p('<ItemGroup>', 1);
        for (let file of project.getFiles()) {
            let dir = getDir(file);
            if (dir !== lastdir)
                lastdir = dir;
            if (file.file.endsWith('.h') || file.file.endsWith('.hpp')) {
                this.p('<ClInclude Include="' + this.nicePath(from, to, file.file) + '">', 2);
                this.p('<Filter>' + dir.replace(/\//g, '\\') + '</Filter>', 3);
                this.p('</ClInclude>', 2);
            }
        }
        this.p('</ItemGroup>', 1);
        lastdir = '';
        this.p('<ItemGroup>', 1);
        for (let file of project.getFiles()) {
            let dir = getDir(file);
            if (dir !== lastdir)
                lastdir = dir;
            if (file.file.endsWith('.cpp') || file.file.endsWith('.c') || file.file.endsWith('.cc') || file.file.endsWith('.cxx')) {
                this.p('<ClCompile Include="' + this.nicePath(from, to, file.file) + '">', 2);
                this.p('<Filter>' + dir.replace(/\//g, '\\') + '</Filter>', 3);
                this.p('</ClCompile>', 2);
            }
        }
        this.p('</ItemGroup>', 1);
        lastdir = '';
        this.p('<ItemGroup>', 1);
        for (let file of project.getFiles()) {
            let dir = getDir(file);
            if (dir !== lastdir)
                lastdir = dir;
            if (file.file.endsWith('.cg') || file.file.endsWith('.hlsl')) {
                this.p('<CustomBuild Include="' + this.nicePath(from, to, file.file) + '">', 2);
                this.p('<Filter>' + dir.replace(/\//g, '\\') + '</Filter>', 3);
                this.p('</CustomBuild>', 2);
            }
        }
        this.p('</ItemGroup>', 1);
        lastdir = '';
        this.p('<ItemGroup>', 1);
        for (let file of project.getFiles()) {
            let dir = getDir(file);
            if (dir !== lastdir)
                lastdir = dir;
            if (file.file.endsWith('.asm')) {
                this.p('<MASM Include="' + this.nicePath(from, to, file.file) + '">', 2);
                this.p('<Filter>' + dir.replace(/\//g, '\\') + '</Filter>', 3);
                this.p('</MASM>', 2);
            }
        }
        this.p('</ItemGroup>', 1);
        if (platform === Platform_1.Platform.WindowsApp || platform === Platform_1.Platform.XboxOne) {
            lastdir = '';
            this.p('<ItemGroup>', 1);
            for (let file of assets) {
                if (file.indexOf('\\') >= 0 && !isGitPath(file)) {
                    let dir = getDirFromString(file, 'Deployment');
                    if (dir !== lastdir)
                        lastdir = dir;
                    this.p('<None Include="' + this.nicePath(from, to, file) + '">', 2);
                    this.p('<Filter>' + dir.replace(/\//g, '\\') + '</Filter>', 3);
                    this.p('</None>', 2);
                }
            }
            this.p('</ItemGroup>', 1);
        }
        if (platform === Platform_1.Platform.Windows) {
            lastdir = '';
            this.p('<ItemGroup>', 1);
            this.p('<None Include="icon.ico">', 2);
            this.p('<Filter>Ressourcendateien</Filter>', 3);
            this.p('</None>', 2);
            this.p('</ItemGroup>', 1);
            this.p('<ItemGroup>', 1);
            this.p('<ResourceCompile Include="resources.rc">', 2);
            this.p('<Filter>Ressourcendateien</Filter>', 3);
            this.p('</ResourceCompile>', 2);
            for (let file of project.getFiles()) {
                let dir = getDir(file);
                if (dir !== lastdir)
                    lastdir = dir;
                if (file.file.endsWith('.rc')) {
                    this.p('<ResourceCompile Include="' + this.nicePath(from, to, file.file) + '">', 2);
                    this.p('<Filter>' + dir.replace(/\//g, '\\') + '</Filter>', 3);
                    this.p('</ResourceCompile>', 2);
                }
            }
            this.p('</ItemGroup>', 1);
        }
        this.p('</Project>');
        this.closeFile();
    }
    addPropertyGroup(buildType, wholeProgramOptimization, platform) {
        this.p('<PropertyGroup Condition="\'$(Configuration)|$(Platform)\'==\'' + buildType + '|' + this.GetSys(platform) + '\'" Label="Configuration">', 1);
        this.p('<ConfigurationType>Application</ConfigurationType>', 2);
        this.p('<WholeProgramOptimization>' + (wholeProgramOptimization ? 'true' : 'false') + '</WholeProgramOptimization>', 2);
        this.p('<CharacterSet>MultiByte</CharacterSet>', 2);
        this.p('</PropertyGroup>', 1);
    }
    getPlatformToolset() {
        switch (Options_1.Options.visualStudioVersion) {
            case VisualStudioVersion_1.VisualStudioVersion.VS2010:
                return 'v100';
            case VisualStudioVersion_1.VisualStudioVersion.VS2012:
                return 'v110';
            case VisualStudioVersion_1.VisualStudioVersion.VS2013:
                return 'v120';
            case VisualStudioVersion_1.VisualStudioVersion.VS2015:
                return 'v140';
            case VisualStudioVersion_1.VisualStudioVersion.VS2017:
                return 'v141';
            case VisualStudioVersion_1.VisualStudioVersion.VS2019:
                return 'v142';
            default:
                throw 'Unknown Visual Studio version';
        }
    }
    addWin8PropertyGroup(debug, platform) {
        this.p('<PropertyGroup Condition="\'$(Configuration)|$(Platform)\'==\'' + (debug ? 'Debug' : 'Release') + '|' + platform + '\'" Label="Configuration">', 1);
        this.p('<ConfigurationType>Application</ConfigurationType>', 2);
        this.p('<UseDebugLibraries>' + (debug ? 'true' : 'false') + '</UseDebugLibraries>', 2);
        if (!debug)
            this.p('<WholeProgramOptimization>true</WholeProgramOptimization>', 2);
        this.p('<PlatformToolset>' + this.getPlatformToolset() + '</PlatformToolset>', 2);
        if (!debug)
            this.p('<UseDotNetNativeToolchain>true</UseDotNetNativeToolchain>', 2);
        this.p('</PropertyGroup>', 1);
    }
    configuration(config, system, indent) {
        this.p('<PropertyGroup Condition="\'$(Configuration)\'==\'' + config + '\'" Label="Configuration">', indent);
        this.p('<ConfigurationType>Application</ConfigurationType>', indent + 1);
        this.p('<UseDebugLibraries>' + (config === 'Release' ? 'false' : 'true') + '</UseDebugLibraries>', indent + 1);
        this.p('<PlatformToolset>' + this.getPlatformToolset() + '</PlatformToolset>', indent + 1);
        this.p('<PreferredToolArchitecture>x64</PreferredToolArchitecture>', indent + 1);
        if (config === 'Release') {
            this.p('<WholeProgramOptimization>true</WholeProgramOptimization>', indent + 1);
        }
        this.p('<CharacterSet>Unicode</CharacterSet>', indent + 1);
        this.p('</PropertyGroup>', indent);
    }
    propertySheet(config, system, indent) {
    }
    addOns(config, system, indent) {
    }
    addOns2(config, system, debugDir, indent) {
    }
    getOptimization(config) {
        switch (config) {
            case 'Debug':
            default:
                return 'Disabled';
            case 'Develop':
                return 'Full';
            case 'Release':
                return 'MaxSpeed';
        }
    }
    itemDefinition(config, system, includes, debugDefines, releaseDefines, indent, debuglibs, releaselibs, from, project) {
        this.p('<ItemDefinitionGroup Condition="\'$(Configuration)|$(Platform)\'==\'' + config + '|' + system + '\'">', indent);
        this.p('<ClCompile>', indent + 1);
        if (Options_1.Options.precompiledHeaders)
            this.p('<PrecompiledHeader>Use</PrecompiledHeader>', indent + 2);
        this.p('<AdditionalIncludeDirectories>' + includes + '</AdditionalIncludeDirectories>', indent + 2);
        this.p('<AdditionalOptions>/bigobj %(AdditionalOptions)</AdditionalOptions>', indent + 2);
        this.p('<WarningLevel>Level3</WarningLevel>', indent + 2);
        this.p('<Optimization>' + this.getOptimization(config) + '</Optimization>', indent + 2);
        if (config === 'Release') {
            this.p('<FunctionLevelLinking>true</FunctionLevelLinking>', indent + 2);
            this.p('<IntrinsicFunctions>true</IntrinsicFunctions>', indent + 2);
        }
        this.p('<PreprocessorDefinitions>' + (config === 'Release' ? releaseDefines : debugDefines) + ((system === 'x64') ? 'SYS_64;' : '') + 'WIN32;_WINDOWS;%(PreprocessorDefinitions)</PreprocessorDefinitions>', indent + 2);
        this.p('<RuntimeLibrary>' + (config === 'Release' ? 'MultiThreaded' : 'MultiThreadedDebug') + '</RuntimeLibrary>', indent + 2);
        this.p('<MultiProcessorCompilation>true</MultiProcessorCompilation>', indent + 2);
        this.p('<MinimalRebuild>false</MinimalRebuild>', indent + 2);
        // if (Options.visualStudioVersion == VisualStudioVersion.VS2013) this.p("<SDLCheck>true</SDLCheck>", 3);
        if (config === 'Develop') {
            this.p('<BasicRuntimeChecks>Default</BasicRuntimeChecks>', indent + 2);
        }
        this.p('</ClCompile>', indent + 1);
        this.p('<Link>', indent + 1);
        if (project.isCmd())
            this.p('<SubSystem>Console</SubSystem>', indent + 2);
        else
            this.p('<SubSystem>Windows</SubSystem>', indent + 2);
        if (Options_1.Options.visualStudioVersion !== VisualStudioVersion_1.VisualStudioVersion.VS2017)
            this.p('<GenerateDebugInformation>true</GenerateDebugInformation>', indent + 2);
        if (config === 'Release') {
            this.p('<EnableCOMDATFolding>true</EnableCOMDATFolding>', indent + 2);
            this.p('<OptimizeReferences>true</OptimizeReferences>', indent + 2);
        }
        {
            let libs = config === 'Release' ? releaselibs : debuglibs;
            for (let lib of project.getLibsFor((config === 'Release' ? 'release_' : 'debug_') + system)) {
                if (fs.existsSync(path.resolve(from, lib + '.lib')))
                    libs += path.resolve(from, lib) + '.lib;';
                else
                    libs += lib + '.lib;';
            }
            for (let lib of project.getLibsFor(system)) {
                if (fs.existsSync(path.resolve(from, lib + '.lib')))
                    libs += path.resolve(from, lib) + '.lib;';
                else
                    libs += lib + '.lib;';
            }
            for (let lib of project.getLibsFor(config === 'Release' ? 'release' : 'debug')) {
                if (fs.existsSync(path.resolve(from, lib + '.lib')))
                    libs += path.resolve(from, lib) + '.lib;';
                else
                    libs += lib + '.lib;';
            }
            this.p('<AdditionalDependencies>' + libs + 'kernel32.lib;user32.lib;gdi32.lib;winspool.lib;comdlg32.lib;advapi32.lib;shell32.lib;ole32.lib;oleaut32.lib;uuid.lib;odbc32.lib;odbccp32.lib;%(AdditionalDependencies)</AdditionalDependencies>', indent + 2);
            if (project.stackSize) {
                this.p('<StackReserveSize>' + project.stackSize + '</StackReserveSize>', indent + 2);
            }
        }
        this.p('</Link>', indent + 1);
        this.p('<Manifest>', indent + 1);
        this.p('<EnableDpiAwareness>PerMonitorHighDPIAware</EnableDpiAwareness>', indent + 2);
        this.p('</Manifest>', indent + 1);
        this.p('</ItemDefinitionGroup>', indent);
    }
    additionalItemGroups(indent, from, to, project) {
    }
    // private void addWinMD(String name) {
    //     p("<Reference Include=\"" + name + ".winmd\">", 2);
    //     p("<IsWinMDFile>true</IsWinMDFile>", 3);
    //     p("</Reference>", 2);
    // }
    toolsVersion() {
        switch (Options_1.Options.visualStudioVersion) {
            case VisualStudioVersion_1.VisualStudioVersion.VS2010:
            case VisualStudioVersion_1.VisualStudioVersion.VS2012:
                return '4.0';
            case VisualStudioVersion_1.VisualStudioVersion.VS2013:
                return '12.0';
            case VisualStudioVersion_1.VisualStudioVersion.VS2015:
                return '14.0';
            case VisualStudioVersion_1.VisualStudioVersion.VS2017:
                return '15.0';
            default:
                return 'Current';
        }
    }
    findWindowsSdk() {
        const errorMessage = 'Could not find a Windows SDK, make sure Visual Studio is installed with C/C++ support.';
        return new Promise((resolve, reject) => {
            try {
                const Registry = require('winreg');
                const regKey = new Registry({ hive: Registry.HKLM, key: '\\SOFTWARE\\Microsoft\\Windows Kits\\Installed Roots' });
                regKey.keys((err, items) => {
                    if (err) {
                        log.error('Error while reading the registry: ' + err);
                        log.error(errorMessage);
                        resolve(null);
                    }
                    else {
                        let best = [0, 0, 0, 0];
                        for (let item of items) {
                            let key = item.key;
                            let elements = key.split('\\');
                            let last = elements[elements.length - 1];
                            if (last.indexOf('.') >= 0) {
                                let numstrings = last.split('.');
                                let nums = [];
                                for (let str of numstrings) {
                                    nums.push(parseInt(str));
                                }
                                if (nums[0] > best[0]) {
                                    best = nums;
                                }
                                else if (nums[0] === best[0]) {
                                    if (nums[1] > best[1]) {
                                        best = nums;
                                    }
                                    else if (nums[1] === best[1]) {
                                        if (nums[2] > best[2]) {
                                            best = nums;
                                        }
                                        else if (nums[2] === best[2]) {
                                            if (nums[3] > best[3]) {
                                                best = nums;
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        if (best[0] > 0) {
                            resolve(best[0] + '.' + best[1] + '.' + best[2] + '.' + best[3]);
                        }
                        else {
                            resolve(null);
                        }
                    }
                });
            }
            catch (err) {
                log.error('Error while trying to figure out the Windows SDK version: ' + err);
                log.error(errorMessage);
                resolve(null);
            }
        });
    }
    async globals(platform, indent) {
        let windowsTargetVersion = Options_1.Options.visualStudioVersion === VisualStudioVersion_1.VisualStudioVersion.VS2017 ? '10.0.16299.0' : '10.0.14393.0';
        let foundVersion = await this.findWindowsSdk();
        if (foundVersion) {
            windowsTargetVersion = foundVersion;
        }
        if (Options_1.Options.visualStudioVersion === VisualStudioVersion_1.VisualStudioVersion.VS2019) {
            this.p('<VCProjectVersion>16.0</VCProjectVersion>', indent);
        }
        else if (Options_1.Options.visualStudioVersion === VisualStudioVersion_1.VisualStudioVersion.VS2017) {
            this.p('<VCProjectVersion>15.0</VCProjectVersion>', indent);
        }
        if (platform === Platform_1.Platform.WindowsApp) {
            this.p('<DefaultLanguage>en-US</DefaultLanguage>', indent);
            this.p('<MinimumVisualStudioVersion>14.0</MinimumVisualStudioVersion>', indent);
            this.p('<AppContainerApplication>true</AppContainerApplication>', indent);
            this.p('<ApplicationType>Windows Store</ApplicationType>', indent);
            this.p('<ApplicationTypeRevision>8.2</ApplicationTypeRevision>', indent);
            this.p('<WindowsTargetPlatformVersion>' + windowsTargetVersion + '</WindowsTargetPlatformVersion>', indent);
            this.p('<WindowsTargetPlatformMinVersion>' + windowsTargetVersion + '</WindowsTargetPlatformMinVersion>', indent);
            this.p('<ApplicationTypeRevision>10.0</ApplicationTypeRevision>', indent);
            this.p('<EnableDotNetNativeCompatibleProfile>true</EnableDotNetNativeCompatibleProfile>', indent);
        }
        if (Options_1.Options.graphicsApi === GraphicsApi_1.GraphicsApi.Direct3D12 || platform === Platform_1.Platform.WindowsApp || Options_1.Options.visualStudioVersion === VisualStudioVersion_1.VisualStudioVersion.VS2017) {
            this.p('<WindowsTargetPlatformVersion>' + windowsTargetVersion + '</WindowsTargetPlatformVersion>', indent);
        }
        else if (Options_1.Options.visualStudioVersion === VisualStudioVersion_1.VisualStudioVersion.VS2019) {
            this.p('<WindowsTargetPlatformVersion>10.0</WindowsTargetPlatformVersion>', indent);
        }
    }
    customItemGroups(indent) {
    }
    additionalPropertyGroups(indent) {
    }
    extensionSettings(indent) {
        this.p('<Import Project="$(VCTargetsPath)\\BuildCustomizations\\masm.props" />');
    }
    additionalImportGroups(indent) {
    }
    extensionTargets(indent) {
        this.p('<Import Project="$(VCTargetsPath)\\BuildCustomizations\\masm.targets"/>', indent);
    }
    async exportProject(from, to, project, platform, cmd, noshaders) {
        for (let proj of project.getSubProjects())
            await this.exportProject(from, to, proj, platform, cmd, noshaders);
        this.writeFile(path.resolve(to, project.getName() + '.vcxproj'));
        this.p('<?xml version="1.0" encoding="utf-8"?>');
        const toolsVersion = this.toolsVersion() === 'Current' ? '' : 'ToolsVersion="' + this.toolsVersion() + '" ';
        this.p('<Project DefaultTargets="Build" ' + toolsVersion + 'xmlns="http://schemas.microsoft.com/developer/msbuild/2003">');
        this.p('<ItemGroup Label="ProjectConfigurations">', 1);
        for (let system of this.getSystems(platform)) {
            for (let config of this.getConfigs(platform)) {
                this.p('<ProjectConfiguration Include="' + config + '|' + system + '">', 2);
                this.p('<Configuration>' + config + '</Configuration>', 3);
                this.p('<Platform>' + system + '</Platform>', 3);
                this.p('</ProjectConfiguration>', 2);
            }
        }
        this.p('</ItemGroup>', 1);
        this.customItemGroups(1);
        this.p('<PropertyGroup Label="Globals">', 1);
        this.p('<ProjectGuid>{' + project.getUuid().toString().toUpperCase() + '}</ProjectGuid>', 2);
        // p("<Keyword>Win32Proj</Keyword>", 2);
        // p("<RootNamespace>" + project.Name + "</RootNamespace>", 2);
        await this.globals(platform, 2);
        this.p('</PropertyGroup>', 1);
        this.p('<Import Project="$(VCTargetsPath)\\Microsoft.Cpp.Default.props" />', 1);
        if (platform === Platform_1.Platform.WindowsApp) {
            this.addWin8PropertyGroup(true, 'Win32');
            this.addWin8PropertyGroup(true, 'ARM');
            this.addWin8PropertyGroup(true, 'x64');
            this.addWin8PropertyGroup(false, 'Win32');
            this.addWin8PropertyGroup(false, 'ARM');
            this.addWin8PropertyGroup(false, 'x64');
        }
        else {
            for (let config of this.getConfigs(platform)) {
                for (let system of this.getSystems(platform)) {
                    this.configuration(config, system, 1);
                }
            }
        }
        this.p('<Import Project="$(VCTargetsPath)\\Microsoft.Cpp.props" />', 1);
        this.additionalPropertyGroups(1);
        this.p('<ImportGroup Label="ExtensionSettings">', 1);
        this.extensionSettings(2);
        this.p('</ImportGroup>', 1);
        this.additionalImportGroups(1);
        this.p('<PropertyGroup Label="UserMacros" />', 1);
        if (platform === Platform_1.Platform.WindowsApp) {
            const configurations = ['Debug', 'Release'];
            for (let configuration of configurations) {
                for (let system of this.getSystems(platform)) {
                    this.p('<ImportGroup Label="PropertySheets" Condition="\'$(Configuration)|$(Platform)\'==\'' + configuration + '|' + system + '\'">', 1);
                    this.p('<Import Project="$(UserRootDir)\\Microsoft.Cpp.$(Platform).user.props" Condition="exists(\'$(UserRootDir)\\Microsoft.Cpp.$(Platform).user.props\')" Label="LocalAppDataPlatform" />', 2);
                    this.p('</ImportGroup>', 1);
                }
            }
        }
        else if (platform === Platform_1.Platform.Windows) {
            for (let system of this.getSystems(platform)) {
                this.p('<ImportGroup Label="PropertySheets" Condition="\'$(Platform)\'==\'' + system + '\'">', 1);
                this.p('<Import Project="$(UserRootDir)\\Microsoft.Cpp.$(Platform).user.props" Condition="exists(\'$(UserRootDir)\\Microsoft.Cpp.$(Platform).user.props\')" Label="LocalAppDataPlatform" />', 2);
                this.p('</ImportGroup>', 1);
            }
        }
        else {
            for (let config of this.getConfigs(platform)) {
                for (let system of this.getSystems(platform)) {
                    this.propertySheet(config, system, 1);
                }
            }
        }
        for (let config of this.getConfigs(platform)) {
            for (let system of this.getSystems(platform)) {
                this.addOns(config, system, 1);
            }
        }
        for (let config of this.getConfigs(platform)) {
            for (let system of this.getSystems(platform)) {
                this.addOns2(config, system, this.getDebugDir(from, project), 1);
            }
        }
        let debugDefines = '_DEBUG;';
        let releaseDefines = 'NDEBUG;';
        for (const define of project.getDefines()) {
            if (define.config && define.config.toLowerCase() === 'debug') {
                debugDefines += define.value + ';';
            }
            else if (define.config && define.config.toLowerCase() === 'release') {
                releaseDefines += define.value + ';';
            }
            else {
                debugDefines += define.value + ';';
                releaseDefines += define.value + ';';
            }
        }
        let incstring = '';
        for (let include of project.getIncludeDirs()) {
            if (path.isAbsolute(include)) {
                incstring += include + ';';
            }
            else {
                incstring += path.resolve(from, include) + ';';
            }
        }
        if (incstring.length > 0)
            incstring = incstring.substr(0, incstring.length - 1);
        let debuglibs = '';
        for (let proj of project.getSubProjects())
            debuglibs += 'Debug\\' + proj.getName() + '.lib;';
        for (let lib of project.getLibs()) {
            if (fs.existsSync(path.resolve(from, lib + '.lib')))
                debuglibs += path.resolve(from, lib) + '.lib;';
            else
                debuglibs += lib + '.lib;';
        }
        let releaselibs = '';
        for (let proj of project.getSubProjects())
            releaselibs += 'Release\\' + proj.getName() + '.lib;';
        for (let lib of project.getLibs()) {
            if (fs.existsSync(path.resolve(from, lib + '.lib')))
                releaselibs += path.resolve(from, lib) + '.lib;';
            else
                releaselibs += lib + '.lib;';
        }
        if (platform === Platform_1.Platform.WindowsApp) {
            /*this.p("<ItemDefinitionGroup>", 1);
             this.p("<Link>", 2);
             this.p("<AdditionalDependencies>MMDevAPI.lib;MFuuid.lib;MFReadWrite.lib;MFplat.lib;d2d1.lib;d3d11.lib;dxgi.lib;ole32.lib;windowscodecs.lib;dwrite.lib;%(AdditionalDependencies)</AdditionalDependencies>", 3);
             this.p("</Link>", 2);
             var compile = new ClCompile(this.out, 2, Platform.WindowsApp, Configuration.Debug, incstring.split(';'), defines.split(';'));
             compile.print();
             this.p("</ItemDefinitionGroup>", 1);*/
            const configs = [
                { config: 'Debug', system: 'ARM', libdir: '\\arm' }, { config: 'Release', system: 'ARM', libdir: '\\arm' },
                { config: 'Debug', system: 'Win32', libdir: '' }, { config: 'Release', system: 'Win32', libdir: '' },
                { config: 'Debug', system: 'x64', libdir: '\\amd64' }, {
                    config: 'Release',
                    system: 'x64',
                    libdir: '\\amd64'
                }
            ];
            for (let config of configs) {
                let libdir = '';
                let archDefine = '';
                switch (config.system) {
                    case 'ARM': {
                        libdir = '\\arm';
                        break;
                    }
                    case 'x64': {
                        libdir = '\\amd64';
                        archDefine = 'SYS_64;';
                        break;
                    }
                }
                this.p('<ItemDefinitionGroup Condition="\'$(Configuration)|$(Platform)\'==\'' + config.config + '|' + config.system + '\'">', 1);
                this.p('<Link>', 2);
                if (config.config === 'Debug') {
                    this.p('<AdditionalDependencies>d3d11.lib; dxgi.lib; windowscodecs.lib; vccorlibd.lib; msvcrtd.lib; %(AdditionalDependencies)</AdditionalDependencies>', 3);
                    this.p('<IgnoreSpecificDefaultLibraries>vccorlibd; msvcrtd</IgnoreSpecificDefaultLibraries>', 3);
                }
                else {
                    this.p('<AdditionalDependencies>d3d11.lib; dxgi.lib; windowscodecs.lib; vccorlib.lib; msvcrt.lib; %(AdditionalDependencies)</AdditionalDependencies>', 3);
                    this.p('<IgnoreSpecificDefaultLibraries>vccorlib; msvcrt</IgnoreSpecificDefaultLibraries>', 3);
                }
                this.p('<AdditionalLibraryDirectories>%(AdditionalLibraryDirectories); $(VCInstallDir)\\lib\\store\\' + libdir + '; $(VCInstallDir)\\lib\\' + libdir + '</AdditionalLibraryDirectories>', 3);
                this.p('</Link>', 2);
                this.p('<ClCompile>', 2);
                this.p('<PrecompiledHeader>NotUsing</PrecompiledHeader>', 3);
                this.p('<AdditionalIncludeDirectories>' + incstring + ';%(AdditionalIncludeDirectories)</AdditionalIncludeDirectories>', 3);
                this.p('<AdditionalOptions>/bigobj %(AdditionalOptions)</AdditionalOptions>', 3);
                this.p('<DisableSpecificWarnings>4453;28204</DisableSpecificWarnings>', 3);
                this.p('<PreprocessorDefinitions>' + (config.config === 'Debug' ? debugDefines : releaseDefines) + archDefine + '%(PreprocessorDefinitions)</PreprocessorDefinitions>', 3);
                this.p('</ClCompile>', 2);
                this.p('<Manifest>', 2);
                this.p('<EnableDpiAwareness>PerMonitorHighDPIAware</EnableDpiAwareness>', 3);
                this.p('</Manifest>', 2);
                this.p('</ItemDefinitionGroup>', 1);
            }
        }
        else {
            for (let config of this.getConfigs(platform)) {
                for (let system of this.getSystems(platform)) {
                    this.itemDefinition(config, system, incstring, debugDefines, releaseDefines, 2, debuglibs, releaselibs, from, project);
                }
            }
        }
        this.p('<ItemGroup>', 1);
        for (let file of project.getFiles()) {
            if (file.file.endsWith('.h') || file.file.endsWith('.hpp'))
                this.p('<ClInclude Include="' + this.nicePath(from, to, file.file) + '" />', 2);
        }
        this.p('</ItemGroup>', 1);
        if (platform === Platform_1.Platform.WindowsApp) {
            this.p('<ItemGroup>', 1);
            const images = ['Logo.scale-100.png', 'SmallLogo.scale-100.png', 'StoreLogo.scale-100.png', 'SplashScreen.scale-100.png', 'WideLogo.scale-100.png'];
            for (let image of images) {
                this.p('<Image Include="' + image + '" />', 2);
            }
            this.p('</ItemGroup>', 1);
            this.p('<ItemGroup>', 1);
            this.p('<AppxManifest Include="Package.appxmanifest" />', 2);
            this.p('</ItemGroup>', 1);
        }
        if (platform === Platform_1.Platform.WindowsApp || platform === Platform_1.Platform.XboxOne) {
            this.p('<ItemGroup>', 1);
            this.exportAssetPath(project, from, to, path.resolve(from, project.getDebugDir()));
            this.p('</ItemGroup>', 1);
        }
        this.p('<ItemGroup>', 1);
        let objects = {};
        let precompiledHeaders = [];
        for (let fileobject of project.getFiles()) {
            if (fileobject.options && fileobject.options.pch && precompiledHeaders.indexOf(fileobject.options.pch) < 0) {
                precompiledHeaders.push(fileobject.options.pch);
            }
        }
        for (let fileobject of project.getFiles()) {
            let file = fileobject.file;
            if (file.endsWith('.cpp') || file.endsWith('.c') || file.endsWith('cc') || file.endsWith('cxx')) {
                let name = file.toLowerCase();
                if (name.indexOf('/') >= 0)
                    name = name.substr(name.lastIndexOf('/') + 1);
                name = name.substr(0, name.lastIndexOf('.'));
                if (!objects[name]) {
                    let headerfile = null;
                    for (let header of precompiledHeaders) {
                        if (file.endsWith(header.substr(0, header.length - 2) + '.cpp')) {
                            headerfile = header;
                            break;
                        }
                    }
                    if (headerfile !== null && platform === Platform_1.Platform.Windows) {
                        this.p('<ClCompile Include="' + path.resolve(from, file) + '">', 2);
                        this.p('<PrecompiledHeader>Create</PrecompiledHeader>', 3);
                        this.p('<PrecompiledHeaderFile>' + headerfile + '</PrecompiledHeaderFile>', 3);
                        this.p('</ClCompile>', 2);
                    }
                    else if ((platform === Platform_1.Platform.WindowsApp || platform === Platform_1.Platform.XboxOne) && !file.endsWith('.winrt.cpp')) {
                        this.p('<ClCompile Include="' + this.nicePath(from, to, file) + '">', 2);
                        this.p('<CompileAsWinRT>false</CompileAsWinRT>', 3);
                        this.p('</ClCompile>', 2);
                    }
                    else {
                        if (fileobject.options && fileobject.options.pch && platform === Platform_1.Platform.Windows) {
                            this.p('<ClCompile Include="' + this.nicePath(from, to, file) + '">', 2);
                            this.p('<PrecompiledHeader>Use</PrecompiledHeader>', 3);
                            this.p('<PrecompiledHeaderFile>' + fileobject.options.pch + '</PrecompiledHeaderFile>', 3);
                            this.p('</ClCompile>', 2);
                        }
                        else {
                            this.p('<ClCompile Include="' + this.nicePath(from, to, file) + '" />', 2);
                        }
                    }
                    objects[name] = true;
                }
                else {
                    while (objects[name]) {
                        name = name + '_';
                    }
                    this.p('<ClCompile Include="' + this.nicePath(from, to, file) + '">', 2);
                    this.p('<ObjectFileName>$(IntDir)\\' + name + '.obj</ObjectFileName>', 3);
                    if ((platform === Platform_1.Platform.WindowsApp || platform === Platform_1.Platform.XboxOne) && !file.endsWith('.winrt.cpp')) {
                        this.p('<CompileAsWinRT>false</CompileAsWinRT>', 3);
                    }
                    this.p('</ClCompile>', 2);
                    objects[name] = true;
                }
            }
        }
        this.p('</ItemGroup>', 1);
        this.p('<ItemGroup>', 1);
        for (let file of project.getFiles()) {
            if (file.file.endsWith('.natvis')) {
                this.p('<Natvis Include="' + this.nicePath(from, to, file.file) + '"/>', 2);
            }
        }
        this.p('</ItemGroup>', 1);
        if (platform === Platform_1.Platform.Windows) {
            this.p('<ItemGroup>', 1);
            for (let file of project.getFiles()) {
                if (Project_1.Project.koreDir && Project_1.Project.koreDir.toString() !== '' && !noshaders && file.file.endsWith('.glsl')) {
                    this.p('<CustomBuild Include="' + this.nicePath(from, to, file.file) + '">', 2);
                    this.p('<FileType>Document</FileType>', 2);
                    this.p('<Command>"' + path.relative(to, path.join(from, Project_1.Project.koreDir, 'Tools', 'krafix', 'krafix.exe')) + '" ' + getShaderLang() + ' "%(FullPath)" ' + path.relative(to, path.join(from, project.getDebugDir(), '%(Filename)')).replace(/\//g, '\\') + ' .\\ ' + platform + ' --quiet</Command>', 2);
                    this.p('<Outputs>' + path.relative(to, path.join(from, project.getDebugDir(), '%(Filename)')).replace(/\//g, '\\') + ';%(Outputs)</Outputs>', 2);
                    this.p('<Message>%(Filename)%(Extension)</Message>', 2);
                    this.p('</CustomBuild>', 2);
                }
            }
            this.p('</ItemGroup>', 1);
            this.p('<ItemGroup>', 1);
            for (let file of project.getFiles()) {
                if (file.file.endsWith('.asm')) {
                    this.p('<MASM Include="' + this.nicePath(from, to, file.file) + '"/>');
                }
            }
            this.p('</ItemGroup>', 1);
            this.p('<ItemGroup>', 1);
            for (let file of project.customs) {
                this.p('<CustomBuild Include="' + this.nicePath(from, to, file.file) + '">', 2);
                this.p('<FileType>Document</FileType>', 2);
                this.p('<Command>' + file.command + '</Command>', 2);
                this.p('<Outputs>' + file.output + '</Outputs>', 2);
                this.p('<Message>%(Filename)%(Extension)</Message>', 2);
                this.p('</CustomBuild>', 2);
            }
            this.p('</ItemGroup>');
            this.p('<ItemGroup>', 1);
            this.p('<None Include="icon.ico" />', 2);
            this.p('</ItemGroup>', 1);
            this.p('<ItemGroup>', 1);
            this.p('<ResourceCompile Include="resources.rc" />', 2);
            for (let file of project.getFiles()) {
                if (file.file.endsWith('.rc')) {
                    this.p('<ResourceCompile Include="' + this.nicePath(from, to, file.file) + '" />', 2);
                }
            }
            this.p('</ItemGroup>', 1);
        }
        this.additionalItemGroups(1, from, to, project);
        this.p('<Import Project="$(VCTargetsPath)\\Microsoft.Cpp.targets" />', 1);
        this.p('<ImportGroup Label="ExtensionTargets">', 1);
        this.extensionTargets(2);
        this.p('</ImportGroup>', 1);
        this.p('</Project>');
        this.closeFile();
    }
    exportAssetPath(project, from, to, assetPath) {
        if (isGitPath(assetPath))
            return;
        let paths = fs.readdirSync(assetPath);
        for (let p of paths) {
            if (isGitPath(p))
                continue;
            if (fs.statSync(path.join(assetPath, p)).isDirectory()) {
                this.exportAssetPath(project, from, to, path.join(assetPath, p));
            }
            else {
                this.p('<None Include="' + this.nicePath(from, to, path.join(assetPath, p)) + '">', 2);
                this.p('<DeploymentContent>true</DeploymentContent>', 3);
                this.p('<Link>' + path.relative(project.getDebugDir(), path.join(assetPath, p)) + '</Link>', 3);
                this.p('</None>', 2);
            }
        }
    }
}
exports.VisualStudioExporter = VisualStudioExporter;
//# sourceMappingURL=VisualStudioExporter.js.map