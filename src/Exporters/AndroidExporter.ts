import {Exporter} from './Exporter';
import {Project} from '../Project';
import {Architecture} from '../Architecture';
import {Options} from '../Options';
import * as Icon from '../Icon';
import {execSync} from 'child_process';
import * as fs from 'fs-extra';
import * as os from 'os';
import * as path from 'path';

interface TargetOptions {
	package: string;
	installLocation: string;
	versionCode: number;
	versionName: string;
	compileSdkVersion: number;
	minSdkVersion: number;
	targetSdkVersion: number;
	screenOrientation: string;
	permissions: string[];
	disableStickyImmersiveMode: boolean;
	metadata: string[];
	customFilesPath?: string;
	buildGradlePath: string;
	globalBuildGradlePath: string;
	proguardRulesPath: string;
	abiFilters: string[];
}

export class AndroidExporter extends Exporter {
	safeName: string;

	constructor() {
		super();
	}

	async exportSolution(project: Project, from: string, to: string, platform: string, vr: any) {
		this.safeName = project.getSafeName();
		const indir = path.join(__dirname, '..', '..', 'Data', 'android');
		const outdir = path.join(to.toString(), this.safeName);

		const targetOptions: TargetOptions = {
			package: 'tech.kode.kore',
			installLocation: 'internalOnly',
			versionCode: 1,
			versionName: '1.0',
			compileSdkVersion: 29,
			minSdkVersion: 14,
			targetSdkVersion: 29,
			screenOrientation: 'sensor',
			permissions: new Array<string>(),
			disableStickyImmersiveMode: false,
			metadata: new Array<string>(),
			customFilesPath: null,
			buildGradlePath: path.join(indir, 'app', 'build.gradle'),
			globalBuildGradlePath: path.join(indir, 'build.gradle'),
			proguardRulesPath: path.join(indir, 'app', 'proguard-rules.pro'),
			abiFilters: new Array<string>()
		};

		if (project.targetOptions != null && project.targetOptions.android != null) {
			const userOptions = project.targetOptions.android;
			for (let key in userOptions) {
				if (userOptions[key] == null) continue;
				switch (key) {
					case 'customFilesPath':
					case 'buildGradlePath':
					case 'globalBuildGradlePath':
					case 'proguardRulesPath':
						// fix path slashes and normalize
						const p: string = userOptions[key].split('/').join(path.sep);
						(targetOptions as any)[key] = path.join(from, p);
						break;
					default:
						(targetOptions as any)[key] = userOptions[key];
				}
			}
		}

		fs.copySync(path.join(indir, 'gitignore'), path.join(outdir, '.gitignore'));
		fs.copySync(targetOptions.globalBuildGradlePath, path.join(outdir, 'build.gradle'));
		fs.copySync(path.join(indir, 'gradle.properties'), path.join(outdir, 'gradle.properties'));
		fs.copySync(path.join(indir, 'gradlew'), path.join(outdir, 'gradlew'));
		fs.copySync(path.join(indir, 'gradlew.bat'), path.join(outdir, 'gradlew.bat'));
		let settings = fs.readFileSync(path.join(indir, 'settings.gradle'), 'utf8');
		settings = settings.replace(/{name}/g, project.getName());
		fs.writeFileSync(path.join(outdir, 'settings.gradle'), settings);

		fs.copySync(path.join(indir, 'app', 'gitignore'), path.join(outdir, 'app', '.gitignore'));
		fs.copySync(targetOptions.proguardRulesPath, path.join(outdir, 'app', 'proguard-rules.pro'));

		this.writeAppGradle(project, outdir, from, targetOptions);

		this.writeCMakeLists(project, indir, outdir, from, targetOptions);

		fs.ensureDirSync(path.join(outdir, 'app', 'src'));
		// fs.emptyDirSync(path.join(outdir, 'app', 'src'));

		fs.ensureDirSync(path.join(outdir, 'app', 'src', 'main'));

		this.writeManifest(indir, outdir, targetOptions);

		let strings = fs.readFileSync(path.join(indir, 'main', 'res', 'values', 'strings.xml'), 'utf8');
		strings = strings.replace(/{name}/g, project.getName());
		fs.ensureDirSync(path.join(outdir, 'app', 'src', 'main', 'res', 'values'));
		fs.writeFileSync(path.join(outdir, 'app', 'src', 'main', 'res', 'values', 'strings.xml'), strings);

		this.exportIcons(project.icon, outdir, from, to);

		fs.copySync(path.join(indir, 'gradle', 'wrapper', 'gradle-wrapper.jar'), path.join(outdir, 'gradle', 'wrapper', 'gradle-wrapper.jar'));
		fs.copySync(path.join(indir, 'gradle', 'wrapper', 'gradle-wrapper.properties'), path.join(outdir, 'gradle', 'wrapper', 'gradle-wrapper.properties'));

		fs.copySync(path.join(indir, 'idea', 'gitignore'), path.join(outdir, 'idea', '.gitignore'));
		fs.copySync(path.join(indir, 'idea', 'gradle.xml'), path.join(outdir, '.idea', 'gradle.xml'));
		fs.copySync(path.join(indir, 'idea', 'misc.xml'), path.join(outdir, '.idea', 'misc.xml'));
		let modules = fs.readFileSync(path.join(indir, 'idea', 'modules.xml'), 'utf8');
		modules = modules.replace(/{name}/g, project.getName());
		fs.copySync(path.join(indir, 'idea', 'modules.xml'), path.join(outdir, '.idea', 'modules.xml'));
		fs.writeFileSync(path.join(outdir, '.idea', 'modules.xml'), modules);
		fs.ensureDirSync(path.join(outdir, '.idea', 'modules'));
		fs.copySync(path.join(indir, 'idea', 'modules', 'My Application.iml'), path.join(outdir, '.idea', 'modules', project.getName() + '.xml'));

		if (targetOptions.customFilesPath != null) {
			const dir = targetOptions.customFilesPath;
			if (!fs.existsSync(dir)) throw dir + ' folder does not exist';
			fs.copySync(dir, outdir);
		}

		if (project.getDebugDir().length > 0) fs.copySync(path.resolve(from, project.getDebugDir()), path.resolve(to, this.safeName, 'app', 'src', 'main', 'assets'));
	}

