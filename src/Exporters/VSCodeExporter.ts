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

		const data = {
			configurations: [
				{
					name: this.configName(platform),
					includePath: includes,
					defines: defines,
					windowsSdkVersion: '10.0.19041.0',
					macFrameworkPath: [
						'/Applications/Xcode.app/Contents/Developer/Platforms/MacOSX.platform/Developer/SDKs/MacOSX.sdk/System/Library/Frameworks'
					],
					compilerPath: this.compilerPath(platform),
					cStandard: 'c11',
					cppStandard: 'c++17',
					intelliSenseMode: this.intelliSenseMode(platform)
				}
			]
		};

		this.p(JSON.stringify(data, null, '\t'));

		this.closeFile();
	}
}
