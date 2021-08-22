import * as child_process from 'child_process';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as log from './log';
import {GraphicsApi} from './GraphicsApi';
import {AudioApi} from './AudioApi';
import {Options} from './Options';
import {Project} from './Project';
import {Platform} from './Platform';
import * as exec from './exec';
import {VisualStudioVersion} from './VisualStudioVersion';
import {Exporter} from './Exporters/Exporter';
import {AndroidExporter} from './Exporters/AndroidExporter';
import {LinuxExporter} from './Exporters/LinuxExporter';
import {EmscriptenExporter} from './Exporters/EmscriptenExporter';
import {TizenExporter} from './Exporters/TizenExporter';
import {VisualStudioExporter} from './Exporters/VisualStudioExporter';
import {XCodeExporter} from './Exporters/XCodeExporter';
import { VSCodeExporter } from './Exporters/VSCodeExporter';
import { Language } from './Languages/Language';
import { Languages } from './Languages';
import * as idl from 'webidl2';
import { BeefLang } from './Languages/BeefLang';
import { FreeBSDExporter } from './Exporters/FreeBSDExporter';

const cpuCores: number = require('physical-cpu-count');

let _global: any = global;
_global.__base = __dirname + '/';

let debug = false;

function fromPlatform(platform: string): string {
	switch (platform.toLowerCase()) {
		case Platform.Windows:
			return 'Windows';
		case Platform.WindowsApp:
			return 'Windows App';
		case Platform.iOS:
			return 'iOS';
		case Platform.OSX:
			return 'macOS';
		case Platform.Android:
			return 'Android';
		case Platform.Linux:
			return 'Linux';
		case Platform.HTML5:
			return 'HTML5';
		case Platform.Tizen:
			return 'Tizen';
		case Platform.Pi:
			return 'Pi';
		case Platform.tvOS:
			return 'tvOS';
		case Platform.PS4:
			return 'PlayStation 4';
		case Platform.XboxOne:
			return 'Xbox One';
		case Platform.Switch:
			return 'Switch';
		case Platform.XboxScarlett:
			return 'Xbox Scarlett';
		case Platform.PS5:
			return 'PlayStation 5';
		case Platform.FreeBSD:
			return 'FreeBSD';
		default:
			throw 'Unknown platform ' + platform + '.';
	}
}

function shaderLang(platform: string): string {
	switch (platform) {
		case Platform.Windows:
			switch (Options.graphicsApi) {
				case GraphicsApi.OpenGL:
					return 'glsl';
				case GraphicsApi.Direct3D9:
					return 'd3d9';
				case GraphicsApi.Direct3D11:
				case GraphicsApi.Default:
					return 'd3d11';
				case GraphicsApi.Direct3D12:
					return 'd3d11';
				case GraphicsApi.Vulkan:
					return 'spirv';
				default:
					throw new Error('Unsupported shader language.');
			}
		case Platform.WindowsApp:
			return 'd3d11';
		case Platform.iOS:
		case Platform.tvOS:
			switch (Options.graphicsApi) {
				case GraphicsApi.Default:
				case GraphicsApi.Metal:
					return 'metal';
				case GraphicsApi.OpenGL:
					return 'essl';
				default:
					throw new Error('Unsupported shader language.');
			}
		case Platform.OSX:
			switch (Options.graphicsApi) {
				case GraphicsApi.Default:
				case GraphicsApi.Metal:
					return 'metal';
				case GraphicsApi.OpenGL:
					return 'glsl';
				default:
					throw new Error('Unsupported shader language.');
			}
		case Platform.Android:
			switch (Options.graphicsApi) {
				case GraphicsApi.Vulkan:
					return 'spirv';
				case GraphicsApi.OpenGL:
				case GraphicsApi.Default:
					return 'essl';
				default:
					throw new Error('Unsupported shader language.');
			}
		case Platform.Linux:
			switch (Options.graphicsApi) {
				case GraphicsApi.Vulkan:
					return 'spirv';
				case GraphicsApi.OpenGL:
				case GraphicsApi.Default:
					return 'glsl';
				default:
					throw new Error('Unsupported shader language.');
			}
		case Platform.HTML5:
			switch (Options.graphicsApi) {
				case GraphicsApi.WebGPU:
					return 'spirv';
				case GraphicsApi.OpenGL:
				case GraphicsApi.Default:
					return 'essl';
				default:
					throw new Error('Unsupported shader language.');
			}
		case Platform.Tizen:
			return 'essl';
		case Platform.Pi:
			return 'essl';
		case Platform.FreeBSD:
			switch (Options.graphicsApi) {
				case GraphicsApi.Vulkan:
					return 'spirv';
				case GraphicsApi.OpenGL:
				case GraphicsApi.Default:
					return 'glsl';
				default:
					throw new Error('Unsupported shader language.');
			}
		default:
			return platform;
	}
}

