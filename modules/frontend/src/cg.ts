export namespace CG {
	export function helloWorld() {
		alert("Hello World");
	}
}

export default CG;

Object.assign(global, { CG });

import "./cg.module.json";