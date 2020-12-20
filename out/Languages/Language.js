"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Language = void 0;
const fs = require("fs-extra");
class Language {
    constructor() {
    }
    writeFile(file) {
        this.out = fs.openSync(file, 'w');
    }
    closeFile() {
        fs.closeSync(this.out);
    }
    p(line = '', indent = 0) {
        let tabs = '';
        for (let i = 0; i < indent; ++i)
            tabs += '\t';
        let data = Buffer.from(tabs + line + '\n');
        fs.writeSync(this.out, data, 0, data.length, null);
    }
    async exportWrapper(tree, from, to, options, filename) {
        return new Promise((resolve, reject) => {
            reject('Called an abstract function');
        });
    }
}
exports.Language = Language;
//# sourceMappingURL=Language.js.map