async function compileShader(projectDir: string, type: string, from: string, to: string, temp: string, platform: string, builddir: string) {
	return new Promise<void>((resolve, reject) => {
		let compilerPath = '';

		if (Project.koreDir !== '') {
			compilerPath = path.resolve(Project.koreDir, 'Tools', 'krafix', 'krafix' + exec.sys());
		}

		if (fs.existsSync(path.join(projectDir, 'Backends'))) {
			let libdirs = fs.readdirSync(path.join(projectDir, 'Backends'));
			for (let ld in libdirs) {
				let libdir = path.join(projectDir, 'Backends', libdirs[ld]);
				if (fs.statSync(libdir).isDirectory()) {
					let exe = path.join(libdir, 'krafix', 'krafix-' + platform + '.exe');
					if (fs.existsSync(exe)) {
						compilerPath = exe;
					}
				}
			}
		}

		if (compilerPath !== '') {
			if (type === 'metal') {
				fs.ensureDirSync(path.join(builddir, 'Sources'));
				let fileinfo = path.parse(from);
				let funcname = fileinfo.name;
				funcname = funcname.replace(/-/g, '_');
				funcname = funcname.replace(/\./g, '_');
				funcname += '_main';

				fs.writeFileSync(to, '>' + funcname, 'utf8');

				to = path.join(builddir, 'Sources', fileinfo.name + '.' + type);
				temp = to + '.temp';
			}

			let krafix_platform = platform;
			if (platform === Platform.HTML5 && Options.graphicsApi === GraphicsApi.WebGPU) {
				krafix_platform += '-webgpu';
			}

			let params = [type, from, to, temp, krafix_platform];
			if (debug) params.push('--debug');
			let compiler = child_process.spawn(compilerPath, params);

			compiler.stdout.on('data', (data: any) => {
				log.info(data.toString());
			});

			let errorLine = '';
			let newErrorLine = true;
			let errorData = false;

			function parseData(data: string) {

			}

			compiler.stderr.on('data', (data: any) => {
				let str: string = data.toString();
				for (let char of str) {
					if (char === '\n') {
						if (errorData) {
							parseData(errorLine.trim());
						}
						else {
							log.error(errorLine.trim());
						}
						errorLine = '';
						newErrorLine = true;
						errorData = false;
					}
					else if (newErrorLine && char === '#') {
						errorData = true;
						newErrorLine = false;
					}
					else {
						errorLine += char;
						newErrorLine = false;
					}
				}
			});

			compiler.on('close', (code: number) => {
				if (code === 0) {
					resolve();
				}
				else {
					// process.exitCode = 1;
					reject('Shader compiler error.');
				}
			});
		}
		else {
			throw 'Could not find shader compiler.';
		}
	});
}

