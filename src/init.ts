import * as fs from 'fs';
import * as path from 'path';

export function run(name: string, from: string) {
	const projectfile = 'kincfile.js';
	if (!fs.existsSync(path.join(from, projectfile))) {
		fs.writeFileSync(path.join(from, projectfile),
			'let project = new Project(\'New Project\');\n'
			+ '\n'
			+ 'project.addFile(\'Sources/**\');\n'
			+ 'project.setDebugDir(\'Deployment\');\n'
			+ '\n'
			+ 'resolve(project);\n',
		{ encoding: 'utf8' });
	}

	if (!fs.existsSync(path.join(from, 'Sources'))) fs.mkdirSync(path.join(from, 'Sources'));

	let friendlyName = name;
	friendlyName = friendlyName.replace(/ /g, '_');
	friendlyName = friendlyName.replace(/-/g, '_');

	if (!fs.existsSync(path.join(from, 'Sources', 'main.cpp'))) {
		let mainsource = '#include <Kore/pch.h>\n\n'
			+ '\n'
			+ 'int kore(int argc, char** argv) {\n'
			+ '\treturn 0;\n'
			+ '}\n';
		fs.writeFileSync(path.join(from, 'Sources', 'main.cpp'), mainsource, { encoding: 'utf8' });
	}
}
