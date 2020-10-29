import * as idl from 'webidl2';
import {Language} from './Language';

export class BeefLang extends Language {
	constructor() {
		super();
	}
	async exportWrapper(tree: idl.IDLRootType[], from: string, to: string, options: any): Promise<void> {
		for (let type of tree) {

		}
	}
}