	writeAppGradle(project: Project, outdir: string, from: string, targetOptions: TargetOptions) {
		let cflags = '';
		for (let flag of project.cFlags)
			cflags += flag + ' ';
		let cppflags = '';
		for (let flag of project.cppFlags)
			cppflags += flag + ' ';

		let gradle = fs.readFileSync(targetOptions.buildGradlePath, 'utf8');
		gradle = gradle.replace(/{package}/g, targetOptions.package);
		gradle = gradle.replace(/{versionCode}/g, targetOptions.versionCode.toString());
		gradle = gradle.replace(/{versionName}/g, targetOptions.versionName);
		gradle = gradle.replace(/{compileSdkVersion}/g, targetOptions.compileSdkVersion.toString());
		gradle = gradle.replace(/{minSdkVersion}/g, targetOptions.minSdkVersion.toString());
		gradle = gradle.replace(/{targetSdkVersion}/g, targetOptions.targetSdkVersion.toString());
		let arch = '';
		if (targetOptions.abiFilters.length > 0) {
			for (let item of targetOptions.abiFilters) {
				if (arch.length === 0) {
					arch = '"' + item + '"';
				}
				else {
					arch = arch + ', "' + item + '"';
				}
			}
			arch = `ndk { abiFilters ${arch} }`;
		}
		else {
			switch (Options.architecture) {
				case Architecture.Default: arch = ''; break;
				case Architecture.Arm7: arch = 'armeabi-v7a'; break;
				case Architecture.Arm8: arch = 'arm64-v8a'; break;
				case Architecture.X86: arch = 'x86'; break;
				case Architecture.X86_64: arch = 'x86_64'; break;
				default: throw 'Unknown architecture ' + Options.architecture;
			}
			if (Options.architecture !== Architecture.Default) {
				arch = `ndk {abiFilters '${arch}'}`;
			}			
		}
		gradle = gradle.replace(/{architecture}/g, arch);
		gradle = gradle.replace(/{cflags}/g, cflags);

		cppflags = '-frtti -fexceptions ' + cppflags;
		if (project.cpp11) {
			cppflags = '-std=c++11 ' + cppflags;
		}
		gradle = gradle.replace(/{cppflags}/g, cppflags);

		let javasources = '';
		for (let dir of project.getJavaDirs()) {
			javasources += '\'' + path.relative(path.join(outdir, 'app'), path.resolve(from, dir)).replace(/\\/g, '/') + '\', ';
		}
		javasources += '\'' + path.relative(path.join(outdir, 'app'), path.join(Project.koreDir.toString(), 'Backends', 'System', 'Android', 'Java-Sources')).replace(/\\/g, '/') + '\'';
		gradle = gradle.replace(/{javasources}/g, javasources);

		fs.writeFileSync(path.join(outdir, 'app', 'build.gradle'), gradle);
	}

