import { chatSubmit as chatSubmitImpl } from './chat';

export namespace aiSDK {
	export const chatSubmit = chatSubmitImpl;
}

export default aiSDK;

Object.assign(global, { aiSDK });

import './aisdk.module.json';
