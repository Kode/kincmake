"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
function run(name, from) {
    const projectfile = 'kincfile.js';
    if (!fs.existsSync(path.join(from, projectfile))) {
        fs.writeFileSync(path.join(from, projectfile), 'let project = new Project(\'New Project\');\n'
            + '\n'
            + 'project.addFile(\'Sources/**\');\n'
            + 'project.setDebugDir(\'Deployment\');\n'
            + '\n'
            + 'resolve(project);\n', { encoding: 'utf8' });
    }
    if (!fs.existsSync(path.join(from, 'Sources')))
        fs.mkdirSync(path.join(from, 'Sources'));
    let friendlyName = name;
    friendlyName = friendlyName.replace(/ /g, '_');
    friendlyName = friendlyName.replace(/-/g, '_');
    if (!fs.existsSync(path.join(from, 'Sources', 'main.c'))) {
        let mainsource = '#include <Kinc/pch.h>\n\n'
            + 'int kickstart(int argc, char** argv) {\n'
            + '\treturn 0;\n'
            + '}\n';
        fs.writeFileSync(path.join(from, 'Sources', 'main.c'), mainsource, { encoding: 'utf8' });
    }
}
exports.run = run;
//# sourceMappingURL=init.js.map