async function exportKoremakeProject(from: string, to: string, platform: string, korefile: string, options: any) {
	log.info('kincfile found.');
	if (options.onlyshaders) {
		log.info('Only compiling shaders.');
	}
	else if (options.toLanguage) {
		log.info('Only exporting language wrappers ' + options.toLanguage + '.');
	}
	else {
		log.info('Creating ' + fromPlatform(platform) + ' project files.');
	}

	Project.root = path.resolve(from);
	let project: Project;
	try {
		project = await Project.create(from, platform, korefile);
		if (shaderLang(platform) === 'metal') {
			project.addFile('build/Sources/*', {});
		}
		project.resolveBackends();
		project.searchFiles(undefined);
		project.flatten();
		if (options.lib) {
			project.addDefine('KINC_NO_MAIN');
		}
		else if (options.dynlib) {
			project.addDefine('KINC_NO_MAIN');
			project.addDefine('KINC_DYNAMIC_COMPILE');
		}
	}
	catch (error) {
		log.error(error);
		throw error;
	}

	fs.ensureDirSync(to);

	let files = project.getFiles();
	if (!options.noshaders) {
		let shaderCount = 0;
		for (let file of files) {
			if (file.file.endsWith('.glsl')) {
				++shaderCount;
			}
		}
		let shaderIndex = 0;
		for (let file of files) {
			if (file.file.endsWith('.glsl')) {
				let outfile = file.file;
				const index = outfile.lastIndexOf('/');
				if (index > 0) outfile = outfile.substr(index);
				outfile = outfile.substr(0, outfile.length - 5);

				let parsedFile = path.parse(file.file);
				log.info('Compiling shader ' + (shaderIndex + 1) + ' of ' + shaderCount + ' (' + parsedFile.name + ').');

				++shaderIndex;
				await compileShader(from, shaderLang(platform), file.file, path.join(project.getDebugDir(), outfile), options.to, platform, options.to);
			}
		}
	}

	if (options.onlyshaders) {
		return project;
	}

	// Run again to find new shader files for Metal
	project.searchFiles(undefined);
	project.flatten();

	let exporter: Exporter = null;
	if (options.vscode) {
		exporter = new VSCodeExporter();
	}
	else if (platform === Platform.iOS || platform === Platform.OSX || platform === Platform.tvOS) exporter = new XCodeExporter();
	else if (platform === Platform.Android) exporter = new AndroidExporter();
	else if (platform === Platform.HTML5) exporter = new EmscriptenExporter();
	else if (platform === Platform.Linux || platform === Platform.Pi) exporter = new LinuxExporter();
	else if (platform === Platform.FreeBSD) exporter = new FreeBSDExporter();
	else if (platform === Platform.Tizen) exporter = new TizenExporter();
	else if (platform === Platform.PS4 || platform === Platform.XboxOne || platform === Platform.Switch || platform === Platform.XboxScarlett || platform === Platform.PS5) {
		let libsdir = path.join(from.toString(), 'Backends');
		if (fs.existsSync(libsdir) && fs.statSync(libsdir).isDirectory()) {
			let libdirs = fs.readdirSync(libsdir);
			for (let libdir of libdirs) {
				if (fs.statSync(path.join(from.toString(), 'Backends', libdir)).isDirectory()
				&& (
					libdir.toLowerCase() === platform.toLowerCase()
					|| libdir.toLowerCase() === fromPlatform(platform).toLowerCase()
					|| libdir.toLowerCase() === fromPlatform(platform).replace(/ /g, '').toLowerCase()
				)) {
					let libfiles = fs.readdirSync(path.join(from.toString(), 'Backends', libdir));
					for (let libfile of libfiles) {
						if (libfile.endsWith('Exporter.js')) {
							let Exporter = require(path.relative(__dirname, path.join(from.toString(), 'Backends', libdir, libfile)));
							exporter = new Exporter();
							break;
						}
					}
				}
			}
		}
	}
	else exporter = new VisualStudioExporter();

	let langExporter: Language = null;
	let trees: idl.IDLRootType[][] = [];
	if (options.toLanguage === Languages.Beef) {
		langExporter = new BeefLang();
		for ( let file of project.IDLfiles) {
			let webidl = fs.readFileSync(file).toString();
			trees.push(idl.parse(webidl));
		}
	}
	if (exporter === null && langExporter === null) {
		throw 'No exporter found for platform ' + platform + '.';
	}

	if (exporter !== null)
		await exporter.exportSolution(project, from, to, platform, options.vrApi, options);
	if (langExporter !== null) {
		trees.forEach((tree, index) => {
			langExporter.exportWrapper(tree, from, to, options, project.IDLfiles[index]);
		});
	}



	return project;
}

