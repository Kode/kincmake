import {Exporter} from './Exporter';
import {Project} from '../Project';
import * as fs from 'fs-extra';
import * as path from 'path';

export class VSCodeExporter extends Exporter {
	constructor() {
		super();
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
					name: 'Win32',
					includePath: [
						includes
					],
					defines: [
						defines
					],
					windowsSdkVersion: '10.0.19041.0',
					compilerPath: 'C:/Program Files (x86)/Microsoft Visual Studio/2019/Community/VC/Tools/MSVC/14.27.29110/bin/Hostx64/x64/cl.exe',
					cStandard: 'c11',
					cppStandard: 'c++17',
					intelliSenseMode: 'msvc-x64'
				}
			]
		};

		this.p(JSON.stringify(data, null, '\t'));

		this.closeFile();
	}
}
