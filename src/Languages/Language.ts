import * as fs from 'fs-extra';
import * as path from 'path';
import * as idl from 'webidl2';

export abstract class Language {
	out: number;

	constructor() {

	}

	writeFile(file: string) {
		this.out = fs.openSync(file, 'w');
	}

	closeFile() {
		fs.closeSync(this.out);
	}

	p(line: string = '', indent: number = 0) {
		let tabs = '';
		for (let i = 0; i < indent; ++i) tabs += '\t';
		let data = Buffer.from(tabs + line + '\n');
		fs.writeSync(this.out, data, 0, data.length, null);
	}
	
	async exportWrapper(tree: idl.IDLRootType[], from: string, to: string, options: any, filename: string): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			reject('Called an abstract function');
		});
	}
	
	abstract toLangType(idlType: string): string;
}