function isKoremakeProject(directory: string, korefile: string): boolean {
	return fs.existsSync(path.resolve(directory, korefile));
}

async function exportProject(from: string, to: string, platform: string, korefile: string, options: any): Promise<Project> {
	if (isKoremakeProject(from, korefile)) {
		return exportKoremakeProject(from, to, platform, korefile, options);
	}
	else if (isKoremakeProject(from, 'kincfile.js')) {
		return exportKoremakeProject(from, to, platform, 'kincfile.js', options);
	}
	else if (isKoremakeProject(from, 'korefile.js')) {
		return exportKoremakeProject(from, to, platform, 'korefile.js', options);
	}
	else {
		throw 'kincfile not found.';
	}
}

function compileProject(make: child_process.ChildProcess, project: Project, solutionName: string, options: any, dothemath: boolean): Promise<void> {
	const startDate = new Date();
	return new Promise<void>((resolve, reject) => {
		make.stdout.on('data', function (data: any) {
			log.info(data.toString(), false);
		});

		make.stderr.on('data', function (data: any) {
			log.error(data.toString(), false);
		});

		make.on('close', function (code: number) {
			const time = (new Date().getTime() - startDate.getTime()) / 1000;
			const min = Math.floor(time / 60);
			const sec = Math.floor(time - min * 60);
			log.info(`Build time: ${min}m ${sec}s`);
			if (code === 0) {
				if ((options.customTarget && options.customTarget.baseTarget === Platform.Linux) || options.target === Platform.Linux) {
					if (options.lib) {
						fs.copySync(path.resolve(path.join(options.to.toString(), options.buildPath), solutionName + '.a'), path.resolve(options.from.toString(), project.getDebugDir(), solutionName + '.a'), { overwrite: true });
					}
					else if (options.dynlib) {
						fs.copySync(path.resolve(path.join(options.to.toString(), options.buildPath), solutionName + '.so'), path.resolve(options.from.toString(), project.getDebugDir(), solutionName + '.so'), { overwrite: true });
					}
					else {
						fs.copySync(path.resolve(path.join(options.to.toString(), options.buildPath), solutionName), path.resolve(options.from.toString(), project.getDebugDir(), solutionName), { overwrite: true });
					}
				}
				else if ((options.customTarget && options.customTarget.baseTarget === Platform.Windows) || options.target === Platform.Windows) {
					const extension = (options.lib || options.dynlib) ? (options.lib ? '.lib' : '.dll') : '.exe';
					const from =
					dothemath
					? path.join(options.to.toString(), 'x64', options.debug ? 'Debug' : 'Release', solutionName + extension)
					: path.join(options.to.toString(), options.debug ? 'Debug' : 'Release', solutionName + extension);
					const dir = path.isAbsolute(project.getDebugDir())
						? project.getDebugDir()
						: path.join(options.from.toString(), project.getDebugDir());
					fs.copySync(from, path.join(dir, solutionName + extension), { overwrite: true });
				}
				if (options.run) {
					if ((options.customTarget && options.customTarget.baseTarget === Platform.OSX) || options.target === Platform.OSX) {
						child_process.spawn('build/Release/' + project.name + '.app/Contents/MacOS/' + project.name, {stdio: 'inherit', cwd: options.to});
					}
					else if ((options.customTarget && (options.customTarget.baseTarget === Platform.Linux || options.customTarget.baseTarget === Platform.Windows)) || options.target === Platform.Linux || options.target === Platform.Windows) {
						child_process.spawn(path.resolve(options.from.toString(), project.getDebugDir(), solutionName), [], {stdio: 'inherit', cwd: path.resolve(options.from.toString(), project.getDebugDir())});
					}
					else {
						log.info('--run not yet implemented for this platform');
					}
				}
			}
			else {
				log.error('Compilation failed.');
				process.exit(code);
			}
		});
	});
}

