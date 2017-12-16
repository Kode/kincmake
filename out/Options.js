"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const GraphicsApi_1 = require("./GraphicsApi");
const AudioApi_1 = require("./AudioApi");
const VrApi_1 = require("./VrApi");
const VisualStudioVersion_1 = require("./VisualStudioVersion");
exports.Options = {
    precompiledHeaders: false,
    intermediateDrive: '',
    graphicsApi: GraphicsApi_1.GraphicsApi.Default,
    audioApi: AudioApi_1.AudioApi.Default,
    vrApi: VrApi_1.VrApi.None,
    visualStudioVersion: VisualStudioVersion_1.VisualStudioVersion.VS2017,
    compile: false,
    run: false
};
//# sourceMappingURL=Options.js.map