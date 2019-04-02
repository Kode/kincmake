"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const GraphicsApi_1 = require("./GraphicsApi");
const Architecture_1 = require("./Architecture");
const AudioApi_1 = require("./AudioApi");
const VrApi_1 = require("./VrApi");
const RayTraceApi_1 = require("./RayTraceApi");
const VisualStudioVersion_1 = require("./VisualStudioVersion");
const Compiler_1 = require("./Compiler");
exports.Options = {
    precompiledHeaders: false,
    intermediateDrive: '',
    graphicsApi: GraphicsApi_1.GraphicsApi.Default,
    architecture: Architecture_1.Architecture.Default,
    audioApi: AudioApi_1.AudioApi.Default,
    vrApi: VrApi_1.VrApi.None,
    rayTraceApi: RayTraceApi_1.RayTraceApi.None,
    compiler: Compiler_1.Compiler.Default,
    visualStudioVersion: VisualStudioVersion_1.VisualStudioVersion.VS2019,
    compile: false,
    run: false
};
//# sourceMappingURL=Options.js.map