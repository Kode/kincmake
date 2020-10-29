import * as idl from 'webidl2';
import * as fs from 'fs-extra';

export class IDL {
    constructor() {
    }
    static generate(pathToFile: string): idl.IDLRootType[] {
        let webidl = fs.readFileSync(pathToFile).toString();
        return idl.parse(webidl);
    }
}