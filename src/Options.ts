import {GraphicsApi} from './GraphicsApi';
import {AudioApi} from './AudioApi';
import {VrApi} from './VrApi';
import {RayTraceApi} from './RayTraceApi';
import {VisualStudioVersion} from './VisualStudioVersion';

export let Options = {
	precompiledHeaders: false,
	intermediateDrive: '',
	graphicsApi: GraphicsApi.Default,
	audioApi: AudioApi.Default,
	vrApi: VrApi.None,
	rayTraceApi: RayTraceApi.None,
	visualStudioVersion: VisualStudioVersion.VS2017,
	compile: false,
	run: false
};
