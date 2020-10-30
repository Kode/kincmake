"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BeefLang = void 0;
const Language_1 = require("./Language");
const path = require("path");
class BeefLang extends Language_1.Language {
    constructor() {
        super();
    }
    async exportWrapper(tree, from, to, options, filename) {
        let p = filename.split('/');
        filename = p[p.length - 1].replace('.idl', '.bf');
        console.log(filename);
        this.writeFile(path.resolve(to, filename));
        this.p('using System;');
        this.p('using System.Interop;');
        this.p('using System.FFI;');
        this.p('\n');
        this.p('namespace ' + filename.replace('.bf', '') + '_beef\n{');
        let indent = 1;
        for (let node of tree) {
            let type = node.type.toString();
            switch (type) {
                case 'enum':
                    let n = node;
                    this.p('public enum ' + n.name + ' : int32 {', indent);
                    indent = 2;
                    for (let val of n.values) {
                        this.p(val.value + ',', indent);
                    }
                    indent = 1;
                    this.p('}', indent);
                    break;
                case 'interface':
                    let struct = node;
                    let ext = struct.inheritance !== null ? ' : ' + struct.inheritance : '';
                    let structType = 'struct';
                    for (let mem of struct.members) {
                        if (mem.type === 'operation') {
                            let opr = mem;
                            if (opr.name === struct.name) {
                                structType = 'class';
                                break;
                            }
                        }
                    }
                    if (structType === 'struct')
                        this.p('[CRepr]', indent);
                    this.p(structType + ' ' + struct.name + ext + '\n	{', indent);
                    indent = 2;
                    for (let member of struct.members) {
                        if (member.type === 'attribute') {
                            let attr = member;
                            let isRef = '';
                            for (let extr of attr.extAttrs) {
                                if (extr.name === 'Ref') {
                                    isRef = '*';
                                    continue;
                                }
                            }
                            let type = this.toLangType(attr.idlType.idlType.toString()) + isRef;
                            let first = structType === 'struct' ? '' : 'public static extern ';
                            this.p(first + type + ' ' + attr.name + ';', indent);
                        }
                        else if (member.type === 'operation') {
                            let opr = member;
                            // Can we even interop operator overloads ?
                            // for (let extAtr of opr.extAttrs) {
                            // 	let op = extAtr.rhs !== null ? extAtr.rhs.value : '';  
                            // 	console.log(extAtr.name+''+op);
                            // }
                            let line = 'public static extern ' + this.toLangType(opr.idlType.idlType.toString()) + ' ' + opr.name + '(';
                            for (let arg of opr.arguments) {
                                let isRef = '';
                                for (let attr of arg.extAttrs) {
                                    if (attr.name === 'Ref') {
                                        isRef = '*';
                                        continue;
                                    }
                                    line += ' ' + attr.name.toLowerCase();
                                }
                                line += ' ' + this.toLangType(arg.idlType.idlType.toString()) + isRef + ' ' + arg.name + ', ';
                            }
                            if (opr.arguments.length > 0)
                                line = line.slice(0, -1).slice(0, -1);
                            line += ');';
                            this.p(line, indent);
                        }
                    }
                    indent = 1;
                    this.p('}', indent);
            }
            if (type === 'eof') {
                break;
            }
        }
        this.p('}');
    }
    toLangType(idlType) {
        switch (idlType) {
            case 'boolean':
                return 'bool';
            case 'byte':
                return 'char';
            case 'DOMString':
                return 'char8*';
            case 'octet':
                return 'uint8';
            case 'VoidPtr' || 'any':
                return 'void*';
            case 'long' || 'int':
                return 'c_long';
            case 'unsigned short':
                return 'c_ushort';
            case 'unsigned long':
                return 'c_ulong';
            case 'long long':
                return 'c_longlong';
            case 'void' || 'double' || 'float':
                return idlType;
            default:
                return idlType;
        }
        return '';
    }
}
exports.BeefLang = BeefLang;
//# sourceMappingURL=BeefLang.js.map