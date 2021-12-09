import { GraphicsApi } from './GraphicsApi';
import { Architecture } from './Architecture';
import { AudioApi } from './AudioApi';
import { VrApi } from './VrApi';
import { VisualStudioVersion } from './VisualStudioVersion';
import { Compiler } from './Compiler';

export let Options = {
	precompiledHeaders: false,
	intermediateDrive: '',
	graphicsApi: GraphicsApi.Default,
	architecture: Architecture.Default,
	audioApi: AudioApi.Default,
	vrApi: VrApi.None,
	compiler: Compiler.Default,
	visualStudioVersion: VisualStudioVersion.VS2022,
	compile: false,
	run: false
};
