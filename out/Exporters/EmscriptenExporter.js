"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmscriptenExporter = void 0;
const Exporter_1 = require("./Exporter");
const Options_1 = require("../Options");
const GraphicsApi_1 = require("../GraphicsApi");
const fs = require("fs-extra");
const path = require("path");
class EmscriptenExporter extends Exporter_1.Exporter {
    constructor() {
        super();
    }
    exportMakefile(project, from, to, platform, vrApi, options) {
        const cCompiler = 'emcc';
        const cppCompiler = 'emcc';
        let objects = {};
        let ofiles = {};
        let outputPath = path.resolve(to, options.buildPath);
        fs.ensureDirSync(outputPath);
        let debugDirName = project.getDebugDir();
        debugDirName = debugDirName.replace(/\\/g, '/');
        if (debugDirName.endsWith('/'))
            debugDirName = debugDirName.substr(0, debugDirName.length - 1);
        if (debugDirName.lastIndexOf('/') >= 0)
            debugDirName = debugDirName.substr(debugDirName.lastIndexOf('/') + 1);
        fs.copySync(path.resolve(from, debugDirName), path.resolve(outputPath, debugDirName), { overwrite: true });
        for (let fileobject of project.getFiles()) {
            let file = fileobject.file;
            if (file.endsWith('.cpp') || file.endsWith('.c') || file.endsWith('.cc') || file.endsWith('.s') || file.endsWith('.S')) {
                let name = file.toLowerCase();
                if (name.indexOf('/') >= 0)
                    name = name.substr(name.lastIndexOf('/') + 1);
                name = name.substr(0, name.lastIndexOf('.'));
                if (!objects[name]) {
                    objects[name] = true;
                    ofiles[file] = name;
                }
                else {
                    while (objects[name]) {
                        name = name + '_';
                    }
                    objects[name] = true;
                    ofiles[file] = name;
                }
            }
        }
        let gchfilelist = '';
        let precompiledHeaders = [];
        for (let file of project.getFiles()) {
            if (file.options && file.options.pch && precompiledHeaders.indexOf(file.options.pch) < 0) {
                precompiledHeaders.push(file.options.pch);
            }
        }
        for (let file of project.getFiles()) {
            let precompiledHeader = null;
            for (let header of precompiledHeaders) {
                if (file.file.endsWith(header)) {
                    precompiledHeader = header;
                    break;
                }
            }
            if (precompiledHeader !== null) {
                // let realfile = path.relative(outputPath, path.resolve(from, file.file));
                gchfilelist += path.basename(file.file) + '.gch ';
            }
        }
        let ofilelist = '';
        for (let o in objects) {
            ofilelist += o + '.o ';
        }
        this.writeFile(path.resolve(outputPath, 'makefile'));
        let incline = '-I./ '; // local directory to pick up the precompiled header hxcpp.h.gch
        for (let inc of project.getIncludeDirs()) {
            inc = path.relative(outputPath, path.resolve(from, inc));
            incline += '-I' + inc + ' ';
        }
        this.p('INC=' + incline);
        let libsline = '-static-libgcc -static-libstdc++';
        if (project.targetOptions.html5.threads) {
            libsline += ' -pthread';
        }
        /*if (project.cmd) {
            libsline += ' -static';
        }*/
        for (let lib of project.getLibs()) {
            libsline += ' -l' + lib;
        }
        this.p('LIB=' + libsline);
        let defline = '';
        if (!options.debug) {
            defline += '-DNDEBUG ';
        }
        for (const def of project.getDefines()) {
            if (def.config && def.config.toLowerCase() === 'debug' && !options.debug) {
                continue;
            }
            if (def.config && def.config.toLowerCase() === 'release' && options.debug) {
                continue;
            }
            defline += '-D' + def.value + ' ';
        }
        defline += '-D KORE_DEBUGDIR="\\"' + debugDirName + '\\""' + ' ';
        this.p('DEF=' + defline);
        this.p();
        let cline = '-std=c99 ';
        if (options.dynlib) {
            cline += '-fPIC ';
        }
        for (let flag of project.cFlags) {
            cline += flag + ' ';
        }
        this.p('CFLAGS=' + cline);
        let cppline = '';
        if (options.dynlib) {
            cppline += '-fPIC ';
        }
        for (let flag of project.cppFlags) {
            cppline += flag + ' ';
        }
        this.p('CPPFLAGS=' + cppline);
        let optimization = '';
        if (!options.debug)
            optimization = '-O2';
        else
            optimization = '-g';
        if (options.lib) {
            this.p(project.getSafeName() + '.a: ' + gchfilelist + ofilelist);
        }
        else if (options.dynlib) {
            this.p(project.getSafeName() + '.so: ' + gchfilelist + ofilelist);
        }
        else {
            this.p('index.html' + ': ' + gchfilelist + ofilelist);
        }
        let cpp = '';
        // cpp = '-std=c++11';
        if (project.targetOptions.html5.threads) {
            cpp += ' -pthread';
        }
        let linkerFlags = '-s TOTAL_MEMORY=134217728 ';
        if (Options_1.Options.graphicsApi === GraphicsApi_1.GraphicsApi.WebGPU) {
            linkerFlags += '-s USE_WEBGPU=1 ';
        }
        let output = ' ' + linkerFlags + '-o index.html --preload-file ' + debugDirName;
        if (options.lib) {
            output = '-o "' + project.getSafeName() + '.a"';
        }
        else if (options.dynlib) {
            output = '-shared -o "' + project.getSafeName() + '.so"';
        }
        this.p('\t' + (options.lib ? 'ar rcs' : cppCompiler) + ' ' + output + ' ' + cpp + ' ' + optimization + ' ' + ofilelist + ' $(LIB)');
        for (let file of project.getFiles()) {
            let precompiledHeader = null;
            for (let header of precompiledHeaders) {
                if (file.file.endsWith(header)) {
                    precompiledHeader = header;
                    break;
                }
            }
            if (precompiledHeader !== null) {
                let realfile = path.relative(outputPath, path.resolve(from, file.file));
                this.p(path.basename(realfile) + '.gch: ' + realfile);
                this.p('\t' + cppCompiler + ' ' + cpp + ' ' + optimization + ' $(INC) $(DEF) -c ' + realfile + ' -o ' + path.basename(file.file) + '.gch');
            }
        }
        for (let fileobject of project.getFiles()) {
            let file = fileobject.file;
            if (file.endsWith('.c') || file.endsWith('.cpp') || file.endsWith('.cc') || file.endsWith('.s') || file.endsWith('.S')) {
                this.p();
                let name = ofiles[file];
                let realfile = path.relative(outputPath, path.resolve(from, file));
                this.p(name + '.o: ' + realfile);
                let compiler = cppCompiler;
                let flags = '$(CPPFLAGS)';
                if (file.endsWith('.c')) {
                    compiler = cCompiler;
                    flags = '$(CFLAGS)';
                }
                else if (file.endsWith('.s') || file.endsWith('.S')) {
                    compiler = cCompiler;
                    flags = '';
                }
                this.p('\t' + compiler + ' ' + cpp + ' ' + optimization + ' $(INC) $(DEF) ' + flags + ' -c ' + realfile + ' -o ' + name + '.o');
            }
        }
        // project.getDefines()
        // project.getIncludeDirs()
        this.closeFile();
    }
    async exportSolution(project, from, to, platform, vrApi, options) {
        this.exportMakefile(project, from, to, platform, vrApi, options);
    }
}
exports.EmscriptenExporter = EmscriptenExporter;
//# sourceMappingURL=EmscriptenExporter.js.map