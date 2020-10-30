import * as idl from 'webidl2';
import {Language} from './Language';

export class BeefLang extends Language {
	constructor() {
		super();
	}
	async exportWrapper(tree: idl.IDLRootType[], from: string, to: string, options: any): Promise<void> {
		for (let node of tree) {
			let type = node.type.toString();
			switch (type) {
				case 'enum':
					for (let attr of node.extAttrs) {
						
					}
			}
			if (type === 'eof') {
				break;
			}
		}
	}
}