	writeCMakeLists(project: Project, indir: string, outdir: string, from: string, targetOptions: TargetOptions) {
		let cmake = fs.readFileSync(path.join(indir, 'app', 'CMakeLists.txt'), 'utf8');

		let debugDefines = '';
		for (const def of project.getDefines()) {
			if (!def.config || def.config.toLowerCase() === 'debug') {
				debugDefines += ' -D' + def.value;
			}
		}
		cmake = cmake.replace(/{debug_defines}/g, debugDefines);

		let releaseDefines = '';
		for (const def of project.getDefines()) {
			if (!def.config || def.config.toLowerCase() === 'release') {
				releaseDefines += ' -D' + def.value;
			}
		}
		cmake = cmake.replace(/{release_defines}/g, releaseDefines);

		let includes = '';
		for (let inc of project.getIncludeDirs()) {
			includes += '  "' + path.resolve(inc).replace(/\\/g, '/') + '"\n';
		}
		cmake = cmake.replace(/{includes}/g, includes);

		let files = '';
		for (let file of project.getFiles()) {
			if (file.file.endsWith('.c') || file.file.endsWith('.cc')
					|| file.file.endsWith('.cpp') || file.file.endsWith('.h')) {
				if (path.isAbsolute(file.file)) {
					files += '  "' + path.resolve(file.file).replace(/\\/g, '/') + '"\n';
				}
				else {
					files += '  "' + path.resolve(path.join(from, file.file)).replace(/\\/g, '/') + '"\n';
				}
			}
		}
		cmake = cmake.replace(/{files}/g, files);

		let libraries1 = '';
		let libraries2 = '';
		for (let lib of project.getLibs()) {
			libraries1 += 'find_library(' + lib + '-lib ' + lib + ')\n';
			libraries2 += '  ${' + lib + '-lib}\n';
		}
		cmake = cmake.replace(/{libraries1}/g, libraries1)
			.replace(/{libraries2}/g, libraries2);

		const cmakePath = path.join(outdir, 'app', 'CMakeLists.txt');
		if (this.isCmakeSame(cmakePath, cmake)) return;
		fs.writeFileSync(cmakePath, cmake);
	}

	isCmakeSame(cmakePath: string, cmake: string): boolean {
		// prevent overwriting CMakeLists.txt if it has not changed
		if (!fs.existsSync(cmakePath)) return false;
		return fs.readFileSync(cmakePath, 'utf8') === cmake;
	}

	writeManifest(indir: string, outdir: string, targetOptions: TargetOptions) {
		let manifest = fs.readFileSync(path.join(indir, 'main', 'AndroidManifest.xml'), 'utf8');
		manifest = manifest.replace(/{package}/g, targetOptions.package);
		manifest = manifest.replace(/{installLocation}/g, targetOptions.installLocation);
		manifest = manifest.replace(/{versionCode}/g, targetOptions.versionCode.toString());
		manifest = manifest.replace(/{versionName}/g, targetOptions.versionName);
		manifest = manifest.replace(/{screenOrientation}/g, targetOptions.screenOrientation);
		manifest = manifest.replace(/{permissions}/g, targetOptions.permissions.map((p) => { return '\n\t<uses-permission android:name="' + p + '"/>'; }).join(''));
		let metadata = targetOptions.disableStickyImmersiveMode ? '\n\t\t<meta-data android:name="disableStickyImmersiveMode" android:value="true"/>' : '';
		for (const meta of targetOptions.metadata) {
			metadata += '\n\t\t' + meta;
		}
		manifest = manifest.replace(/{metadata}/g, metadata);
		fs.ensureDirSync(path.join(outdir, 'app', 'src', 'main'));
		fs.writeFileSync(path.join(outdir, 'app', 'src', 'main', 'AndroidManifest.xml'), manifest);
	}

	exportIcons(icon: string, outdir: string, from: string, to: string) {
		const folders = ['mipmap-mdpi', 'mipmap-hdpi', 'mipmap-xhdpi', 'mipmap-xxhdpi', 'mipmap-xxxhdpi'];
		const dpis = [48, 72, 96, 144, 192];
		for (let i = 0; i < dpis.length; ++i) {
			const folder = folders[i];
			const dpi = dpis[i];
			fs.ensureDirSync(path.join(outdir, 'app', 'src', 'main', 'res', folder));
			Icon.exportPng(icon, path.resolve(to, this.safeName, 'app', 'src', 'main', 'res', folder, 'ic_launcher.png'), dpi, dpi, undefined, from);
			Icon.exportPng(icon, path.resolve(to, this.safeName, 'app', 'src', 'main', 'res', folder, 'ic_launcher_round.png'), dpi, dpi, undefined, from);
		}
	}
}
