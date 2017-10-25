"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs-extra");
const path = require("path");
class Exporter {
    constructor() {
    }
    writeFile(file) {
        this.out = fs.openSync(file, 'w');
    }
    closeFile() {
        fs.closeSync(this.out);
    }
    p(line = '', indent = 0) {
        let tabs = '';
        for (let i = 0; i < indent; ++i)
            tabs += '\t';
        let data = new Buffer(tabs + line + '\n');
        fs.writeSync(this.out, data, 0, data.length, null);
    }
    nicePath(from, to, filepath) {
        let absolute = filepath;
        if (!path.isAbsolute(absolute)) {
            absolute = path.resolve(from, filepath);
        }
        return path.relative(to, absolute);
    }
    exportCLion(project, from, to, platform, vrApi, options) {
        let name = project.getName().replace(/ /g, '_');
        const indir = path.join(__dirname, '..', '..', 'Data', 'linux');
        fs.ensureDirSync(path.resolve(to, project.getName(), '.idea'));
        let misc = fs.readFileSync(path.join(indir, 'idea', 'misc.xml'), 'utf8');
        misc = misc.replace(/{root}/g, path.resolve(from));
        fs.writeFileSync(path.join(to, project.getName(), '.idea', 'misc.xml'), misc, 'utf8');
        let workspace = fs.readFileSync(path.join(indir, 'idea', 'workspace.xml'), 'utf8');
        workspace = workspace.replace(/{workingdir}/g, path.resolve(project.getDebugDir()));
        workspace = workspace.replace(/{project}/g, project.getName());
        workspace = workspace.replace(/{target}/g, name);
        fs.writeFileSync(path.join(to, project.getName(), '.idea', 'workspace.xml'), workspace, 'utf8');
        this.writeFile(path.resolve(to, project.getName(), 'CMakeLists.txt'));
        this.p('cmake_minimum_required(VERSION 3.6)');
        this.p('project(' + name + ')');
        if (project.cpp11) {
            this.p('set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -std=c++11 -pthread -static-libgcc -static-libstdc++")');
        }
        else {
            this.p('set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -pthread -static-libgcc -static-libstdc++")');
        }
        let defines = '';
        for (let def of project.getDefines()) {
            defines += '  -D' + def + '\n';
        }
        this.p('add_definitions(\n' + defines + ')');
        let includes = '';
        for (let inc of project.getIncludeDirs()) {
            includes += '  "' + path.resolve(inc).replace(/\\/g, '/') + '"\n';
        }
        this.p('include_directories(\n' + includes + ')');
        let files = '';
        for (let file of project.getFiles()) {
            if (file.file.endsWith('.c') || file.file.endsWith('.cc') || file.file.endsWith('.cpp') || file.file.endsWith('.h')) {
                files += '  "' + path.resolve(file.file).replace(/\\/g, '/') + '"\n';
            }
        }
        this.p('set(SOURCE_FILES\n' + files + ')');
        this.p('add_executable(' + name + ' ${SOURCE_FILES})');
        let libraries = '';
        for (let lib of project.getLibs()) {
            libraries += '  ' + lib + '\n';
        }
        this.p('target_link_libraries(' + name + '\n' + libraries + ')');
        this.closeFile();
    }
}
exports.Exporter = Exporter;
//# sourceMappingURL=Exporter.js.map