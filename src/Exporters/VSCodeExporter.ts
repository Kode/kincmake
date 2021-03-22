import {Exporter} from './Exporter';
import {Project} from '../Project';
import {Platform} from '../Platform';
import * as fs from 'fs-extra';
import * as path from 'path';

export class VSCodeExporter extends Exporter {
	constructor() {
		super();
	}

	configName(platform: string): string {
		if (platform === Platform.Windows) {
			return 'Win32';
		}
		else if (platform === Platform.Linux) {
			return 'Linux';
		}
		else if (platform === Platform.OSX) {
			return 'Mac';
		}
		else {
			return 'unknown platform';
		}
	}

	compilerPath(platform: string): string {
		if (platform === Platform.Windows) {
			return 'C:/Program Files (x86)/Microsoft Visual Studio/2019/Community/VC/Tools/MSVC/14.27.29110/bin/Hostx64/x64/cl.exe';
		}
		else if (platform === Platform.Linux) {
			return '/usr/bin/gcc';
		}
		else if (platform === Platform.OSX) {
			return '/usr/bin/clang';
		}
		else {
			return 'unknown platform';
		}
	}

	intelliSenseMode(platform: string): string {
		if (platform === Platform.Windows) {
			return 'msvc-x64';
		}
		else if (platform === Platform.Linux) {
			return 'gcc-x64';
		}
		else if (platform === Platform.OSX) {
			return 'clang-x64';
		}
		else {
			return 'unknown platform';
		}
	}

	async exportSolution(project: Project, from: string, to: string, platform: string, vrApi: any, options: any) {
		fs.ensureDirSync(path.join(from, '.vscode'));
		this.writeFile(path.join(from, '.vscode', 'c_cpp_properties.json'));

		const defines: String[] = [];
		for (const define of project.getDefines()) {
			defines.push(define.value);
		}

		const includes: String[] = [];
		for (const include of project.getIncludeDirs()) {
			if (path.isAbsolute(include)) {
				includes.push(include );
			}
			else {
				includes.push('${workspaceFolder}/' + include);
			}
		}

		const config: any = {
			name: this.configName(platform),
			includePath: includes,
			defines: defines,
			compilerPath: this.compilerPath(platform),
			cStandard: 'c11',
			cppStandard: 'c++17',
			intelliSenseMode: this.intelliSenseMode(platform)
		};

		if (platform === Platform.Windows) {
			config.windowsSdkVersion = '10.0.19041.0';
		}

		if (platform === Platform.OSX) {
			config.macFrameworkPath = ['/Applications/Xcode.app/Contents/Developer/Platforms/MacOSX.platform/Developer/SDKs/MacOSX.sdk/System/Library/Frameworks'];
		}

		const data = {
			configurations: [
				config
			]
		};

		this.p(JSON.stringify(data, null, '\t'));
		this.closeFile();

		this.writeProtoLaunchJson(project, from, to, platform, vrApi, options);
	}

	writeProtoLaunchJson(project: Project, from: string, to: string, platform: string, vrApi: any, options: any) {
		this.writeFile(path.join(from, '.vscode', 'protolaunch.json'));
		const data: any = {
			name: 'Kinc: Launch',
			type: platform === Platform.Windows ? 'cppvsdbg' : 'cppdbg',
			request: 'launch',
			program: this.program(project, platform),
			cwd: project.getDebugDir(),
			preLaunchTask: 'Kinc: Build for ' + this.preLaunchTask(platform)
		};

		if (platform === Platform.Windows) {
			// data.symbolSearchPath = 'C:\\Symbols;C:\\SymbolDir2';
			data.externalConsole = true;
			data.logging = {
				moduleLoad: false,
				trace: true
			};
			// data.visualizerFile = '${workspaceFolder}/my.natvis';
		}
		else if (platform === Platform.OSX) {
			data.MIMode = 'lldb';
		}

		this.p(JSON.stringify(data, null, '\t'));
		this.closeFile();
	}

	program(project: Project, platform: string) {
		if (platform === Platform.OSX) {
			return path.join(project.getBasedir(), 'build', 'build', 'Release', project.getSafeName() + '.app', 'Contents', 'MacOS', project.getSafeName());
		}
		else {
			return path.join(project.getDebugDir(), project.getSafeName() + (platform === Platform.Windows ? '.exe' : ''));
		}
	}

	preLaunchTask(platform: string) {
		if (platform === Platform.Windows) {
			return 'Windows';
		}
		else if (platform === Platform.OSX) {
			return 'macOS';
		}
		else if (platform === Platform.Linux) {
			return 'Linux';
		}
		else if (platform === Platform.FreeBSD) {
			return 'FreeBSD';
		}
		else {
			return 'Unknown';
		}
	}
}
