import * as os from 'os';
import * as path from 'path';
import { Options } from './Options';
import { Platform } from './Platform';
import { GraphicsApi } from './GraphicsApi';
import { Architecture } from './Architecture';
import { AudioApi } from './AudioApi';
import { VrApi } from './VrApi';
import { Compiler } from './Compiler';
import { VisualStudioVersion } from './VisualStudioVersion';

let defaultTarget: string;
if (os.platform() === 'linux') {
	defaultTarget = Platform.Linux;
}
else if (os.platform() === 'win32') {
	defaultTarget = Platform.Windows;
}
else if (os.platform() === 'freebsd') {
	defaultTarget = Platform.FreeBSD;
}
else {
	defaultTarget = Platform.OSX;
}

let options = [
	{
		full: 'from',
		value: true,
		description: 'Location of your project',
		default: '.'
	},
	{
		full: 'to',
		value: true,
		description: 'Build location',
		default: 'build'
	},
	{
		full: 'target',
		short: 't',
		value: true,
		description: 'Target platform',
		default: defaultTarget
	},
	{
		full: 'vr',
		value: true,
		description: 'Target VR device',
		default: VrApi.None
	},
	{
		full: 'pch',
		description: 'Use precompiled headers for C++ targets',
		value: false
	},
	{
		full: 'intermediate',
		description: 'Intermediate location for object files.',
		value: true,
		default: '',
		hidden: true
	},
	{
		full: 'graphics',
		short: 'g',
		description: 'Graphics api to use',
		value: true,
		default: GraphicsApi.Default
	},
	{
		full: 'arch',
		description: 'Target architecture for compilation',
		value: true,
		default: Architecture.Default
	},
	{
		full: 'audio',
		short: 'a',
		description: 'Audio api to use',
		value: true,
		default: AudioApi.Default
	},
	{
		full: 'visualstudio',
		short: 'v',
		description: 'Version of Visual Studio to use',
		value: true,
		default: VisualStudioVersion.VS2022
	},
	{
		full: 'compile',
		description: 'Compile executable',
		value: false
	},
	{
		full: 'run',
		description: 'Run executable',
		value: false
	},
	{
		full: 'update',
		description: 'Update Kinc and it\'s submodules',
		value: false
	},
	{
		full: 'debug',
		description: 'Compile in debug mode',
		value: false
	},
	{
		full: 'server',
		description: 'Run local http server for html5 target',
		value: false
	},
	{
		full: 'port',
		description: 'Running port for the server',
		value: true,
		default: 8080
	},
	{
		full: 'noshaders',
		description: 'Do not compile shaders',
		value: false
	},
	{
		full: 'kinc',
		short: 'k',
		description: 'Location of Kinc directory',
		value: true,
		default: ''
	},
	{
		full: 'init',
		description: 'Init a Kinc project inside the current directory',
		value: false
	},
	{
		full: 'name',
		description: 'Project name to use when initializing a project',
		value: true,
		default: 'Project'
	},
	{
		full: 'kincfile',
		value: true,
		description: 'Name of your kincfile, defaults to "kincfile.js"',
		default: 'kincfile.js'
	},
	{
		full: 'compiler',
		value: true,
		description: 'Use a specific compiler',
		default: Compiler.Default
	},
	{
		full: 'onlyshaders',
		value: false,
		description: 'Compile only shaders'
	},
	{
		full: 'nosigning',
		value: false,
		description: 'Disable code signing for iOS'
	},
	{
		full: 'lib',
		value: false,
		description: 'Compile to a static library'
	},
	{
		full: 'dynlib',
		value: false,
		description: 'Compile to a dynamic library'
	},
	{
		full: 'vscode',
		value: false,
		description: 'Create a vscode project - this is used automatically by the vscode Kinc extension'
	},
	{
		full: 'toLanguage',
		value: true,
		description: 'Export IDL specified in kincfile to wrapper for specified language'
	}
];

let parsedOptions: any = {

};

function printHelp() {
	console.log('kincmake options:\n');
	for (let o in options) {
		let option: any = options[o];
		if (option.hidden) continue;
		if (option.short) console.log('-' + option.short + ' ' + '--' + option.full);
		else console.log('--' + option.full);
		console.log(option.description);
		console.log();
	}
}

for (let o in options) {
	let option: any = options[o];
	if (option.value) {
		parsedOptions[option.full] = option.default;
	}
	else {
		parsedOptions[option.full] = false;
	}
}

let args = process.argv;
for (let i = 2; i < args.length; ++i) {
	let arg = args[i];

	if (arg[0] === '-') {
		if (arg[1] === '-') {
			if (arg.substr(2) === 'help') {
				printHelp();
				process.exit(0);
			}
			let found = false;
			for (let o in options) {
				let option: any = options[o];
				if (arg.substr(2) === option.full) {
					found = true;
					if (option.value) {
						++i;
						parsedOptions[option.full] = args[i];
					}
					else {
						parsedOptions[option.full] = true;
					}
				}
			}
			if (!found) throw 'Option ' + arg + ' not found.';
		}
		else {
			if (arg[1] === 'h') {
				printHelp();
				process.exit(0);
			}
			if (arg.length !== 2) throw 'Wrong syntax for option ' + arg + ' (maybe try -' + arg + ' instead).';
			let found = false;
			for (let o in options) {
				let option: any = options[o];
				if (option.short && arg[1] === option.short) {
					found = true;
					if (option.value) {
						++i;
						parsedOptions[option.full] = args[i];
					}
					else {
						parsedOptions[option.full] = true;
					}
				}
			}
			if (!found) throw 'Option ' + arg + ' not found.';
		}
	}
	else {
		parsedOptions.target = arg.toLowerCase();
	}
}

if (parsedOptions.run) {
	parsedOptions.compile = true;
}

async function runKincmake() {
	let logInfo = function (text: string, newline: boolean) {
		if (newline) {
			console.log(text);
		}
		else {
			process.stdout.write(text);
		}
	};

	let logError = function (text: string, newline: boolean) {
		if (newline) {
			console.error(text);
		}
		else {
			process.stderr.write(text);
		}
	};

	await require('./main.js').run(parsedOptions, { info: logInfo, error: logError });
	// console.log('Done.'); // TODO: Clean up async things so we actually end here.
}

if (parsedOptions.init) {
	console.log('Initializing Kinc project.\n');
	require('./init').run(parsedOptions.name, parsedOptions.from, parsedOptions.projectfile);
}
else if (parsedOptions.server) {
	console.log('Running server on ' + parsedOptions.port);
	let nstatic = require('node-static');
	let fileServer = new nstatic.Server(path.join(parsedOptions.from, 'build', parsedOptions.debug ? 'Debug' : 'Release'), { cache: 0 });
	let server = require('http').createServer(function (request: any, response: any) {
		request.addListener('end', function () {
			response.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
			response.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
			fileServer.serve(request, response);
		}).resume();
	});
	server.on('error', function (e: any) {
		if (e.code === 'EADDRINUSE') {
			console.log('Error: Port ' + parsedOptions.port + ' is already in use.');
			console.log('Please close the competing program (maybe another instance of khamake?)');
			console.log('or switch to a different port using the --port argument.');
		}
	});
	server.listen(parsedOptions.port);
}
else if (parsedOptions.update) {
	console.log('Updating everything...');
	require('child_process').spawnSync('git', ['pull', 'origin', 'master'], { stdio: 'inherit', stderr: 'inherit' });
	require('child_process').spawnSync('git', ['submodule', 'update', '--init', '--recursive'], { stdio: 'inherit', stderr: 'inherit' });
}
else {
	runKincmake();
}