export let api = 2;

function findKincVersion(dir: string): string {
	if (fs.existsSync(path.join(dir, '.git'))) {
		let gitVersion = 'git-error';
		try {
			const output = child_process.spawnSync('git', ['rev-parse', 'HEAD'], {encoding: 'utf8', cwd: dir}).output;
			for (const str of output) {
				if (str != null && str.length > 0) {
					gitVersion = str.substr(0, 8);
					break;
				}
			}
		}
		catch (error) {

		}

		let gitStatus = 'git-error';
		try {
			const output = child_process.spawnSync('git', ['status', '--porcelain'], {encoding: 'utf8', cwd: dir}).output;
			gitStatus = '';
			for (const str of output) {
				if (str != null && str.length > 0) {
					gitStatus = str.trim();
					break;
				}
			}
		}
		catch (error) {

		}

		if (gitStatus) {
			return gitVersion + ', ' + gitStatus.replace(/\n/g, ',');
		}
		else {
			return gitVersion;
		}
	}
	else {
		return 'unversioned';
	}
}

function is64bit() {
	return process.arch === 'x64' || process.env.hasOwnProperty('PROCESSOR_ARCHITEW6432');
}

export async function run(options: any, loglog: any): Promise<string> {
	log.set(loglog);

	if (options.graphics !== undefined) {
		Options.graphicsApi = options.graphics;
	}

	if (options.arch !== undefined) {
		Options.architecture = options.arch;
	}

	if (options.audio !== undefined) {
		Options.audioApi = options.audio;
	}

	if (options.vr !== undefined) {
		Options.vrApi = options.vr;
	}

	if (options.raytrace !== undefined) {
		Options.rayTraceApi = options.raytrace;
	}

	if (options.compiler !== undefined) {
		Options.compiler = options.compiler;
	}

	if (options.visualstudio !== undefined) {
		Options.visualStudioVersion = options.visualstudio;
	}

	if (!options.kinc) {
		let p = path.join(__dirname, '..', '..', '..');
		if (fs.existsSync(p) && fs.statSync(p).isDirectory()) {
			options.kinc = p;
		}
	}
	else {
		options.kinc = path.resolve(options.kinc);
	}
	log.info('Using Kinc (' + findKincVersion(options.kinc) + ') from ' + options.kinc);

	debug = options.debug;

	if (options.vr !== undefined) {
		Options.vrApi = options.vr;
	}
	options.buildPath = options.debug ? 'Debug' : 'Release';

	let project: Project = null;
	try {
		project = await exportProject(options.from, options.to, options.target, options.kincfile, options);
	}
	catch (error) {
		log.error(error);
		return '';
	}
	let solutionName = project.getSafeName();
	if (options.onlyshaders) {
		return solutionName;
	}

	if (options.compile && solutionName !== '') {
		log.info('Compiling...');

		const dothemath = is64bit();
		let make: child_process.ChildProcess = null;

		if ((options.customTarget && options.customTarget.baseTarget === Platform.Linux) || options.target === Platform.Linux || options.target === Platform.FreeBSD) {
			make = child_process.spawn('make', ['-j', cpuCores.toString()], { cwd: path.join(options.to, options.buildPath) });
		}
		else if ((options.customTarget && options.customTarget.baseTarget === Platform.Pi) || options.target === Platform.Pi) {
			make = child_process.spawn('make', [], { cwd: path.join(options.to, options.buildPath) });
		}
		else if ((options.customTarget && options.customTarget.baseTarget === Platform.HTML5) || options.target === Platform.HTML5) {
			make = child_process.spawn('make', [], { cwd: path.join(options.to, options.buildPath) });
		}
		else if ((options.customTarget && (options.customTarget.baseTarget === Platform.OSX || options.customTarget.baseTarget === Platform.iOS)) || options.target === Platform.OSX || options.target === Platform.iOS) {
			let xcodeOptions = ['-configuration', options.debug ? 'Debug' : 'Release', '-project', solutionName + '.xcodeproj'];
			if (options.nosigning) {
				xcodeOptions.push('CODE_SIGN_IDENTITY=""');
				xcodeOptions.push('CODE_SIGNING_REQUIRED=NO');
				xcodeOptions.push('CODE_SIGNING_ALLOWED=NO');
			}
			make = child_process.spawn('xcodebuild', xcodeOptions, { cwd: options.to });
		}
		else if ((options.customTarget && options.customTarget.baseTarget === Platform.Windows) || options.target === Platform.Windows
			|| (options.customTarget && options.customTarget.baseTarget === Platform.WindowsApp) || options.target === Platform.WindowsApp) {
			let vsvars: string = null;
			const bits = dothemath ? '64' : '32';
			switch (options.visualstudio) {
				case VisualStudioVersion.VS2010:
					if (process.env.VS100COMNTOOLS) {
						vsvars = process.env.VS100COMNTOOLS + '\\vsvars' + bits + '.bat';
					}
					break;
				case VisualStudioVersion.VS2012:
					if (process.env.VS110COMNTOOLS) {
						vsvars = process.env.VS110COMNTOOLS + '\\vsvars' + bits + '.bat';
					}
					break;
				case VisualStudioVersion.VS2013:
					if (process.env.VS120COMNTOOLS) {
						vsvars = process.env.VS120COMNTOOLS + '\\vsvars' + bits + '.bat';
					}
					break;
				case VisualStudioVersion.VS2015:
					if (process.env.VS140COMNTOOLS) {
						vsvars = process.env.VS140COMNTOOLS + '\\vsvars' + bits + '.bat';
					}
					break;
				default:
					const vspath = child_process.execFileSync(path.join(__dirname, '..', 'Data', 'windows', 'vswhere.exe'), ['-latest', '-property', 'installationPath'], {encoding: 'utf8'});
					const varspath = path.join(vspath.trim(), 'VC', 'Auxiliary', 'Build', 'vcvars' + bits + '.bat');
					if (fs.existsSync(varspath)) {
						vsvars = varspath;
					}
					break;
			}
			if (vsvars !== null) {
				const signing = ((options.customTarget && options.customTarget.baseTarget === Platform.WindowsApp) || options.target === Platform.WindowsApp) ? '/p:AppxPackageSigningEnabled=false' : '';
				fs.writeFileSync(path.join(options.to, 'build.bat'), '@call "' + vsvars + '"\n' + '@MSBuild.exe "' + path.resolve(options.to, solutionName + '.vcxproj') + '" /m /clp:ErrorsOnly ' + signing + ' /p:Configuration=' + (options.debug ? 'Debug' : 'Release') + ',Platform=' + (dothemath ? 'x64' : 'win32'));
				make = child_process.spawn('build.bat', [], {cwd: options.to});
			}
			else {
				log.error('Visual Studio not found.');
			}
		}
		else if ((options.customTarget && options.customTarget.baseTarget === Platform.Android) || options.target === Platform.Android) {
			let gradlew = (process.platform === 'win32') ? 'gradlew.bat' : 'bash';
			let args = (process.platform === 'win32') ? [] : ['gradlew'];
			args.push('assemble' + (options.debug ? 'Debug' : 'Release'));
			make = child_process.spawn(gradlew, args, { cwd: path.join(options.to, solutionName) });
		}

		if (make !== null) {
			await compileProject(make, project, solutionName, options, dothemath);
			return solutionName;
		}
		else {
			log.info('--compile not yet implemented for this platform');
			process.exit(1);
		}
	}
	return solutionName;
}
