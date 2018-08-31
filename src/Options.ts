import {GraphicsApi} from './GraphicsApi';
import {AudioApi} from './AudioApi';
import {VrApi} from './VrApi';
import {RayTraceApi} from './RayTraceApi';
import {VisualStudioVersion} from './VisualStudioVersion';
import {Compiler} from './Compiler';

export let Options = {
	precompiledHeaders: false,
	intermediateDrive: '',
	graphicsApi: GraphicsApi.Default,
	audioApi: AudioApi.Default,
	vrApi: VrApi.None,
	rayTraceApi: RayTraceApi.None,
	compiler: Compiler.Default,
	visualStudioVersion: VisualStudioVersion.VS2017,
	compile: false,
	run: false
};
