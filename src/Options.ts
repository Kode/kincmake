import {GraphicsApi} from './GraphicsApi';
import {VisualStudioVersion} from './VisualStudioVersion';
import {VrApi} from './VrApi';

export let Options = {
	precompiledHeaders: false,
	intermediateDrive: '',
	graphicsApi: GraphicsApi.Direct3D9,
	vrApi: VrApi.None,
	visualStudioVersion: VisualStudioVersion.VS2013,
	compile: false,
	run: false
};
